import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import CampaignsClient from './CampaignsClient';

export const metadata = {
    title: 'Campaigns — InTrust CRM',
    description: 'Track CRM marketing and outreach campaigns',
};

export default async function CampaignsPage() {
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await authSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['sales_exec', 'sales_manager', 'admin', 'super_admin'].includes(profile?.role)) {
        redirect('/crm');
    }

    return <CampaignsClient currentUserId={user.id} currentUserRole={profile.role} />;
}
