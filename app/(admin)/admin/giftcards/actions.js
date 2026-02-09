'use server';

import { createAdminClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

/**
 * Server actions for gift card (coupons) management
 * CRITICAL: Uses service role key - NEVER expose to client
 */

// Helper to verify admin access
async function verifyAdmin() {
    // TODO: Add proper admin verification via session
    // For now, we trust that these server actions are protected by route guards
    return true;
}

/**
 * Get all gift cards (coupons) - for admin list page
 */
export async function getAllGiftCards() {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching gift cards:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to fetch gift cards' };
    }
}

/**
 * Get single gift card by ID
 */
export async function getGiftCardById(id) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching gift card:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to fetch gift card' };
    }
}

/**
 * Create new gift card
 */
export async function createGiftCard(formData) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        // Extract and convert form data
        const brand = formData.get('brand');
        const title = formData.get('title');
        const description = formData.get('description');
        const category = formData.get('category');
        const faceValueRupees = parseFloat(formData.get('faceValue'));
        const sellingPriceRupees = parseFloat(formData.get('sellingPrice'));
        const encryptedCode = formData.get('encryptedCode');
        const maskedCode = formData.get('maskedCode');
        const validFrom = formData.get('validFrom');
        const validUntil = formData.get('validUntil');
        const terms = formData.get('terms');
        const usageInstructions = formData.get('usageInstructions');
        const imageUrl = formData.get('imageUrl');
        const tagsString = formData.get('tags');
        const status = formData.get('status') || 'available';

        // Validate required fields
        if (!brand || !title || !description || !category || !faceValueRupees || !sellingPriceRupees || !encryptedCode || !maskedCode || !validUntil || !terms) {
            return { success: false, error: 'Missing required fields' };
        }

        // Convert rupees to paise
        const faceValuePaise = Math.round(faceValueRupees * 100);
        const sellingPricePaise = Math.round(sellingPriceRupees * 100);

        // Parse tags
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        // Get admin user ID (for created_by field)
        // Using your actual user ID from the database
        const createdBy = '032ffa52-25e5-4849-85a0-00d27e043fbc';

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('coupons')
            .insert({
                brand,
                title,
                description,
                category,
                face_value_paise: faceValuePaise,
                selling_price_paise: sellingPricePaise,
                encrypted_code: encryptedCode, // In production, encrypt this properly
                masked_code: maskedCode,
                status,
                valid_from: validFrom || new Date().toISOString(),
                valid_until: validUntil,
                terms_and_conditions: terms,
                usage_instructions: usageInstructions || '',
                image_url: imageUrl || null,
                tags,
                created_by: createdBy
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating gift card:', error);
            return { success: false, error: error.message };
        }

        // Revalidate the gift cards list page
        revalidatePath('/admin/giftcards');

        return { success: true, data };
    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to create gift card' };
    }
}

/**
 * Update existing gift card
 */
export async function updateGiftCard(id, formData) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        // Extract and convert form data
        const brand = formData.get('brand');
        const title = formData.get('title');
        const description = formData.get('description');
        const category = formData.get('category');
        const faceValueRupees = parseFloat(formData.get('faceValue'));
        const sellingPriceRupees = parseFloat(formData.get('sellingPrice'));
        const encryptedCode = formData.get('encryptedCode');
        const maskedCode = formData.get('maskedCode');
        const validFrom = formData.get('validFrom');
        const validUntil = formData.get('validUntil');
        const terms = formData.get('terms');
        const usageInstructions = formData.get('usageInstructions');
        const imageUrl = formData.get('imageUrl');
        const tagsString = formData.get('tags');
        const status = formData.get('status');

        // Validate required fields
        if (!brand || !title || !description || !category || !faceValueRupees || !sellingPriceRupees || !encryptedCode || !maskedCode || !validUntil || !terms) {
            return { success: false, error: 'Missing required fields' };
        }

        // Convert rupees to paise
        const faceValuePaise = Math.round(faceValueRupees * 100);
        const sellingPricePaise = Math.round(sellingPriceRupees * 100);

        // Parse tags
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('coupons')
            .update({
                brand,
                title,
                description,
                category,
                face_value_paise: faceValuePaise,
                selling_price_paise: sellingPricePaise,
                encrypted_code: encryptedCode,
                masked_code: maskedCode,
                status,
                valid_from: validFrom,
                valid_until: validUntil,
                terms_and_conditions: terms,
                usage_instructions: usageInstructions || '',
                image_url: imageUrl || null,
                tags,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating gift card:', error);
            return { success: false, error: error.message };
        }

        // Revalidate pages
        revalidatePath('/admin/giftcards');
        revalidatePath(`/admin/giftcards/${id}`);

        return { success: true, data };
    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to update gift card' };
    }
}

/**
 * Soft delete gift card (set status to expired)
 */
export async function deleteGiftCard(id) {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('coupons')
            .update({
                status: 'expired',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error deleting gift card:', error);
            return { success: false, error: error.message };
        }

        // Revalidate the gift cards list page
        revalidatePath('/admin/giftcards');

        return { success: true, data };
    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to delete gift card' };
    }
}

/**
 * Get gift card statistics for dashboard
 */
export async function getGiftCardStats() {
    try {
        const isAdmin = await verifyAdmin();
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized' };
        }

        const supabase = createAdminClient();

        // Get total count
        const { count: totalCount } = await supabase
            .from('coupons')
            .select('*', { count: 'exact', head: true });

        // Get active count
        const { count: activeCount } = await supabase
            .from('coupons')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'available');

        // Get expired count
        const { count: expiredCount } = await supabase
            .from('coupons')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'expired');

        return {
            success: true,
            data: {
                total: totalCount || 0,
                active: activeCount || 0,
                expired: expiredCount || 0
            }
        };
    } catch (error) {
        console.error('Server error:', error);
        return { success: false, error: 'Failed to fetch statistics' };
    }
}
