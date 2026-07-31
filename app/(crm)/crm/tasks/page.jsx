import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import TasksClient from '@/app/(admin)/admin/tasks/TasksClient';

export const metadata = {
    title: 'CRM Tasks — InTrust',
    description: 'Manage and track tasks',
};

export default async function CRMTasksPage() {
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await authSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['relationship_exec', 'relationship_manager', 'admin', 'super_admin'].includes(profile?.role)) {
        redirect('/crm');
    }

    return <TasksClient currentUserId={user.id} currentUserRole={profile.role} />;
}
