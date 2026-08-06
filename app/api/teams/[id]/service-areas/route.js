import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { getAuthorizedTeamScope } from '@/lib/teamAuth';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { serviceAreaBulkSchema } from '@/lib/crm/validation';

export async function GET(request, { params }) {
    try {
        const teamId = (await params).id;
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const auth = await getAuthorizedTeamScope(user, profile, admin);
        if (!auth.isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

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
        const teamId = (await params).id;
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const auth = await getAuthorizedTeamScope(user, profile, admin);
        if (!auth.isAuthorized || !auth.capabilities.canAssignMembers) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const parsed = serviceAreaBulkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
        }

        const supabase = createAdminClient();


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
        const teamId = (await params).id;
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const auth = await getAuthorizedTeamScope(user, profile, admin);
        if (!auth.isAuthorized || !auth.capabilities.canAssignMembers) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const url = new URL(request.url);
        const ids = url.searchParams.getAll('id');
        if (!ids.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

        const supabase = createAdminClient();
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
