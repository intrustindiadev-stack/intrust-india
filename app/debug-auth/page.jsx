'use client';

import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DebugAuthPage() {
    const [authInfo, setAuthInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            // Get session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                setAuthInfo({ error: 'Session error: ' + sessionError.message });
                setLoading(false);
                return;
            }

            if (!session) {
                setAuthInfo({ error: 'No session found. Please log in.' });
                setLoading(false);
                return;
            }

            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                setAuthInfo({
                    error: 'Profile error: ' + profileError.message,
                    session: session
                });
                setLoading(false);
                return;
            }

            setAuthInfo({
                session: {
                    userId: session.user.id,
                    email: session.user.email,
                    createdAt: session.user.created_at
                },
                profile: profile,
                isAdmin: profile?.role === 'admin'
            });
            setLoading(false);
        } catch (err) {
            setAuthInfo({ error: err.message });
            setLoading(false);
        }
    }

    async function handleLogout() {
        await fetch('/auth/logout', {
            method: 'POST',
        });
        window.location.href = '/login';
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <p className="text-xl">Loading auth info...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>

                <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
                    <h2 className="text-xl font-bold mb-4">Auth Information</h2>
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                        {JSON.stringify(authInfo, null, 2)}
                    </pre>
                </div>

                {authInfo?.isAdmin ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-green-900 mb-2">✅ You are an Admin!</h3>
                        <p className="text-green-700 mb-4">Your role is correctly set to admin in the database.</p>
                        <button
                            onClick={() => router.push('/admin/giftcards')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            Go to Admin Panel
                        </button>
                    </div>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-red-900 mb-2">❌ Not an Admin</h3>
                        <p className="text-red-700">
                            {authInfo?.profile?.role
                                ? `Your current role is: ${authInfo.profile.role}`
                                : 'No profile found'}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={checkAuth}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        🔄 Refresh Auth Info
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        🚪 Logout and Login Again
                    </button>
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">💡 Troubleshooting Steps</h3>
                    <ol className="list-decimal list-inside text-blue-800 space-y-2">
                        <li>Click "Logout and Login Again" button above</li>
                        <li>Log in with your admin account</li>
                        <li>Come back to this page and click "Refresh Auth Info"</li>
                        <li>If you see "You are an Admin", click "Go to Admin Panel"</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
