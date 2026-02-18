import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';

export default async function MerchantRootLayout({ children }) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

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
    const allowedRoles = ['merchant', 'admin'];

    if (!allowedRoles.includes(role)) {
        redirect('/'); // Unauthorized
    }

    // 3. Check Merchant Status (if not admin)
    if (role === 'merchant') {
        const { data: merchant } = await supabase
            .from('merchants')
            .select('status')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            redirect('/merchant-apply');
        }

        if (merchant.status === 'pending') redirect('/merchant/pending');
        if (merchant.status === 'rejected') redirect('/merchant/rejected');
        if (merchant.status === 'suspended') redirect('/merchant/suspended');
        if (merchant.status !== 'approved') redirect('/merchant-apply');
    }

    // 4. Render Layout (Authorized)
    return (
        <>
            <MerchantLayout>{children}</MerchantLayout>
            <MerchantBottomNav />
        </>
    );
}
