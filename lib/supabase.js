import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock functions for UI development - will be replaced with real Supabase calls later

// Sign in with OTP
export async function signInWithOTP(phone) {
    console.log('Mock: Sending OTP to', phone);
    // Mock success response
    return { data: { success: true }, error: null };
}

// Verify OTP
export async function verifyOTP(phone, token) {
    console.log('Mock: Verifying OTP', token, 'for', phone);
    // Mock success response
    return {
        data: {
            user: { id: 'mock-user-id', phone },
            session: { access_token: 'mock-token' }
        },
        error: null
    };
}

// Sign in with Google
export async function signInWithGoogle() {
    console.log('Mock: Signing in with Google');
    // Mock success response
    return { data: { url: '/auth/callback' }, error: null };
}

// Sign out
export async function signOut() {
    console.log('Mock: Signing out');
    return { error: null };
}

// Get current user
export async function getCurrentUser() {
    console.log('Mock: Getting current user');
    // Mock user for UI development
    return null; // Return null for now (not logged in)
}

// Get user profile
export async function getUserProfile(userId) {
    console.log('Mock: Getting user profile for', userId);
    // Mock profile data
    return {
        data: {
            id: userId,
            name: 'Test User',
            phone: '+919876543210',
            role: 'customer' // Options: 'customer', 'merchant', 'admin'
        },
        error: null
    };
}

// Reset password
export async function resetPassword(email) {
    console.log('Mock: Sending password reset email to', email);
    // Mock success response
    return { data: { success: true }, error: null };
}
