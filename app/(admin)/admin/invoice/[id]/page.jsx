import InvoiceDetail from '@/components/invoice/InvoiceDetail';

export const metadata = {
    title: 'Invoice Details - Admin - Intrust India',
    description: 'View and reconcile invoice details'
};

export default async function AdminInvoiceDetailPage({ params }) {
    const { id } = await params;
    return <InvoiceDetail invoiceId={id} basePath="/admin" />;
}
