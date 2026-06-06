'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getPayerContact } from '@/lib/merchant/getPayerContact';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';

export function usePayerContact({ requireMerchant = false } = {}) {
    const [authUser, setAuthUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [merchant, setMerchant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) {
                setAuthUser(null);
                setProfile(null);
                setMerchant(null);
                return;
            }

            setAuthUser(user);

            const [{ data: profileData, error: profileError }, merchantResult] = await Promise.all([
                supabase
                    .from('user_profiles')
                    .select('id, full_name, email, phone')
                    .eq('id', user.id)
                    .maybeSingle(),
                requireMerchant
                    ? supabase
                        .from('merchants')
                        .select('id, user_id, business_name, business_email, business_phone')
                        .eq('user_id', user.id)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
            ]);

            if (profileError) throw profileError;
            if (merchantResult.error) throw merchantResult.error;

            setProfile(profileData || null);
            setMerchant(merchantResult.data || null);
        } catch (err) {
            console.error('[usePayerContact] Failed to load payer contact:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [requireMerchant]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return useMemo(() => {
        const { payerEmail, payerPhone, source } = getPayerContact({
            merchant,
            profile,
            authUser,
        });
        const validation = validatePayerContact({ email: payerEmail, phone: payerPhone });
        const payerName =
            profile?.full_name ||
            profile?.name ||
            authUser?.user_metadata?.full_name ||
            merchant?.business_name ||
            authUser?.email ||
            'User';

        return {
            payerEmail,
            payerPhone,
            payerName,
            source,
            validation,
            loading,
            error,
            refresh,
            authUser,
            profile,
            merchant,
        };
    }, [authUser, error, loading, merchant, profile, refresh]);
}
