import { NextResponse } from 'next/server';
import { getAuthorizedTeamScope } from '@/lib/teamAuth';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { serviceAreaBulkSchema } from '@/lib/crm/validation';

export async function GET(request, { params }) {
    try {
        const teamId = params.id;
        const auth = await getAuthorizedTeamScope(teamId);
        if (!auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
            .from('team_service_areas')
            .select('*')
            .eq('team_id', teamId)
            .order('area_type', { ascending: true })
            .order('value', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const teamId = params.id;
        const auth = await getAuthorizedTeamScope(teamId);
        if (!auth.authorized || !auth.capabilities.canAssignMembers) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const parsed = serviceAreaBulkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Check for duplicates globally
        const payloads = parsed.data.map(item => ({
            ...item,
            team_id: teamId,
            created_by: user.id
        }));

        const { data, error } = await supabase
            .from('team_service_areas')
            .insert(payloads)
            .select();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'One or more of these areas are already assigned exclusively to a team.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const teamId = params.id;
        const auth = await getAuthorizedTeamScope(teamId);
        if (!auth.authorized || !auth.capabilities.canAssignMembers) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const url = new URL(request.url);
        const ids = url.searchParams.getAll('id');
        if (!ids.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from('team_service_areas')
            .delete()
            .in('id', ids)
            .eq('team_id', teamId); // extra guard

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
