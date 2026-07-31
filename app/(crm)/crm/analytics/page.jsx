import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AnalyticsClient from './AnalyticsClient';

export const metadata = {
    title: 'Analytics — InTrust CRM',
    description: 'CRM Performance and Analytics Dashboard',
};

export default async function AnalyticsPage() {
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

    return <AnalyticsClient currentUserId={user.id} currentUserRole={profile.role} />;
}
