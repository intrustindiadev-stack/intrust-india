'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useAuth() {
    const [state, setState] = useState({
        user: null,
        profile: null,
        loading: true,
        error: null,
    })

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                setState({ user: null, profile: null, loading: false, error: error.message })
                return
            }

            if (session?.user) {
                fetchUserProfile(session.user)
            } else {
                setState({ user: null, profile: null, loading: false, error: null })
            }
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                fetchUserProfile(session.user)
            } else {
                setState({ user: null, profile: null, loading: false, error: null })
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    async function fetchUserProfile(user) {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) throw error

            setState({ user, profile, loading: false, error: null })
        } catch (error) {
            console.error('Error fetching user profile:', error)
            setState({ user, profile: null, loading: false, error: error.message })
        }
    }

    return state
}

// Hook to check if user is admin
export function useIsAdmin() {
    const { profile, loading } = useAuth()
    return {
        isAdmin: profile?.role === 'admin',
        loading,
    }
}

// Hook to check if user is suspended
export function useIsSuspended() {
    const { profile, loading } = useAuth()
    return {
        isSuspended: profile?.is_suspended || false,
        suspensionReason: profile?.suspension_reason || null,
        loading,
    }
}
