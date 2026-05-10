import { createServerSupabaseClient }   from '@/lib/supabaseServer';
import { redirect }                       from 'next/navigation';
import { RewardsRealtimeProvider }        from '@/lib/contexts/RewardsRealtimeContext';
import GlobalScratchCardPopup             from '@/components/rewards/GlobalScratchCardPopupLoader';

export default async function ProtectedCustomerLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    let user = null;
    try {
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );
        const { data } = await Promise.race([getUserPromise, timeoutPromise]);
        user = data?.user;
    } catch (error) {
        redirect('/login');
    }

    if (!user) {
        redirect('/login');
    }

    // Role-based redirection is already handled in the parent (customer) layout
    // This layout specifically enforces session presence for protected routes
    //
    // RewardsRealtimeProvider is mounted here so every protected customer page
    // shares a single Supabase realtime channel and unscratched-card list.
    // The bottom-nav badge and the rewards page both consume this context.
    return (
        <RewardsRealtimeProvider>
            {children}
            <GlobalScratchCardPopup />
        </RewardsRealtimeProvider>
    );
}
