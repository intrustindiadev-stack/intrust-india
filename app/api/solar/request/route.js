import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { solarLeadSchema } from '@/lib/solar/schema';
import { SolarErrors } from '@/lib/solar/errors';

export async function POST(req) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized', code: SolarErrors.UNAUTHORIZED }, { status: 401 });
        }

        const body = await req.json();
        
        // Zod validation
        const parsed = solarLeadSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ 
                error: 'Validation failed', 
                code: SolarErrors.VALIDATION_ERROR,
                details: parsed.error.format() 
            }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Check for existing active lead
        const { data: existingLead, error: checkError } = await adminClient
            .from('solar_leads')
            .select('id')
            .eq('user_id', user.id)
            .not('status', 'in', '("converted","lost","cancelled")')
            .maybeSingle();

        if (checkError) {
            console.error('Supabase admin check error:', checkError);
            return NextResponse.json({ error: 'Database check failed', code: SolarErrors.INTERNAL_ERROR }, { status: 500 });
        }

        if (existingLead) {
            return NextResponse.json({ 
                error: 'You already have an active solar request.', 
                code: SolarErrors.DUPLICATE_ACTIVE_LEAD 
            }, { status: 409 });
        }

        // Insert new lead
        const { error: insertError } = await adminClient.from('solar_leads').insert([{
            ...parsed.data,
            user_id: user.id,
            source: 'website',
            status: 'new'
        }]);

        if (insertError) {
            console.error('Supabase admin insert error:', insertError);
            // Specifically handle unique constraint violation from our new partial index just in case
            if (insertError.code === '23505') {
                 return NextResponse.json({ 
                    error: 'You already have an active solar request.', 
                    code: SolarErrors.DUPLICATE_ACTIVE_LEAD 
                }, { status: 409 });
            }
            return NextResponse.json({ error: 'Failed to submit request', code: SolarErrors.INTERNAL_ERROR }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error', code: SolarErrors.INTERNAL_ERROR }, { status: 500 });
    }
}

