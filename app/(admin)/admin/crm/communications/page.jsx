import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import CommunicationsClient from './CommunicationsClient';

export const metadata = {
    title: 'CRM Communications | Admin Panel',
    description: 'View CRM WhatsApp communication logs'
};

export default async function CommunicationsPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return null;
    }

    const adminClient = createAdminClient();
    
    // Fetch initial logs (today by default)
    const today = new Date();
    today.setHours(0,0,0,0);

    const { data: logs, error } = await adminClient
        .from('whatsapp_message_logs')
        .select('*')
        .not('agent_id', 'is', null)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching admin communication logs:', error);
    }

    let enrichedLogs = logs || [];
    if (enrichedLogs.length > 0) {
        const agentIds = [...new Set(enrichedLogs.map(l => l.agent_id))];
        const { data: profiles } = await adminClient
            .from('user_profiles')
            .select('id, full_name, role')
            .in('id', agentIds);
            
        if (profiles) {
            const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
            enrichedLogs = enrichedLogs.map(log => ({
                ...log,
                crm_agent: profileMap[log.agent_id] || null
            }));
        }
    }

    return (
        <CommunicationsClient initialLogs={enrichedLogs} />
    );
}
