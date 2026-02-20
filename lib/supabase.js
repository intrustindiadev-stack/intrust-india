
import { supabase } from '@/lib/supabaseClient';

/**
 * Sign in with OTP
 * Calls the custom API route to send OTP via SMSIndiaHub
 */
export async function signInWithOTP(phone) {
    try {
        const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: { message: data.error || 'Failed to send OTP' } };
        }

        return { data, error: null };
    } catch (error) {
        console.error('Error sending OTP:', error);
        return { error: { message: 'Network error. Please try again.' } };
    }
}

/**
 * Verify OTP
 * Calls the custom API route to verify OTP and get a session
 * Sets the session in the local Supabase client on success
 */
export async function verifyOTP(phone, otp, full_name = null) {
    console.log('[CLIENT] Verifying OTP for:', phone);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, otp, full_name }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('[CLIENT] API Response status:', response.status);

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch (e) {
            console.error('[CLIENT] JSON Parse Error. Raw response:', text.substring(0, 500));
            return { error: { message: `Server Error (${response.status}): Invalid response format` } };
        }

        if (!response.ok) {
            console.error('[CLIENT] API Error Response:', data);
            return { error: { message: data.error || 'Invalid OTP' } };
        }

        console.log('[CLIENT] API Success. Session present:', !!data.session);

        // IMPORTANT: Set the session in the shared Supabase client
        if (data.session) {
            console.log('[CLIENT] Attempting to set session...');
            try {
                const { error: sessionError } = await supabase.auth.setSession(data.session);

                if (sessionError) {
                    console.error('[CLIENT] Error response from setSession:', sessionError);
                    return { error: { message: 'Failed to establish session: ' + sessionError.message } };
                }
                console.log('[CLIENT] Session successfully established.');
            } catch (setSessionErr) {
                console.error('[CLIENT] Exception during setSession:', setSessionErr);
                return { error: { message: 'Critical error setting session.' } };
            }
        } else {
            console.warn('[CLIENT] No session in response data!');
            return { error: { message: 'Verification successful but no session returned.' } };
        }

        return {
            data: {
                user: data.user,
                session: data.session
            },
            error: null
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[CLIENT] OTP verification timed out');
            return { error: { message: 'Request timed out. Please check your connection.' } };
        }
        console.error('[CLIENT] Unexpected error verifying OTP:', error);
        return { error: { message: error.message || 'Network error. Please try again.' } };
    }
}

// Sign in with Google (Keep existing logic)
export async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`
        }
    });
}

// Link Google account to existing user (for phone-auth users adding Google)
export async function linkGoogleAccount() {
    return supabase.auth.linkIdentity({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/profile`
        }
    });
}

// Sign out
export async function signOut() {
    return supabase.auth.signOut();
}

// Get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Get user profile
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    return { data, error };
}

// Reset password - Not implemented for phone auth
export async function resetPassword(email) {
    return { error: { message: 'Not implemented for phone auth' } };
}

// Re-export supabase for backward compatibility if any file imports it from here
export { supabase };
