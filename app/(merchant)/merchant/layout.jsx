import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';

export default function MerchantRootLayout({ children }) {
    return (
        <>
            <MerchantLayout>{children}</MerchantLayout>
            <MerchantBottomNav />
        </>
    );
}
