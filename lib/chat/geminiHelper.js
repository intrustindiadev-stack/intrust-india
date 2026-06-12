import { GoogleGenAI } from '@google/genai';

let _genAI = null;

/**
 * Returns the lazily initialized GoogleGenAI instance.
 */
export function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _genAI;
}

/**
 * Helper to identify if an error is a transient timeout/abort or a server error (5xx).
 */
function isTransientError(error) {
  const name = error?.name || '';
  const message = error?.message || '';
  const status = error?.status || error?.statusCode || 0;

  const isAbort = name === 'AbortError' || message.includes('aborted') || message.includes('AbortError');
  const is5xx = (status >= 500 && status < 600) ||
                message.includes('500') ||
                message.includes('502') ||
                message.includes('503') ||
                message.includes('504') ||
                message.toLowerCase().includes('service unavailable') ||
                message.toLowerCase().includes('internal server error') ||
                message.toLowerCase().includes('bad gateway') ||
                message.toLowerCase().includes('gateway timeout');

  return isAbort || is5xx;
}

/**
 * Sends a message using a shared configuration configuration.
 * Includes a 20-second timeout, disables thinking/reasoning latency,
 * and retries once on transient errors (abort / 5xx).
 */
export async function sendGeminiMessage({ systemInstruction, history, message }) {
  const genAI = getGenAI();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = process.env.GEMINI_TIMEOUT_MS ? parseInt(process.env.GEMINI_TIMEOUT_MS, 10) : 20000;
  const thinkingBudget = process.env.GEMINI_THINKING_BUDGET
    ? parseInt(process.env.GEMINI_THINKING_BUDGET, 10)
    : -1;

  const chat = genAI.chats.create({
    model,
    config: {
      systemInstruction,
      temperature: 0.4,
      maxOutputTokens: 768,
      thinkingConfig: {
        thinkingBudget,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    },
    history,
  });

  const performSend = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await chat.sendMessage({
        message,
        config: { abortSignal: controller.signal }
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await performSend();
  } catch (error) {
    if (isTransientError(error)) {
      console.warn(`[geminiHelper] Transient error encountered ("${error.message}"). Retrying once...`);
      try {
        return await performSend();
      } catch (retryError) {
        console.error(`[geminiHelper] Retry failed:`, retryError.message || retryError);
        throw retryError;
      }
    }
    throw error;
  }
}
