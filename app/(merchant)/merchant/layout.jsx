import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';

export default async function MerchantRootLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    // 1. Check User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Check Role
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role;
    const allowedRoles = ['merchant'];

    if (!allowedRoles.includes(role)) {
        // Send admins to the admin panel, everyone else to home
        if (role === 'admin') {
            redirect('/admin');
        }
        redirect('/'); // Unauthorized
    }

    // 3. Check Merchant Status
    const { data: merchant } = await supabase
        .from('merchants')
        .select('status')
        .eq('user_id', user.id)
        .single();

    if (!merchant) {
        redirect('/merchant-apply');
    }

    if (merchant.status === 'pending') {
        redirect('/merchant-status/pending');
    }
    if (merchant.status === 'rejected') {
        redirect('/merchant-status/rejected');
    }
    if (merchant.status === 'suspended') {
        redirect('/merchant-status/suspended');
    }
    if (merchant.status !== 'approved' && !['pending', 'rejected', 'suspended'].includes(merchant.status)) {
        redirect('/merchant-apply');
    }

    // 4. Render Layout (Authorized)
    return (
        <>
            <MerchantLayout>{children}</MerchantLayout>
            <MerchantBottomNav />
        </>
    );
}
