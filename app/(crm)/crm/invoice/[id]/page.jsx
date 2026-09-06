import InvoiceDetail from '@/components/invoice/InvoiceDetail';

export const metadata = {
    title: 'Invoice Details - CRM - Intrust India',
    description: 'View and reconcile invoice details'
};

export default function CrmInvoiceDetailPage({ params }) {
    return <InvoiceDetail invoiceId={params.id} basePath="/crm" />;
}
