'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        // Handle the OAuth callback
        const handleCallback = async () => {
            // Wait a moment for Supabase to process the auth
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Redirect to dashboard
            router.push('/dashboard');
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#92BCEA] animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Completing sign in...</p>
            </div>
        </div>
    );
}
