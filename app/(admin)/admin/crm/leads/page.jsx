import LeadsPageClient from '@/app/(crm)/crm/leads/page';

export const metadata = {
    title: 'All Leads - Admin CRM',
    description: 'View and manage all leads in the CRM.',
};

export default function AdminLeadsPage() {
    return <LeadsPageClient />;
}
