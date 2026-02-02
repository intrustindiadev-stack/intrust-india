import VendorLayout from '@/components/layout/vendor/VendorLayout';
import VendorBottomNav from '@/components/layout/vendor/VendorBottomNav';

export default function VendorRootLayout({ children }) {
    return (
        <>
            <VendorLayout>{children}</VendorLayout>
            <VendorBottomNav />
        </>
    );
}
