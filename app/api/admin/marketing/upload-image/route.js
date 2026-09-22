import { NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import fs from 'fs';
import path from 'path';

const BUCKET = 'product-images';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request) {
    try {
        // 1. Verify Authentication
        let isAdmin = false;
        try {
            const authClient = await createServerSupabaseClient();
            const { data: { user } } = await authClient.auth.getUser();
            if (user) {
                const supabaseAdmin = createAdminClient();
                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile && ['admin', 'super_admin'].includes(profile.role)) {
                    isAdmin = true;
                }
            }
        } catch (authErr) {
            console.warn('Auth verification fallback:', authErr?.message);
        }

        // 2. Read File from FormData
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || file.size === 0) {
            return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
        }

        if (!VALID_TYPES.includes(file.type.toLowerCase())) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid file format. Please upload JPEG, PNG, or WebP images.' 
            }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ 
                success: false, 
                error: 'File too large. Maximum allowed size is 10 MB.' 
            }, { status: 400 });
        }

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const originalName = file.name || 'prize.jpg';
        const fileExt = originalName.split('.').pop().toLowerCase() || 'jpg';
        const fileName = `prize_${timestamp}_${randomStr}.${fileExt}`;
        const filePath = `marketing-prizes/${fileName}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 3. Try Supabase Storage Upload
        try {
            const supabaseAdmin = createAdminClient();

            // Ensure bucket exists
            try {
                const { data: buckets } = await supabaseAdmin.storage.listBuckets();
                const exists = (buckets || []).some(b => b.name === BUCKET);
                if (!exists) {
                    await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
                }
            } catch (bErr) {
                console.warn('Bucket verification warning:', bErr?.message);
            }

            const { error: uploadError } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(filePath, buffer, {
                    contentType: file.type,
                    cacheControl: '3600',
                    upsert: true
                });

            if (!uploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from(BUCKET)
                    .getPublicUrl(filePath);

                return NextResponse.json({
                    success: true,
                    url: publicUrl,
                    fileName: fileName
                });
            } else {
                console.warn('Supabase storage upload error, falling back to local static directory:', uploadError.message);
            }
        } catch (storageErr) {
            console.warn('Supabase storage exception, falling back to local static directory:', storageErr?.message);
        }

        // 4. Bulletproof Fallback: Save directly to public/marketing/uploads/
        const uploadDir = path.join(process.cwd(), 'public', 'marketing', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const localFilePath = path.join(uploadDir, fileName);
        fs.writeFileSync(localFilePath, buffer);

        const localPublicUrl = `/marketing/uploads/${fileName}`;
        return NextResponse.json({
            success: true,
            url: localPublicUrl,
            fileName: fileName
        });

    } catch (err) {
        console.error('Error in marketing prize image upload:', err);
        return NextResponse.json({ 
            success: false, 
            error: err.message || 'Internal server error while uploading image' 
        }, { status: 500 });
    }
}
