import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

export function useWallet() {
    const [balance, setBalance] = useState({ balance: 0, currency: 'INR' });
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);

    // Helper to get auth headers
    const getAuthHeaders = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session?.access_token) {
                console.warn('[useWallet] No active session');
                return null;
            }
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            };
        } catch (error) {
            console.error('[useWallet] Failed to get session:', error);
            return null;
        }
    };

    // Fetch balance
    const fetchBalance = useCallback(async () => {
        try {
            const headers = await getAuthHeaders();
            if (!headers) {
                console.warn('[useWallet] Cannot fetch balance - not authenticated');
                setBalance({ balance: 0, currency: 'INR' });
                setLoading(false);
                return;
            }

            const res = await fetch('/api/wallet/balance', { headers });
            if (res.ok) {
                const data = await res.json();
                setBalance(data.wallet || { balance: 0, currency: 'INR' });
            } else {
                console.error('Failed to fetch balance:', res.status);
                setBalance({ balance: 0, currency: 'INR' });
            }
        } catch (error) {
            console.error('Failed to fetch wallet balance', error);
            setBalance({ balance: 0, currency: 'INR' });
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch transactions
    const fetchTransactions = useCallback(async (limit = 10, offset = 0) => {
        try {
            setTransactionsLoading(true);
            const headers = await getAuthHeaders();
            if (!headers) {
                console.warn('[useWallet] Cannot fetch transactions - not authenticated');
                setTransactions({ transactions: [], total: 0 });
                return;
            }

            const res = await fetch(`/api/wallet/transactions?limit=${limit}&offset=${offset}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTransactions(data); // { transactions: [], total: 0 }
            }
        } catch (error) {
            console.error('Failed to fetch wallet transactions', error);
            toast.error('Failed to load wallet history');
        } finally {
            setTransactionsLoading(false);
        }
    }, []);

    // Debit Wallet (for purchases)
    const debitWallet = async (amount, referenceId, referenceType, description) => {
        try {
            const headers = await getAuthHeaders();
            if (!headers) {
                throw new Error('Please log in to continue');
            }

            const res = await fetch('/api/wallet/debit', {
                method: 'POST',
                headers,
                body: JSON.stringify({ amount, referenceId, referenceType, description })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Wallet debit failed');
            }

            // Refresh balance
            await fetchBalance();
            return data;
        } catch (error) {
            console.error('Debit Error:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return {
        balance,
        loading,
        transactions,
        transactionsLoading,
        fetchBalance,
        fetchTransactions,
        debitWallet
    };
}
