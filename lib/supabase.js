
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

        console.log('[CLIENT] Session established via server cookie.');

        // Diagnostic: confirm the browser client sees the cookie-based session
        // on the NEXT page load (this call may return null within the same execution
        // context, before the browser stores the Set-Cookie headers).
        if (process.env.NODE_ENV !== 'production') {
            supabase.auth.getSession().then(({ data: { session } }) => {
                console.log('[DIAG] getSession after verifyOTP:', session ? 'session present' : 'null (expected before navigation)');
            });
        }

        return {
            data: { user: data.user },
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

// Reset password — sends Supabase's native password-reset email
export async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`
    });
}

/**
 * Sign up with email + password
 * Uses Supabase's native email auth. Verification email is sent automatically.
 */
export async function signUpWithEmail(email, password, fullName) {
    return supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });
}

/**
 * Sign in with email + password
 * Session cookie management is handled by the API route (/api/auth/email/signin).
 */
export async function signInWithEmail(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
}

// Re-export supabase for backward compatibility if any file imports it from here
export { supabase };
