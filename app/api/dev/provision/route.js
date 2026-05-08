import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(request) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { role } = await request.json();
        if (!['admin', 'hr_manager', 'merchant', 'customer'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        const email = `dev_${role}@intrust.local`;
        const password = `Dev@${role}123!`;
        const admin = createAdminClient();

        // Check if user exists
        const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
        if (listError) throw listError;

        let user = users.find(u => u.email === email);

        if (!user) {
            // Create user
            const { data: newUserData, error: createError } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name: `Dev ${role.toUpperCase()}` }
            });
            if (createError) throw createError;
            user = newUserData.user;
            
            // Wait a moment for trigger to create user_profile
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Always ensure role is correct
        await admin.from('user_profiles').update({ role }).eq('id', user.id);

        return NextResponse.json({ email, password, role });
    } catch (err) {
        console.error('[DEV PROVISION]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
