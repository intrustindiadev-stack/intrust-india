'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, getUserProfile } from '@/lib/supabase';
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

    useEffect(() => {
        // Check active sessions and sets the user
        const checkUser = async () => {
            try {
                // Skip if Supabase is not configured
                if (!supabase) {
                    console.warn('⚠️ Supabase not configured. Auth features disabled. See SETUP.md');
                    setLoading(false);
                    return;
                }

                const currentUser = await getCurrentUser();
                setUser(currentUser);

                if (currentUser) {
                    const userProfile = await getUserProfile(currentUser.id);
                    setProfile(userProfile);
                }
            } catch (error) {
                console.error('Auth check error:', error);
            } finally {
                setLoading(false);
            }
        };

        checkUser();

        // Skip auth listener if no Supabase
        if (!supabase) return;

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Show loader on sign in
                if (event === 'SIGNED_IN') {
                    setShowAuthLoader(true);
                }

                if (session?.user) {
                    setUser(session.user);
                    const userProfile = await getUserProfile(session.user.id);
                    setProfile(userProfile);

                    // Keep loader visible for role-based redirect
                    if (event === 'SIGNED_IN') {
                        // Loader will auto-hide after 2 seconds (FastProgressLoader)
                        setTimeout(() => setShowAuthLoader(false), 2500);
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
