import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';

const BUCKET = 'product-images';
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request) {
    try {
        const { user, profile } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!VALID_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Check if bucket exists, create if not
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            const exists = (buckets || []).some(b => b.name === BUCKET);
            if (!exists) {
                await supabase.storage.createBucket(BUCKET, { public: true });
            }
        } catch (bErr) {
            console.warn('Bucket verification warning:', bErr.message);
        }

        // Build unique file path
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const originalName = file.name || 'product.jpg';
        const fileExt = originalName.split('.').pop().toLowerCase() || 'jpg';
        const filePath = `ai-orders/${timestamp}_${randomStr}.${fileExt}`;

        // Convert file to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.warn('Storage upload error, falling back to base64 data url:', uploadError.message);
            // Graceful fallback to Data URI
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${file.type};base64,${base64}`;
            return NextResponse.json({
                success: true,
                url: dataUrl
            });
        }

        // Retrieve public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            fileName: filePath
        });
    } catch (error) {
        console.error('Error uploading product thumbnail:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload image' }, { status: 500 });
    }
}
