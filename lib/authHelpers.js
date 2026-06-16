import { NextResponse } from 'next/server';

/**
 * Returns a standardized error response object that avoids leaking internal details.
 * @param {string} publicMessage - The message shown to the client.
 * @param {string} internalDetail - Hidden detail for server logs.
 * @param {string} publicCode - Optional code for the client to handle programmatically.
 * @param {number} status - HTTP status code (default 400).
 * @returns {Object} { clientBody, status }
 */
export function authError(publicMessage, internalDetail, publicCode = 'UNKNOWN_ERROR', status = 400, extra = {}) {
  if (internalDetail) {
    console.error(`[AuthError] ${internalDetail}`);
  }
  return NextResponse.json(
    { success: false, error: publicMessage, code: publicCode, ...extra },
    { status }
  );
}

/**
 * Logs an authentication event to the audit_logs table.
 * @param {Object} params
 * @param {Object} params.supabaseAdmin - Supabase admin client
 * @param {string} params.action - The audit_action enum value
 * @param {string} [params.actorId] - The user ID if known
 * @param {string} [params.ip] - The client IP address
 * @param {string} [params.userAgent] - The client user agent
 * @param {Object} [params.metadata] - Additional metadata (e.g. masked phone, outcome)
 */
export async function logAuthEvent({ supabaseAdmin, action, actorId = null, ip = null, userAgent = null, metadata = {} }) {
  try {
    const finalMetadata = { ...metadata };
    if (userAgent) {
      finalMetadata.user_agent = userAgent;
    }

    const { error } = await supabaseAdmin.from('audit_logs').insert({
      action,
      actor_id: actorId,
      entity_type: 'auth',
      description: `Authentication event: ${action}`,
      ip_address: ip,
      metadata: finalMetadata
    });

    if (error) {
      console.error('[logAuthEvent] Supabase insert error:', error.message, error.details);
    }
  } catch (error) {
    // Non-fatal, just swallow it to avoid breaking the auth flow
    console.error('[logAuthEvent] Failed to log auth event:', error);
  }
}

/**
 * Executes a function with exponential backoff retries.
 * @param {Function} fn - The async function to retry.
 * @param {number} maxRetries - Maximum retry attempts.
 * @param {number} delay - Initial delay in milliseconds.
 * @returns {Promise<any>}
 */
export async function retryWithBackoff(fn, maxRetries = 3, delay = 200) {
  let attempt = 0;
  while (true) {
    try {
      const result = await fn();
      if (result && result.error) {
        throw result.error;
      }
      return result;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.warn(`[Retry] Attempt ${attempt} failed: ${error.message || error}. Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

