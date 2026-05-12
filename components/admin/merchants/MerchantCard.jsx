'use client';

import { CheckCircle, XCircle, Clock, Building2, Phone, Mail, FileText, AlertCircle, Eye, ShieldOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function MerchantCard({ merchant, udhariEnabled, onApprove, onReject, onVerifyBank, onToggleSuspend, isApproving, isVerifyingBank, isRejecting, isTogglingSuspend, href }) {
    const isPending = merchant.status === 'pending';
    const isApproved = merchant.status === 'approved';
    const isSuspended = merchant.status === 'suspended';
    const { autoModeStatus, autoModeValidUntil } = merchant;

    return (
        <div className={`group bg-white rounded-[2rem] border shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl relative overflow-hidden flex flex-col h-full ${isPending ? 'border-amber-200 hover:shadow-amber-200/20' : isSuspended ? 'border-orange-200 hover:shadow-orange-200/20' : isApproved ? 'border-slate-200 hover:shadow-blue-200/20' : 'border-slate-200'}`}>
            {/* Top Indicator Line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isPending ? 'bg-amber-500' : isApproved ? 'bg-emerald-500' : isSuspended ? 'bg-orange-500' : 'bg-red-500'}`} />

            {/* Link wrapper for the clickable body */}
            <Link href={href || `/admin/merchants/${merchant.id}`} className="p-6 flex-1 flex flex-col cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            {merchant.avatarUrl ? (
                                <img
                                    src={merchant.avatarUrl}
                                    alt={merchant.businessName}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                    className={`w-14 h-14 rounded-2xl object-cover shadow-md ${isPending ? 'border-2 border-amber-200' : isSuspended ? 'border-2 border-orange-200' : 'border-2 border-blue-100'}`}
                                />
                            ) : null}
                            <div 
                                style={{ display: merchant.avatarUrl ? 'none' : 'flex' }}
                                className={`w-14 h-14 rounded-2xl items-center justify-center font-black text-xl shadow-inner ${isPending ? 'bg-amber-50 text-amber-600 border border-amber-100' : isSuspended ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}
                            >
                                {merchant.businessName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate text-lg">
                                {merchant.businessName}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-wide uppercase">{merchant.ownerName}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="p-2.5 bg-slate-50 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-slate-100">
                            <Eye size={16} strokeWidth={3} />
                        </div>
                    </div>
                </div>

                {/* Badges Section */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {udhariEnabled !== undefined && (
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${udhariEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200 opacity-60'}`}>
                            {udhariEnabled ? 'Store Credit: ON' : 'Store Credit: OFF'}
                        </div>
                    )}
                    {merchant.autoModeStatus === 'active' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-sm shadow-emerald-100">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider">Auto Mode</span>
                        </div>
                    )}
                    {isApproved && (
                        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${merchant.subscriptionStatus === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100' : 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm shadow-rose-100'}`}>
                            Sub: {merchant.subscriptionStatus || 'unpaid'}
                        </div>
                    )}
                </div>

                {/* Contact Details */}
                <div className="space-y-3 mb-4 flex-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:shadow-md group-hover:shadow-blue-500/10 transition-all border border-slate-100">
                            <Phone size={14} strokeWidth={2.5} />
                        </div>
                        <span className={!merchant.phone ? 'text-slate-300' : ''}>{merchant.phone || 'Phone N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:shadow-md group-hover:shadow-emerald-500/10 transition-all border border-slate-100">
                            <Mail size={14} strokeWidth={2.5} />
                        </div>
                        <span className={`truncate ${!merchant.email ? 'text-slate-300' : ''}`}>{merchant.email || 'Email N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:shadow-md group-hover:shadow-amber-500/10 transition-all border border-slate-100">
                            <FileText size={14} strokeWidth={2.5} />
                        </div>
                        <span className={`font-mono text-[10px] tracking-wider uppercase bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm ${!merchant.gstNumber ? 'text-slate-300 italic' : 'text-slate-500'}`}>
                            {merchant.gstNumber || 'GST N/A'}
                        </span>
                    </div>
                </div>
            </Link>

            {/* Actions Footer */}
            <div className={`px-5 py-4 border-t transition-colors ${isPending ? 'border-amber-100 bg-amber-50/30' : isSuspended ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100 bg-slate-50/50 group-hover:bg-white'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                        <Clock size={12} className={isPending ? "text-amber-500" : isSuspended ? "text-orange-500" : "text-slate-400"} strokeWidth={2.5} />
                        <span>{merchant.appliedDate}</span>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 justify-end flex-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all ${isPending
                            ? 'bg-white text-amber-700 border-amber-200'
                            : isApproved
                                ? 'bg-emerald-500 text-white border-emerald-400'
                                : isSuspended
                                    ? 'bg-orange-500 text-white border-orange-400'
                                    : 'bg-red-500 text-white border-red-400'
                            }`}>
                            {merchant.status}
                        </span>

                        {/* Pending Actions */}
                        {isPending && onApprove && onReject && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReject(merchant.id, merchant.userId); }}
                                    disabled={isRejecting === merchant.id || isApproving === merchant.id}
                                    className={`p-2 rounded-xl transition-all shadow-sm active:scale-90 ${isRejecting === merchant.id ? 'bg-red-100 text-red-600' : 'bg-white text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200'}`}
                                >
                                    {isRejecting === merchant.id ? (
                                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <XCircle size={18} strokeWidth={2.5} />
                                    )}
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onApprove(merchant.id, merchant.userId); }}
                                    disabled={isApproving === merchant.id || isRejecting === merchant.id}
                                    className={`p-2 rounded-xl transition-all shadow-sm active:scale-90 ${isApproving === merchant.id ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-emerald-500 hover:text-emerald-700 border border-emerald-100 hover:border-emerald-200'}`}
                                >
                                    {isApproving === merchant.id ? (
                                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <CheckCircle size={18} strokeWidth={2.5} />
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Suspend/Unsuspend Action */}
                        {(isApproved || isSuspended) && onToggleSuspend && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSuspend(merchant.id, merchant.userId, merchant.status); }}
                                disabled={isTogglingSuspend === merchant.id}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-2xl transition-all shadow-md active:scale-95 disabled:opacity-50 ${isSuspended
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                                    : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 shadow-orange-500/10'
                                    }`}
                            >
                                {isTogglingSuspend === merchant.id
                                    ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    : isSuspended
                                        ? <ShieldCheck size={14} strokeWidth={3} />
                                        : <ShieldOff size={14} strokeWidth={3} />}
                                {isSuspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                        )}

                        {/* Bank Verification */}
                        {isApproved && merchant.hasBankData && !merchant.bankVerified && onVerifyBank && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onVerifyBank(merchant.id); }}
                                disabled={isVerifyingBank === merchant.id}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-50"
                            >
                                {isVerifyingBank === merchant.id
                                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    : <CheckCircle size={14} strokeWidth={3} />}
                                Verify Bank
                            </button>
                        )}

                        {isApproved && merchant.bankVerified && (
                            <div className="flex items-center gap-2 text-xs font-black text-emerald-600 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner">
                                <CheckCircle size={14} strokeWidth={3} /> Bank Verified
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
