'use client';

import { CheckCircle, XCircle, Clock, Building2, Phone, Mail, FileText, AlertCircle, Eye } from 'lucide-react';
import Link from 'next/link';

export default function MerchantCard({ merchant, onApprove, onReject, onVerifyBank, isApproving, isVerifyingBank }) {
    const isPending = merchant.status === 'pending';
    const isApproved = merchant.status === 'approved';

    return (
        <div className={`group bg-white rounded-3xl border shadow-sm transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col h-full ${isPending ? 'border-amber-200 hover:shadow-xl hover:shadow-amber-200/50' : 'border-slate-200 hover:shadow-xl hover:shadow-slate-200/50'}`}>
            {/* Top Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isPending ? 'bg-amber-500' : isApproved ? 'bg-emerald-500' : 'bg-red-500'}`} />

            {/* Link wrapper for the clickable body */}
            <Link href={`/admin/merchants/${merchant.id}`} className="p-6 flex-1 flex flex-col cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-sm ${isPending ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                            {merchant.businessName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[150px] sm:max-w-[200px]">
                                {merchant.businessName}
                            </h3>
                            <p className="text-sm font-bold text-slate-400 mt-0.5">{merchant.ownerName}</p>
                        </div>
                    </div>
                    <div className="p-2 bg-slate-50 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 rounded-xl transition-all shadow-sm">
                        <Eye size={18} strokeWidth={2.5} />
                    </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-3 mb-2 flex-1">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors border border-slate-100">
                            <Phone size={14} strokeWidth={2.5} />
                        </div>
                        <span>{merchant.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 transition-colors border border-slate-100">
                            <Mail size={14} strokeWidth={2.5} />
                        </div>
                        <span className="truncate">{merchant.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-50 transition-colors border border-slate-100">
                            <FileText size={14} strokeWidth={2.5} />
                        </div>
                        <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{merchant.gstNumber}</span>
                    </div>
                </div>
            </Link>

            {/* Actions Footer */}
            <div className={`px-6 py-4 flex items-center justify-between border-t ${isPending ? 'border-amber-100 bg-amber-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    <Clock size={12} className={isPending ? "text-amber-500" : "text-slate-400"} />
                    <span>{merchant.appliedDate}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border transition-colors ${isPending
                        ? 'bg-white text-amber-700 border-amber-200'
                        : isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {merchant.status}
                    </span>

                    {/* Pending Actions */}
                    {isPending && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReject(merchant.id); }}
                                disabled={isApproving === merchant.id}
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <XCircle size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onApprove(merchant.id, merchant.userId); }}
                                disabled={isApproving === merchant.id}
                                className={`p-1.5 rounded-lg transition-all ${isApproving === merchant.id ? 'bg-emerald-50 text-emerald-600' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
                            >
                                {isApproving === merchant.id ? (
                                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CheckCircle size={18} strokeWidth={2.5} />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Bank Verification */}
                    {isApproved && merchant.hasBankData && !merchant.bankVerified && (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVerifyBank(merchant.id); }}
                            disabled={isVerifyingBank === merchant.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 ml-2 text-[10px] font-extrabold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl transition-all shadow-sm"
                        >
                            {isVerifyingBank === merchant.id
                                ? <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                                : <CheckCircle size={12} strokeWidth={3} />}
                            Verify Bank
                        </button>
                    )}

                    {isApproved && merchant.bankVerified && (
                        <span className="flex items-center gap-1.5 ml-2 text-[10px] font-extrabold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 shadow-inner">
                            <CheckCircle size={10} strokeWidth={3} /> Verified
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
