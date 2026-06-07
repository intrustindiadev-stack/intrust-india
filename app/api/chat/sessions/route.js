import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

/**
 * GET /api/chat/sessions
 *
 * Returns the authenticated user's past customer conversations,
 * ordered by last_active_at desc. Only includes sessions with ≥1 message.
 *
 * Query params:
 *   limit  — number of sessions to return (default 30, max 50)
 *
 * Response:
 *   { sessions: Array<{ id, created_at, last_active_at, preview, messageCount }> }
 */
export async function GET(req) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit')) || 30, 50);

    const admin = createAdminClient();

    // Step 1: Fetch recent customer sessions for this user
    const { data: sessions, error: sessErr } = await admin
      .from('webchat_sessions')
      .select('id, created_at, last_active_at')
      .eq('user_id', user.id)
      .eq('audience', 'customer')
      .order('last_active_at', { ascending: false })
      .limit(limit);

    if (sessErr) {
      throw sessErr;
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [] });
    }

    const sessionIds = sessions.map((s) => s.id);

    // Step 2: Batch-fetch all messages for these sessions to compute counts and previews
    // We fetch id, session_id, role, content, created_at — ordered by created_at asc
    // so the first 'user' message per session is the earliest one.
    const { data: allMessages, error: msgErr } = await admin
      .from('webchat_messages')
      .select('session_id, role, content, created_at')
      .in('session_id', sessionIds)
      .eq('audience', 'customer')
      .order('created_at', { ascending: true });

    if (msgErr) {
      throw msgErr;
    }

    // Step 3: Aggregate counts and find first user message per session
    const countMap = {};    // session_id -> message count
    const previewMap = {};  // session_id -> first user message preview

    for (const msg of allMessages || []) {
      const sid = msg.session_id;
      countMap[sid] = (countMap[sid] || 0) + 1;
      if (msg.role === 'user' && !previewMap[sid]) {
        previewMap[sid] = (msg.content || '').substring(0, 80);
      }
    }

    // Step 4: Build response — filter out sessions with 0 messages
    const result = sessions
      .filter((s) => (countMap[s.id] || 0) > 0)
      .map((s) => ({
        id: s.id,
        created_at: s.created_at,
        last_active_at: s.last_active_at,
        preview: previewMap[s.id] || '',
        messageCount: countMap[s.id] || 0,
      }));

    return NextResponse.json({ sessions: result });

  } catch (err) {
    console.error('[chat/sessions] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
