import { ArrowDownLeft, ArrowUpRight, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function WalletTransactionList({ transactions, loading }) {
    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading transactions...</div>;
    }

    if (!transactions || transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Clock size={48} className="mb-4 opacity-50" />
                <p>No transactions yet</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Transaction History</h3>
                <button className="text-gray-400 hover:text-blue-600 transition-colors">
                    <RefreshCw size={16} />
                </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {transactions.map((txn) => (
                    <div key={txn.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                ${txn.transaction_type === 'CREDIT'
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}
                            `}>
                                {txn.transaction_type === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {txn.description || (txn.transaction_type === 'CREDIT' ? 'Money Added' : 'Payment')}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {format(new Date(txn.created_at), 'MMM dd, yyyy • hh:mm a')}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${txn.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-gray-900 dark:text-white'
                                }`}>
                                {txn.transaction_type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-400">
                                Bal: ₹{txn.balance_after.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
