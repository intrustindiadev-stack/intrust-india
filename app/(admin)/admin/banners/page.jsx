import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import BannersClient from './BannersClient';

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
    const supabase = await createServerSupabaseClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        redirect('/');
    }

    // Fetch existing banners
    const { data: banners, error } = await supabase
        .from('platform_banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <BannersClient initialBanners={banners || []} />
        </div>
    );
}
