import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import DistributionDashboard from '@/components/admin/crm/distribution/DistributionDashboard';
import { fetchLeadDistributionStats } from '@/app/actions/admin-distribution';

export const metadata = {
    title: 'Lead Distribution | Admin | InTrust',
    description: 'CRM Lead Distribution and Assignment Console',
};

export default async function LeadDistributionPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        redirect('/admin');
    }

    // Fetch initial stats for the health strip
    const { data: initialStats, error: statsError } = await fetchLeadDistributionStats();
    
    // We pass the stats to a client component that manages the tabs
    return (
        <DistributionDashboard initialStats={initialStats || {
            total: 0, assigned: 0, unassigned: 0, unmatched: 0, reroute_pending: 0, manual: 0, auto: 0
        }} />
    );
}
