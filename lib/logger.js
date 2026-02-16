// lib/logger.js
// Request logger for production debugging

export function createRequestLogger(context) {
    const requestId = Math.random().toString(36).slice(2, 9);
    const platform = typeof window !== 'undefined'
        ? (navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mobile')
            ? 'mobile-safari'
            : 'desktop')
        : 'server';

    return {
        info: (message, data = {}) => {
            console.log(JSON.stringify({
                level: 'info',
                requestId,
                platform,
                context,
                message,
                timestamp: new Date().toISOString(),
                ...data
            }));
        },
        error: (message, error = {}) => {
            console.error(JSON.stringify({
                level: 'error',
                requestId,
                platform,
                context,
                message,
                error: error.message || error,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }));
        }
    };
}
