import LeadDetailPage from '@/app/(crm)/crm/leads/[id]/page';

export default function AdminLeadDetailPage({ params }) {
    // We can just render the same component since it fetches its own data and uses useAuth()
    return <LeadDetailPage params={params} />;
}
