import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// This page exists purely as a public "cookie bounce" intermediary.
// 
// THE PROBLEM:
// SabPaisa sends a cross-site POST to /api/sabpaisa/callback, which responds
// with a 303 redirect to /payment/failure (or /payment/success).
// On iOS Safari and iOS Chrome (WebKit), the browser's SameSite=Lax cookie
// enforcement treats the destination page as being in a "tainted" cross-site
// context. Any subsequent navigation FROM that page (even a top-level
// window.location.href) will have all SameSite=Lax cookies stripped.
//
// THE FIX:
// Instead of redirecting directly to /payment/failure, the callback redirects
// to this page (/payment/bounce). The bounce page first makes a same-origin
// POST to /api/sabpaisa/exchange-token, which exchanges an HttpOnly cookie
// holding the recovery token for a fresh set of SameSite=Lax auth cookies
// (via supabase.auth.setSession on the server side).
//
// CONFIRMED BEHAVIOR NOTE:
// It has NOT been device-verified whether Safari 18.4 (ITP) will store a
// SameSite=Lax cookie that is set on the 303 redirect response from a
// cross-site POST callback. If ITP refuses to store it, the exchange will
// fail because the `payment_recovery_token` cookie won't be sent.
//
// For this reason, failed exchanges show a visible "tap to continue" button
// so we can diagnose ITP failures during testing. Revert `onExchangeFailed`
// back to `() => proceed()` only after device verification confirms cookies
// are stored correctly in this context.

export default function BouncePage() {
    const router = useRouter();
    const [exchangeFailed, setExchangeFailed] = useState(false);
    const [destination, setDestination] = useState('/');

    useEffect(() => {
        if (!router.isReady) return;

        const { to, txnId } = router.query;
        let dest = '/';
        
        // Validate the destination is a relative path on our own domain.
        // Prevent open redirect vulnerabilities.
        if (to && typeof to === 'string' && to.startsWith('/') && !to.startsWith('//')) {
            dest = to;
        }
        setDestination(dest);

        const proceed = () => {
            // We use a client-side replace to break the HTTP redirect chain.
            // A server-side redirect (via getServerSideProps) does not break the chain.
            window.location.replace(dest);
        };

        // NOTE: On exchange failure, we deliberately do NOT silently proceed.
        // Instead we surface a visible "tap to continue" button.
        // See comment at top of file — this allows us to confirm whether
        // Safari 18.4 ITP is storing/sending the recovery cookie correctly.
        // Revert onExchangeFailed to `proceed` after device verification.
        const onExchangeFailed = (reason) => {
            console.error('[Bounce] Recovery exchange failed, surfacing manual continue button. Reason:', reason);
            setExchangeFailed(true);
        };

        if (txnId) {
            // Exchange token for session cookies before proceeding.
            // The browser carries the httpOnly `payment_recovery_token` cookie automatically.
            fetch('/api/sabpaisa/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txnId }),
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok || data.error) {
                    onExchangeFailed(`server error: ${data.error || res.status}`);
                } else {
                    proceed();
                }
            })
            .catch(err => {
                onExchangeFailed(`network error: ${err.message}`);
            });
        } else {
            proceed();
        }

    }, [router.isReady, router.query]);

    return (
        <>
            <Head>
                <title>Redirecting...</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div className="flex items-center justify-center min-h-screen bg-[#f7f8fa] dark:bg-[#080a10]">
                {exchangeFailed ? (
                    <div className="flex flex-col items-center gap-5 p-8 max-w-sm text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-base mb-1">Session could not be restored</p>
                            <p className="text-sm text-gray-500">
                                Your payment was processed, but your session could not be automatically restored.
                                Tap the button below to continue.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.replace(destination)}
                            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors"
                        >
                            Continue to Payment Result
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Redirecting…</p>
                    </div>
                )}
            </div>
        </>
    );
}
