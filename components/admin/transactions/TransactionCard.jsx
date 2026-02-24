import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function TransactionCard({ txn }) {
    const isCredit = txn.type === 'Credit';
    const isSuccess = txn.status === 'Success';
    const isFailed = txn.status === 'Failed';
    const isProcessing = txn.status === 'Processing';

    return (
        <div className="group bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1 block relative overflow-hidden">
            {/* Top Status Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isSuccess ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-amber-400'
                }`} />

            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                    {/* Transaction Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                        {isCredit ? <ArrowDownLeft size={24} strokeWidth={2.5} /> : <ArrowUpRight size={24} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-lg truncate max-w-[150px] sm:max-w-[200px]">
                            {txn.amount}
                        </h3>
                        <p className="text-sm font-medium text-slate-500">
                            {isCredit ? 'Received' : 'Sent'}
                        </p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    isFailed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {isSuccess && <CheckCircle2 size={12} strokeWidth={3} />}
                    {isFailed && <XCircle size={12} strokeWidth={3} />}
                    {isProcessing && <div className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />}
                    {txn.status}
                </div>
            </div>

            {/* User Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 mb-5 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                <div>
                    <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">User</p>
                        {txn.role && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-200 text-slate-600">
                                {txn.role}
                            </span>
                        )}
                    </div>
                    <p className="font-medium text-slate-900 truncate">{txn.user}</p>
                    <p className="text-xs text-slate-500 truncate">{txn.email}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    {txn.date}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-auto">
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                    {txn.id}
                </span>
                <button className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl transition-colors hover:bg-blue-100">
                    View Receipt
                </button>
            </div>
        </div>
    );
}
