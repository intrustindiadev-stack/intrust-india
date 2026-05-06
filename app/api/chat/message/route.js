import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { maskPII } from '@/lib/piiFilter';
import { buildUserContext, formatContextForPrompt } from '@/lib/chat/buildContext';
import { buildSystemInstruction } from '@/lib/chat/promptTemplates';

/**
 * POST /api/chat/message
 *
 * Web chatbot backend — powered by Gemini AI (@google/genai SDK).
 * Supports multi-turn conversation via a `history` array sent by the client.
 *
 * Request body:
 *   {
 *     message: string,          // max 1000 chars
 *     history?: Array<{         // last N turns (client sends up to 8)
 *       role: 'user' | 'model',
 *       text: string
 *     }>
 *   }
 *
 * Response:
 *   { reply: string, firstName: string }
 *
 * Note: The WhatsApp webhook (/api/webhooks/omniflow) is a separate pipeline
 * and is NOT modified by this route.
 */

// Hard cap on history turns accepted from the client (prevents prompt-injection bloat)
const MAX_HISTORY_TURNS = 8;

// Module-level flag so we log the missing-table warning once, not on every request
let _logTableMissingOnce = false;

// Lazily initialized Gemini client (one instance per worker lifetime)
let _genAI = null;
function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _genAI;
}

export async function POST(req) {
  try {
    // ── 1. Auth check ────────────────────────────────────────────────────────
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Parse & validate request body ────────────────────────────────────
    const body = await req.json();
    const providedSessionId = body?.sessionId || null;

    const userMessage = (body?.message || '').trim().substring(0, 1000);
    if (!userMessage) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    // Validate and trim history (client sends last N turns)
    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const history = rawHistory
      .filter(
        (h) =>
          h &&
          typeof h.text === 'string' &&
          (h.role === 'user' || h.role === 'model')
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((h) => ({
        role: h.role,
        parts: [{ text: String(h.text).substring(0, 800) }],
      }));

    // ── 2.5 Session Upsert ───────────────────────────────────────────────────
    let activeSessionId = providedSessionId;
    const admin = createAdminClient();
    try {
      if (activeSessionId) {
        const { data: existingSession } = await admin
          .from('webchat_sessions')
          .select('id')
          .eq('id', activeSessionId)
          .eq('user_id', user.id)
          .single();
        if (!existingSession) {
          activeSessionId = null;
        } else {
          await admin
            .from('webchat_sessions')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', activeSessionId);
        }
      }
      
      if (!activeSessionId) {
        const { data: newSession, error: sessionErr } = await admin
          .from('webchat_sessions')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        if (sessionErr) throw sessionErr;
        activeSessionId = newSession.id;

        // One-time notification: chatbot is now connected
        if (!providedSessionId) {
          try {
            await admin.from('notifications').insert({
              user_id: user.id,
              title: 'Chatbot Connected 🤖',
              body: 'Your AI assistant is ready. Ask anything about your account, orders, or rewards.',
              type: 'success',
              reference_type: 'chatbot_connected',
            });
          } catch {
            // Non-fatal — never block the chat response
          }
        }
      }
    } catch (sessionErr) {
      console.warn('[chat/message] Failed to upsert session:', sessionErr.message || sessionErr);
    }

    // ── 3. Gemini API key check ──────────────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      console.error(
        '[chat/message] GEMINI_API_KEY is not set in environment variables. ' +
        'Set it in .env.local to enable web chat. See .env.example for details.'
      );
      const devDetail =
        process.env.NODE_ENV !== 'production'
          ? ' (GEMINI_API_KEY is missing — check .env.local)'
          : '';
      return NextResponse.json({
        reply: `I'm having trouble reaching my brain right now. Please try again in a moment.${devDetail}`,
        firstName: 'there',
      });
    }

    // ── 4. Build rich account context ────────────────────────────────────────
    let userCtx = null;
    let firstName = 'there';

    try {
      userCtx = await buildUserContext(admin, user.id);
      firstName = userCtx.firstName;
    } catch (ctxErr) {
      // Non-fatal — Gemini can still answer knowledge base questions
      console.warn('[chat/message] Failed to build user context:', ctxErr.message || ctxErr);
    }

    const contextBlock = userCtx ? formatContextForPrompt(userCtx) : '';

    // ── 5. Build system instruction ──────────────────────────────────────────
    const systemInstruction = buildSystemInstruction(contextBlock);

    // ── 6. Gemini multi-turn chat call ───────────────────────────────────────
    let finalReply;

    try {
      const genAI = getGenAI();
      const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

      const chat = genAI.chats.create({
        model,
        config: {
          systemInstruction,
          temperature: 0.4,
          maxOutputTokens: 400,
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
        history,
      });

      const response = await chat.sendMessage({ message: userMessage });
      const rawText = response.text?.trim() || '';

      if (!rawText) {
        throw new Error('Gemini returned an empty response.');
      }

      // ── 7. In-place PII masking (does not wipe entire reply) ──────────────
      finalReply = maskPII(rawText);

      // ── 7.5 Store messages in webchat_messages ─────────────────────────────
      try {
        if (activeSessionId) {
          await admin.from('webchat_messages').insert([
            { session_id: activeSessionId, user_id: user.id, role: 'user', content: userMessage },
            { session_id: activeSessionId, user_id: user.id, role: 'model', content: finalReply }
          ]);
        }
      } catch (msgLogErr) {
        console.warn('[chat/message] Failed to store messages in webchat_messages:', msgLogErr.message || msgLogErr);
      }

    } catch (aiErr) {
      console.error('[chat/message] Gemini call failed:', aiErr.message || aiErr);

      if (process.env.NODE_ENV !== 'production') {
        finalReply = `I had trouble reaching my brain just now — please try again in a moment. (Debug: ${aiErr.message})`;
      } else {
        finalReply = "I had trouble reaching my brain just now — please try again in a moment.";
      }
    }

    // ── 8. Best-effort message logging ──────────────────────────────────────
    const phoneHash = crypto.createHash('sha256').update(user.id).digest('hex');

    try {
      await admin.from('whatsapp_message_logs').insert({
        user_id: user.id,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'text',
        channel: 'web',
        status: 'delivered',
        content_preview: finalReply.substring(0, 100),
      });
    } catch (logErr) {
      if (!_logTableMissingOnce) {
        _logTableMissingOnce = true;
        console.warn(
          '[chat/message] Could not log to whatsapp_message_logs (table may not exist in dev):', 
          logErr.message || logErr
        );
      }
    }

    // ── 9. Return response ───────────────────────────────────────────────────
    return NextResponse.json({ reply: finalReply, firstName, sessionId: activeSessionId });

  } catch (err) {
    console.error('[chat/message] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
