import InvoiceDashboard from '@/components/invoice/InvoiceDashboard';

export const metadata = {
    title: 'Invoices - CRM - Intrust India',
    description: 'Manage and reconcile invoices'
};

export default function CrmInvoiceDashboardPage() {
    return <InvoiceDashboard basePath="/crm" />;
}
