import { useState, useCallback } from 'react';

/**
 * Hook to send a WhatsApp template message via /api/whatsapp/send-template
 */
export function useSendWhatsAppTemplate() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const sendTemplate = useCallback(async (payload) => {
        setIsLoading(true);
        setError(null);
        setData(null);

        try {
            const res = await fetch('/api/whatsapp/send-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const resData = await res.json().catch(() => ({}));

            if (!res.ok) {
                const errObj = resData.error || {
                    type: 'server_error',
                    message: `Request failed with status ${res.status}`
                };
                setError(errObj);
                setIsLoading(false);
                return { success: false, error: errObj };
            }

            setData(resData);
            setIsLoading(false);
            return { success: true, data: resData };
        } catch (err) {
            const errObj = {
                type: 'network_error',
                message: err.message || 'Network error occurred. Please check your internet connection.'
            };
            setError(errObj);
            setIsLoading(false);
            return { success: false, error: errObj };
        }
    }, []);

    const resetState = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setData(null);
    }, []);

    return {
        sendTemplate,
        isLoading,
        error,
        data,
        resetState
    };
}
