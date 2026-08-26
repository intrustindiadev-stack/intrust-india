'use client';

import { useEffect } from 'react';

// Helper to read cookies on the client
function getCookie(name) {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export default function CsrfProvider({ children }) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        // Prevent multiple bindings in dev strict mode
        if (window.__csrfFetchIntercepted) return;
        window.__csrfFetchIntercepted = true;

        const originalFetch = window.fetch;

        window.fetch = async function(...args) {
            let [resource, config] = args;
            config = config || {};
            
            const method = config.method ? config.method.toUpperCase() : 'GET';
            const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

            if (isMutation) {
                const csrfToken = getCookie('csrf_token');
                if (csrfToken) {
                    config.headers = {
                        ...config.headers,
                        'X-CSRF-Token': csrfToken
                    };
                }
            }

            return originalFetch(resource, config);
        };
    }, []);

    return <>{children}</>;
}
