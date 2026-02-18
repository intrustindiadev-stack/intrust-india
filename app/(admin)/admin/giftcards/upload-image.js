'use server';

import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Upload image to Supabase Storage
 * Returns the public URL of the uploaded image
 */
export async function uploadGiftCardImage(formData) {
    try {
        const file = formData.get('file');

        if (!file || file.size === 0) {
            return { success: false, error: 'No file provided' };
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            return { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' };
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { success: false, error: 'File size too large. Maximum 5MB allowed.' };
        }

        const supabase = createAdminClient();

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileExt = file.name.split('.').pop();
        const fileName = `giftcard_${timestamp}_${randomStr}.${fileExt}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('gift-cards') // bucket name
            .upload(fileName, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            return { success: false, error: 'Failed to upload image: ' + error.message };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('gift-cards')
            .getPublicUrl(fileName);

        return {
            success: true,
            url: publicUrl,
            fileName: fileName
        };

    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to upload image' };
    }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteGiftCardImage(fileName) {
    try {
        if (!fileName) {
            return { success: false, error: 'No filename provided' };
        }

        const supabase = createAdminClient();

        const { error } = await supabase.storage
            .from('gift-cards')
            .remove([fileName]);

        if (error) {
            console.error('Delete error:', error);
            return { success: false, error: 'Failed to delete image: ' + error.message };
        }

        return { success: true };

    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to delete image' };
    }
}
