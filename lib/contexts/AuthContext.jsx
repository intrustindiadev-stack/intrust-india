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

    // Fetch profile helper with timeout + one silent retry on AbortError.
    // 8 s covers Vercel cold-start latency; two attempts give a ~16 s total budget.
    const fetchProfile = async (userId) => {
        const attempt = async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single()
                    .abortSignal(controller.signal);

                clearTimeout(timeoutId);

                if (error) {
                    console.warn('Error fetching profile:', error.message);
                    return { data: null, timedOut: false };
                }
                return { data, timedOut: false };
            } catch (err) {
                clearTimeout(timeoutId);
                if (err.name === 'AbortError') {
                    return { data: null, timedOut: true };
                }
                console.error('Unexpected error fetching profile:', err);
                return { data: null, timedOut: false };
            }
        };

        // Attempt 1
        const result1 = await attempt();
        if (!result1.timedOut) return result1.data;

        // Attempt 1 timed out — one silent retry
        console.warn('Profile fetch timed out, retrying once...');
        const result2 = await attempt();
        // Suppress retry abort silently; just return null
        return result2.data;
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
                    // Release UI loading lock instantly before async network DB profile fetch
                    setLoading(false);
                    fetchProfile(session.user.id).then((profileData) => {
                        profileCache = profileData;
                        if (mounted) setProfile(profileData);
                    });
                    return;
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

                // Keep user state in sync whenever Supabase silently refreshes
                // the access token (e.g. after network reconnect or tab re-focus).
                if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setUser(session.user);
                    // Don't re-fetch profile on token refresh — it's the same user
                }

                if (session?.user) {
                    setUser(session.user);
                    setLoading(false); // Unblock render instantly without waiting for profile

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
                    setLoading(false);
                }
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

    // 4. Proactive session management: rely on Supabase SDK
    useEffect(() => {
        if (!user) return;
        
        // Removed manual 10-min interval, visibilitychange, and online reconnect hooks.
        // @supabase/ssr and supabase-js automatically run background timers 
        // to refresh access tokens prior to expiry and handle network reconnects safely
        // using internal locking mechanisms to prevent multi-tab race conditions.
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
        isCustomer: ['user', 'customer'].includes(profile?.role),
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
