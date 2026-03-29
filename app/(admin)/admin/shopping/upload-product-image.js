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
            return { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            return { success: false, error: 'File too large. Maximum size is 5 MB.' };
        }

        const supabase = createAdminClient();

        // Build storage path
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop().toLowerCase();

        let filePath;
        if (role === 'admin') {
            filePath = `admin/${timestamp}_${randomStr}.${fileExt}`;
        } else {
            // Get the current user's ID for merchant path scoping
            const serverClient = await createServerSupabaseClient();
            const { data: { user } } = await serverClient.auth.getUser();
            const userId = user?.id || 'unknown';
            filePath = `merchant/${userId}/${timestamp}_${randomStr}.${fileExt}`;
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
            console.error('Product image upload error:', error);
            return { success: false, error: 'Failed to upload image: ' + error.message };
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
        console.error('uploadProductImage server error:', err);
        return { success: false, error: 'Failed to upload image' };
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
            console.error('Product image delete error:', error);
            return { success: false, error: 'Failed to delete image: ' + error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('deleteProductImage server error:', err);
        return { success: false, error: 'Failed to delete image' };
    }
}
