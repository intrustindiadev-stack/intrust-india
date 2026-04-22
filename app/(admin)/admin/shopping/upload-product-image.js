'use server';

import { createAdminClient } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

const BUCKET = 'product-images';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Upload a product image to Supabase Storage.
 * @param {FormData} formData - must contain a 'file' field
 * @param {'admin' | 'merchant'} role
 * @returns {{ success: boolean, url?: string, fileName?: string, error?: string }}
 */
export async function uploadProductImage(formData, role) {
    try {
        const file = formData.get('file');

        if (!file || file.size === 0) {
            return { success: false, error: 'No file provided' };
        }

        // Validate type
        if (!VALID_TYPES.includes(file.type)) {
            console.error('Upload rejected: Invalid file type', file.type);
            return { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            console.error('Upload rejected: File too large', file.size);
            return { success: false, error: 'File too large. Maximum size is 5 MB.' };
        }

        const supabase = createAdminClient();

        // Build storage path
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const originalName = file.name || 'image.jpg';
        const fileExt = originalName.split('.').pop().toLowerCase() || 'jpg';

        let filePath;
        if (role === 'admin' || role === 'super_admin') {
            filePath = `admin/${timestamp}_${randomStr}.${fileExt}`;
        } else {
            // Get the current user's ID for merchant path scoping
            // Using createServerSupabaseClient to check authentication
            try {
                const serverClient = await createServerSupabaseClient();
                const { data: { user }, error: authError } = await serverClient.auth.getUser();

                if (authError || !user) {
                    console.error('Merchant upload auth error:', authError);
                    return { success: false, error: 'Session expired. Please log in again.' };
                }

                filePath = `merchant/${user.id}/${timestamp}_${randomStr}.${fileExt}`;
            } catch (authErr) {
                console.error('Failed to get auth user:', authErr);
                return { success: false, error: 'Authentication service unavailable' };
            }
        }

        // Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload
        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            console.error('Supabase Storage upload error:', error);
            return {
                success: false,
                error: (error.message?.includes('Bucket not found'))
                    ? 'Storage system misconfigured. Please contact support.'
                    : 'Failed to save image to storage: ' + error.message
            };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(filePath);

        return {
            success: true,
            url: publicUrl,
            fileName: filePath,
        };

    } catch (err) {
        console.error('CRITICAL: uploadProductImage server error:', err);
        return { success: false, error: 'An unexpected error occurred during upload. Please try again.' };
    }
}

/**
 * Delete a product image from Supabase Storage.
 * @param {string} fileName - the storage path (e.g. "admin/1234_abc.jpg")
 * @returns {{ success: boolean, error?: string }}
 */
export async function deleteProductImage(fileName) {
    try {
        if (!fileName) {
            return { success: false, error: 'No filename provided' };
        }

        const supabase = createAdminClient();

        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([fileName]);

        if (error) {
            console.error('Supabase Storage delete error:', error);
            return { success: false, error: 'Failed to delete image: ' + error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('CRITICAL: deleteProductImage server error:', err);
        return { success: false, error: 'Failed to delete image' };
    }
}
