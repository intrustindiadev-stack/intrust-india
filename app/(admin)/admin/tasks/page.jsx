import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import TasksClient from './TasksClient';

export const metadata = {
    title: 'Tasks — InTrust Admin',
    description: 'Manage and track admin tasks',
};

export default async function TasksPage() {
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) redirect('/login');

    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        redirect('/admin');
    }

    return <TasksClient currentUserId={user.id} currentUserRole={profile.role} />;
}
