import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        
        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        // 2. Parse FormData
        const formData = await request.formData();
        const file = formData.get('resume');

        if (!file) {
            return NextResponse.json({ error: 'No resume file provided.' }, { status: 400 });
        }

        // 3. Validate File Size (5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File size must be less than 5MB.' }, { status: 413 });
        }

        // 4. Validate File Type
        const allowedTypes = [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and Word documents are allowed.' }, { status: 415 });
        }

        // 5. Upload using Admin Client (Bypasses proxy restrictions for client and avoids RLS issues if any)
        const adminSupabase = createAdminClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await adminSupabase.storage
            .from('resumes')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({ error: 'Failed to upload resume to storage.', details: uploadError }, { status: 500 });
        }

        // 6. Return Local Proxy URL (bucket is private)
        const localProxyUrl = `/api/hrm/resume/${fileName}`;

        return NextResponse.json({ success: true, url: localProxyUrl });

    } catch (error) {
        console.error('Unexpected error in upload-resume:', error);
        return NextResponse.json({ error: 'An unexpected error occurred while processing the upload.' }, { status: 500 });
    }
}
