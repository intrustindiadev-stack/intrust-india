import 'server-only';
import { maskEmail } from './sendEmail.js';

/**
 * lib/email/dispatch.js
 *
 * Asynchronous, non-blocking email dispatch utility for InTrust India.
 * Ensures email dispatch NEVER delays or crashes primary API routes or business logic.
 * Swallows errors and logs sanitized diagnostic information.
 */

/**
 * Fire an email action asynchronously in a detached microtask without blocking the caller.
 * The calling API handler returns immediately. Any rejection is caught and logged non-fatally.
 *
 * @param {() => Promise<unknown>} fn - Async function that performs the email dispatch
 * @param {object} [context]
 * @param {string} [context.category='transactional'] - Diagnostic category for tracking
 * @param {string|number} [context.entityId] - Optional reference UUID or ID for logging
 * @returns {void}
 */
export function fireAndForgetEmail(fn, { category = 'transactional', entityId = null } = {}) {
    if (typeof fn !== 'function') {
        console.warn(`[EmailDispatch:${category}] fireAndForgetEmail called with non-function:`, typeof fn);
        return;
    }

    // Schedule on microtask queue without blocking current execution turn
    Promise.resolve()
        .then(() => fn())
        .then((result) => {
            const messageId = result?.messageId || 'ok';
            const recipientInfo = Array.isArray(result?.recipients)
                ? result.recipients.map(maskEmail).join(', ')
                : (result?.to ? maskEmail(String(result.to)) : 'delivered');

            console.log(`[EmailDispatch:${category}] Dispatched successfully`, {
                category,
                entityId,
                messageId,
                recipients: recipientInfo,
            });
        })
        .catch((error) => {
            console.error(`[EmailDispatch:${category}] Non-fatal dispatch error:`, {
                category,
                entityId,
                errorCode: error?.code || 'ERR_EMAIL_DISPATCH',
                message: error?.message || String(error),
            });
        });
}

/**
 * Safe email execution wrapper. Invokes the provided async function and catches any error,
 * returning a normalized safe result object without throwing to caller.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} [ctx]
 * @returns {Promise<{ success: boolean, data?: T, error?: string }>}
 */
export async function safeEmail(fn, ctx = {}) {
    if (typeof fn !== 'function') {
        return { success: false, error: 'fn must be a function' };
    }

    try {
        const data = await fn();
        return { success: true, data };
    } catch (err) {
        const message = err?.message || String(err);
        console.error(`[EmailDispatch:safeEmail] Caught error:`, {
            context: ctx,
            error: message,
        });
        return { success: false, error: message };
    }
}
