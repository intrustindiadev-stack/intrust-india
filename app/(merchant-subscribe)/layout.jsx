import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function MerchantSubscribeLayout({ children }) {
    const supabase = await createServerSupabaseClient();
    
    // Require authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {children}
        </div>
    );
}
