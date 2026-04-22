/**
 * Groups transactions by identical timestamp and description.
 * Useful for summarizing multiple items from the same order/cart.
 */
export const groupTransactions = (transactions) => {
    if (!transactions || !Array.isArray(transactions)) return [];

    const grouped = transactions.reduce((acc, tx) => {
        // Grouping key: Timestamp + Description (Matches legacy logic in wallet page)
        const key = `${tx.created_at}_${tx.description}`;

        if (!acc[key]) {
            acc[key] = {
                ...tx,
                amount: Number(tx.amount || 0),
                _count: 1,
                _txIds: [tx.id]
            };
        } else {
            acc[key].amount += Number(tx.amount || 0);
            acc[key]._count += 1;
            acc[key]._txIds.push(tx.id);
        }
        return acc;
    }, {});

    return Object.values(grouped)
        .map(tx => ({
            ...tx,
            // If grouped multiple items, prefix ID with 'cart-' to trigger detail page aggregation
            id: tx._count > 1 ? `cart-${tx.id}` : tx.id
        }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

/**
 * Formats a transaction date for display.
 */
export const formatTransactionDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};
