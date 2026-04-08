import AutoMerchantDetailsClient from './AutoMerchantDetailsClient';

export function generateMetadata({ params }) {
    return {
        title: `Auto Mode Merchant | Admin`,
        description: 'Auto Mode Order Feed and Merchant Analytics'
    };
}

export default async function AutoMerchantDetailsPage({ params }) {
    const { merchantId } = await params;
    return <AutoMerchantDetailsClient merchantId={merchantId} />;
}
