/**
 * @deprecated This checkout page is part of the legacy payment stack.
 * All payment flows should use the App Router SabPaisa integration instead.
 * This page now redirects to /dashboard to prevent users from reaching the
 * test-style checkout interface.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const CheckoutPage = () => {
    const router = useRouter();

    useEffect(() => {
        console.warn('[DEPRECATED] /payment/checkout accessed — redirecting to /dashboard');
        router.replace('/dashboard?from=legacy_checkout');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center text-gray-500">
            Redirecting…
        </div>
    );
};

export default CheckoutPage;
