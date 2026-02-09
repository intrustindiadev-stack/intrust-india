import AdminLayout from '@/components/layout/admin/AdminLayout';
import AdminBottomNav from '@/components/layout/admin/AdminBottomNav';

export default function AdminRootLayout({ children }) {
    return (
        <>
            <AdminLayout>{children}</AdminLayout>
            <AdminBottomNav />
        </>
    );
}
