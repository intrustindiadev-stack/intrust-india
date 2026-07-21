import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const { fileName } = resolvedParams;

        if (!fileName) {
            return NextResponse.json({ error: 'Missing file name' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        
        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        // 2. Verify Authorization (Check role from profile)
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 403 });
        }

        const allowedRoles = ['hr_manager', 'admin', 'super_admin'];
        if (!allowedRoles.includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden. You do not have permission to view resumes.' }, { status: 403 });
        }

        // 3. Download from Supabase Storage using Admin Client
        const adminSupabase = createAdminClient();
        const { data: blob, error: downloadError } = await adminSupabase.storage
            .from('resumes')
            .download(fileName);

        if (downloadError || !blob) {
            console.error('Storage download error:', downloadError);
            return NextResponse.json({ error: 'Failed to download resume or file not found.' }, { status: 404 });
        }

        // 4. Stream the file to the client
        const headers = new Headers();
        
        // Determine content type based on extension
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
            headers.set('Content-Type', 'application/pdf');
        } else if (ext === 'doc' || ext === 'docx') {
            headers.set('Content-Type', 'application/msword');
        } else {
            headers.set('Content-Type', 'application/octet-stream');
        }

        headers.set('Content-Disposition', `inline; filename="${fileName}"`);

        return new NextResponse(blob, {
            status: 200,
            headers
        });

    } catch (error) {
        console.error('Unexpected error in resume download proxy:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
