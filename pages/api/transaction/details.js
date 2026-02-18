import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'Missing transaction ID' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Use user-scoped client so RLS (auth.uid() = user_id) is satisfied
    const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        // Try by UUID first, then by client_txn_id
        let transaction = null;

        // Try UUID match
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) {
            const { data } = await userClient
                .from('transactions')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();
            transaction = data;
        }

        // Try client_txn_id match if not found by UUID
        if (!transaction) {
            const { data } = await userClient
                .from('transactions')
                .select('*')
                .eq('client_txn_id', id)
                .eq('user_id', user.id)
                .single();
            transaction = data;
        }

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json({ transaction });
    } catch (error) {
        console.error('Fetch Details Error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction details' });
    }
}
