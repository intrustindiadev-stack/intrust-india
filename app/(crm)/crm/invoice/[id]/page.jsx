import InvoiceDetail from '@/components/invoice/InvoiceDetail';

export const metadata = {
    title: 'Invoice Details - CRM - Intrust India',
    description: 'View and reconcile invoice details'
};

export default async function CrmInvoiceDetailPage({ params }) {
    const { id } = await params;
    return <InvoiceDetail invoiceId={id} basePath="/crm" />;
}
