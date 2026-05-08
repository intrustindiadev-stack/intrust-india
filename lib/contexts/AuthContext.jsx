'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FastProgressLoader } from '@/components/ui/InTrustProgressLoader';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAuthLoader, setShowAuthLoader] = useState(false);

    // Fetch profile helper with timeout
    const fetchProfile = async (userId) => {
        try {
            // Add a timeout signal to prevent indefinite hanging
            // Decreased to 3s for better UX on Vercel cold starts or RLS blocks
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single()
                .abortSignal(controller.signal); // Use Supabase's built-in abort support if available or just catch generic timeouts

            clearTimeout(timeoutId);

            if (error) {
                console.warn('Error fetching profile:', error.message);
                return null;
            }
            return data;
        } catch (err) {
            // Don't log abort errors as errors - they're expected timeouts
            if (err.name === 'AbortError') {
                console.warn('Profile fetch timed out, continuing without profile');
            } else {
                console.error('Unexpected error fetching profile:', err);
            }
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;
        let profileCache = null;

        const initializeAuth = async () => {
            try {
                // 1. Get initial session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    // Handle expired/invalid refresh tokens gracefully
                    if (error.message?.includes('Refresh Token') || error.status === 401) {
                        console.warn('Session expired, signing out');
                        await supabase.auth.signOut();
                        if (mounted) { setUser(null); setProfile(null); }
                    } else {
                        throw error;
                    }
                } else if (session?.user && mounted) {
                    setUser(session.user);
                    profileCache = await fetchProfile(session.user.id);
                    if (mounted) setProfile(profileCache);
                }
            } catch (err) {
                if (!err.message?.includes('Refresh Token Not Found')) {
                    console.error('Error initializing auth:', err);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('[AUTH-CONTEXT] Auth event fired:', event);
                if (!mounted) return;

                // Show loader on sign in
                if (event === 'SIGNED_IN') {
                    setShowAuthLoader(true);
                }

                if (session?.user) {
                    setUser(session.user);

                    if (!profileCache || profileCache.id !== session.user.id) {
                        fetchProfile(session.user.id).then((profile) => {
                            profileCache = profile;
                            if (mounted) setProfile(profile);
                        });
                    }

                    if (event === 'SIGNED_IN') {
                        setTimeout(() => setShowAuthLoader(false), 1700);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                    profileCache = null;
                    setShowAuthLoader(false);
                }

                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    // 3. Proactive daily login reward trigger
    useEffect(() => {
        if (!user) return;

        const triggerDailyReward = async () => {
            try {
                // We use a sessionStorage flag to avoid spamming the API in the same tab session
                // The API itself has a 24h guard, but this reduces unnecessary network traffic.
                const today = new Date().toISOString().split('T')[0];
                const lastTrigger = sessionStorage.getItem('last_daily_reward_trigger');

                if (lastTrigger === today) return;

                console.log('[AUTH-CONTEXT] Triggering daily login reward check...');
                const response = await fetch('/api/rewards/daily-login', { method: 'POST' });
                const result = await response.json();

                if (result.success && result.data?.total_distributed > 0) {
                    console.log('[AUTH-CONTEXT] Daily reward claimed successfully!');
                    // Optionally refresh profile to show new balance
                    refreshProfile();
                }
                
                sessionStorage.setItem('last_daily_reward_trigger', today);
            } catch (err) {
                console.error('[AUTH-CONTEXT] Failed to trigger daily reward:', err);
            }
        };

        triggerDailyReward();
    }, [user?.id]);

    // 4. Proactive session refresh: prevent auto-logout if tab is left open but inactive for hours
    useEffect(() => {
        if (!user) return;

        // Auto-refresh the session every 10 minutes to guarantee it never expires while the app is open
        const intervalId = setInterval(() => {
            console.log('[AUTH-CONTEXT] Proactively refreshing session to prevent auto-logout');
            supabase.auth.getSession();
        }, 1000 * 60 * 10);

        // Instantly refresh when the user switches back to the tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[AUTH-CONTEXT] Tab became visible, refreshing session');
                supabase.auth.getSession();
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            clearInterval(intervalId);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        };
    }, [user?.id]);

    const refreshProfile = async () => {
        if (user) {
            const updated = await fetchProfile(user.id);
            if (updated) setProfile(updated);
        }
    };

    // Force-refresh the auth user object (e.g. after phone linking)
    const refreshUser = async () => {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (freshUser) setUser(freshUser);
        return freshUser;
    };

    const value = {
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
        isSuperAdmin: profile?.role === 'super_admin',
        isCustomer: profile?.role === 'customer',
        isMerchant: profile?.role === 'merchant',
        refreshProfile,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {showAuthLoader && (
                <FastProgressLoader
                    onComplete={() => setShowAuthLoader(false)}
                    message={`Welcome ${profile?.role ? `to ${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Portal` : 'to InTrust'}`}
                />
            )}
            {children}
        </AuthContext.Provider>
    );
}
