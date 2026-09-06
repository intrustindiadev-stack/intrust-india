import InvoiceDashboard from '@/components/invoice/InvoiceDashboard';

export const metadata = {
    title: 'Invoices - Admin - Intrust India',
    description: 'Manage and reconcile invoices'
};

export default function AdminInvoiceDashboardPage() {
    return <InvoiceDashboard basePath="/admin" />;
}
