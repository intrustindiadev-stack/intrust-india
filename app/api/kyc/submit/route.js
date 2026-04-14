import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = request.headers.get('Authorization');
        let user;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const { data, error: userError } = await supabaseAdmin.auth.getUser(token);
            if (!userError) user = data?.user;
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { pan_number, dob } = await request.json();

        if (!pan_number || !dob) {
            return NextResponse.json({ error: 'Missing pan_number or dob' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('kyc_records')
            .upsert({
                user_id: user.id,
                pan_number,
                date_of_birth: dob,
                status: 'pending',
                verification_status: 'pending',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, record: data });
    } catch (error) {
        console.error('[API] KYC Submit Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
