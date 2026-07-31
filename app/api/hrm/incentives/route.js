import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const HR_ROLES = ['hr', 'hr_manager', 'admin', 'super_admin'];

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const { data, error } = await admin
            .from('incentives')
            .select(`
                *,
                user_profiles:employee_id ( full_name, email )
            `)
            .order('date_awarded', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[API] HRM Fetch Incentives Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const payload = await request.json();
        
        if (!payload.employee_id || !payload.amount || !payload.type) {
            return NextResponse.json({ error: 'Employee, amount, and type are required' }, { status: 400 });
        }

        const { data, error } = await admin
            .from('incentives')
            .insert({
                employee_id: payload.employee_id,
                amount: payload.amount,
                type: payload.type,
                description: payload.description || '',
                status: payload.status || 'Pending',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });

    } catch (err) {
        console.error('[API] HRM Create Incentive Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
