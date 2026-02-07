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
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
            console.error('Unexpected error fetching profile:', err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // 1. Get initial session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (session?.user) {
                    if (mounted) setUser(session.user);
                    const userProfile = await fetchProfile(session.user.id);
                    if (mounted) setProfile(userProfile);
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // Show loader on sign in
                if (event === 'SIGNED_IN') {
                    setShowAuthLoader(true);
                }

                if (session?.user) {
                    setUser(session.user);

                    // Simple fetch
                    const userProfile = await fetchProfile(session.user.id);
                    if (mounted) setProfile(userProfile);

                    if (event === 'SIGNED_IN') {
                        setTimeout(() => setShowAuthLoader(false), 1700);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
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

    const value = {
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        isAdmin: profile?.role === 'admin',
        isCustomer: profile?.role === 'customer',
        isMerchant: profile?.role === 'merchant',
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
