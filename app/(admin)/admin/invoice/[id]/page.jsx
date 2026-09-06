import InvoiceDetail from '@/components/invoice/InvoiceDetail';

export const metadata = {
    title: 'Invoice Details - Admin - Intrust India',
    description: 'View and reconcile invoice details'
};

export default function AdminInvoiceDetailPage({ params }) {
    return <InvoiceDetail invoiceId={params.id} basePath="/admin" />;
}
