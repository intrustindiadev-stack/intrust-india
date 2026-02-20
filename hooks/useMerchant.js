import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useMerchant() {
    const [merchant, setMerchant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const fetchMerchant = async () => {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setLoading(false);
                    return;
                }

                // Check role
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                const isUserAdmin = profile?.role === 'admin';
                setIsAdmin(isUserAdmin);

                if (isUserAdmin) {
                    // 1. Try to fetch own merchant first
                    const { data: ownMerchant, error: ownMerchantError } = await supabase
                        .from('merchants')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    if (ownMerchant) {
                        setMerchant(ownMerchant);
                    } else {
                        // 2. Fallback: Fetch most recent merchant for debug/admin view
                        const { data, error: merchantError } = await supabase
                            .from('merchants')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .limit(1);

                        if (merchantError) throw merchantError;
                        setMerchant(data?.[0] || null);
                    }
                } else {
                    // Merchant: Fetch own record
                    const { data, error: merchantError } = await supabase
                        .from('merchants')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();

                    if (merchantError && merchantError.code !== 'PGRST116') {
                        throw merchantError;
                    }
                    setMerchant(data || null);
                }

            } catch (err) {
                console.error('[useMerchant] Error fetching merchant:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMerchant();
    }, []);

    // Debug log
    useEffect(() => {
        if (!loading) console.log('[useMerchant] State:', { merchant, isAdmin, loading, error });
    }, [loading, merchant, isAdmin, error]);

    return { merchant, loading, error, isAdmin };
}
