import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminReviewsModeration from '@/components/admin/shopping/AdminReviewsModeration';
import Link from 'next/link';
import { ArrowLeft, Star, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminShoppingReviewsPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
        redirect('/admin');
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/admin/shopping"
                    className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            Product Reviews Moderation
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                            <ShieldCheck size={12} /> Admin
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Audit, publish, and moderate customer ratings and UGC across the InTrust platform.
                    </p>
                </div>
            </div>

            <AdminReviewsModeration />
        </div>
    );
}
