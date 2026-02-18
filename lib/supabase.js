
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
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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

        console.log('[CLIENT] Response status:', response.status);

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('[CLIENT] JSON Parse Error. Raw response:', text.substring(0, 500));
            return { error: { message: `Server Error (${response.status}): Invalid response format` } };
        }

        if (!response.ok) {
            console.error('[CLIENT] API Error:', data.error);
            return { error: { message: data.error || 'Invalid OTP' } };
        }

        console.log('[CLIENT] API Success. Data keys:', Object.keys(data));

        // IMPORTANT: Set the session in the shared Supabase client
        if (data.session) {
            console.log('[CLIENT] Setting session...');
            const { error: sessionError } = await supabase.auth.setSession(data.session);
            if (sessionError) {
                console.error('[CLIENT] Error setting session:', sessionError);
                return { error: { message: 'Failed to establish session' } };
            }
            console.log('[CLIENT] Session set successfully.');
        } else {
            console.warn('[CLIENT] No session in response data!');
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
            console.error('OTP verification timed out');
            return { error: { message: 'Request timed out. Please check your connection.' } };
        }
        console.error('Error verifying OTP:', error);
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
