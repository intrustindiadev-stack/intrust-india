'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UserCheck, Store, CheckCircle2, ExternalLink, X,
    AlertCircle, Loader2, Phone, Mail, Building2, ShieldCheck,
    User, RefreshCw, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// ─── KYC badge helper ────────────────────────────────────────────────────────
const KYC_BADGE = {
    verified:    { label: 'KYC Verified',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending:     { label: 'KYC Pending',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    rejected:    { label: 'KYC Rejected',    cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    not_started: { label: 'KYC Not Started', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const KycBadge = ({ status }) => {
    const cfg = KYC_BADGE[status] || KYC_BADGE.not_started;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${cfg.cls}`}>
            <ShieldCheck size={10} />
            {cfg.label}
        </span>
    );
};

// ─── Merchant status badge ───────────────────────────────────────────────────
const MERCHANT_STATUS_BADGE = {
    approved:  { label: 'Approved',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    rejected:  { label: 'Rejected',  cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    suspended: { label: 'Suspended', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const MerchantStatusBadge = ({ status }) => {
    const cfg = MERCHANT_STATUS_BADGE[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
};

// ─── Check Result Modal ──────────────────────────────────────────────────────
function ConversionModal({ type, leadId, onClose, onSuccess }) {
    const [phase, setPhase]       = useState('idle');   // idle | checking | found | not_found | confirming | done
    const [entity, setEntity]     = useState(null);
    const [existingLeadsInfo, setExistingLeadsInfo] = useState(null);
    const [notFoundMsg, setNotFoundMsg] = useState('');
    const [converting, setConverting] = useState(false);

    const isCustomer = type === 'customer';

    const handleCheck = useCallback(async () => {
        setPhase('checking');
        try {
            const res = await fetch(`/api/crm/leads/${leadId}/conversion-check?type=${type}`);
            const data = await res.json();

            if (!res.ok || data.error) {
                toast.error(data.error || 'Check failed');
                setPhase('idle');
                return;
            }

            if (data.found) {
                setEntity(data.entity);
                setExistingLeadsInfo(data.existing_leads_info || null);
                setPhase('found');
            } else {
                setNotFoundMsg(data.message || '');
                setPhase('not_found');
            }
        } catch (err) {
            toast.error(err.message);
            setPhase('idle');
        }
    }, [leadId, type]);

    const handleConvert = useCallback(async () => {
        if (!entity?.id) return;
        setConverting(true);
        try {
            const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, target_id: entity.id }),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                toast.error(data.error || 'Conversion failed');
                return;
            }

            toast.success(isCustomer ? 'Lead linked to customer ✓' : 'Lead linked to merchant ✓');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setConverting(false);
        }
    }, [entity, leadId, type, isCustomer, onSuccess, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
            >
                {/* Header */}
                <div className={`p-6 pb-0 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isCustomer ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {isCustomer ? <UserCheck size={20} /> : <Store size={20} />}
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 dark:text-white">
                                Convert to {isCustomer ? 'Customer' : 'Merchant'}
                            </h3>
                            <p className="text-xs text-gray-400 font-medium">Link to an existing InTrust account</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* IDLE: trigger check */}
                    {phase === 'idle' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                This will search for an existing InTrust{' '}
                                <strong>{isCustomer ? 'customer account' : 'merchant account'}</strong>{' '}
                                matching this lead's phone or email.
                            </p>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                    <AlertCircle size={14} /> No account will be created automatically
                                </p>
                            </div>
                            <button
                                onClick={handleCheck}
                                className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 ${isCustomer ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'}`}
                            >
                                Check for Existing {isCustomer ? 'Customer' : 'Merchant'}
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* CHECKING: spinner */}
                    {phase === 'checking' && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 size={32} className="animate-spin text-indigo-400" />
                            <p className="text-sm font-bold text-gray-500">Searching for matching account…</p>
                        </div>
                    )}

                    {/* FOUND: show entity preview */}
                    {phase === 'found' && entity && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    {isCustomer ? 'Customer' : 'Merchant'} Account Found
                                </p>
                            </div>

                            {/* Entity card */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                                {isCustomer ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-black text-sm">
                                                {entity.full_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{entity.full_name}</p>
                                                <KycBadge status={entity.kyc_status} />
                                            </div>
                                        </div>
                                        {entity.phone && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                <Phone size={12} className="text-gray-400" />
                                                {entity.phone}
                                            </div>
                                        )}
                                        {entity.email && !entity.email.includes('@phone.intrust.internal') && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                <Mail size={12} className="text-gray-400" />
                                                {entity.email}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 font-black text-sm">
                                                {entity.business_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{entity.business_name}</p>
                                                <MerchantStatusBadge status={entity.status} />
                                            </div>
                                        </div>
                                        {entity.owner_name && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                <User size={12} className="text-gray-400" />
                                                {entity.owner_name}
                                            </div>
                                        )}
                                        {entity.business_phone && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                <Phone size={12} className="text-gray-400" />
                                                {entity.business_phone}
                                            </div>
                                        )}
                                        {entity.business_email && (
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                <Mail size={12} className="text-gray-400" />
                                                {entity.business_email}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Existing CRM History warning */}
                            {existingLeadsInfo && existingLeadsInfo.count > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                                        <AlertCircle size={16} className="shrink-0" />
                                        Existing CRM history found
                                    </div>
                                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                                        This {isCustomer ? 'customer' : 'merchant'} is already associated with {existingLeadsInfo.count} previous lead(s).
                                    </p>
                                    
                                    <ul className="space-y-1.5 pt-1">
                                        {existingLeadsInfo.recent_leads.map((l, i) => (
                                            <li key={i} className="text-xs font-medium flex items-center gap-2 text-amber-800 dark:text-amber-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                Lead #{l.id.split('-')[0]} — <span className="uppercase text-[10px] bg-amber-200/50 dark:bg-amber-800/50 px-1.5 py-0.5 rounded-md">{l.status}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 pt-1">
                                        This lead can still be converted.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPhase('idle')}
                                    className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} /> Re-check
                                </button>
                                <button
                                    onClick={handleConvert}
                                    disabled={converting}
                                    className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isCustomer ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    {converting
                                        ? <><Loader2 size={16} className="animate-spin" /> Linking…</>
                                        : <><CheckCircle2 size={16} /> Link &amp; Convert</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* NOT FOUND */}
                    {phase === 'not_found' && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-2xl p-4">
                                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">
                                        {isCustomer ? 'Customer' : 'Merchant'} Account Not Found
                                    </p>
                                    <p className="text-xs text-rose-600/80 dark:text-rose-300/70 mt-1 leading-relaxed">
                                        {notFoundMsg || (isCustomer
                                            ? 'The customer must have an InTrust account before this lead can be converted.'
                                            : 'Please complete merchant onboarding before converting this lead.'
                                        )}
                                    </p>
                                    <p className="text-xs text-rose-600/60 dark:text-rose-300/50 mt-2 italic">
                                        No account will be created automatically.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Conversion Badge (post-conversion display) ──────────────────────────────
function ConversionBadge({ type, lead }) {
    const isCustomer = type === 'customer';

    const name = isCustomer
        ? lead._converted_customer?.full_name
        : lead._converted_merchant?.business_name;

    const viewHref = isCustomer
        ? `/admin/users/${lead.converted_user_id}`
        : `/admin/merchants/${lead.converted_merchant_id}`;

    const converterName = lead._converted_by?.full_name || 'CRM Agent';
    const convertedAt   = lead.converted_at ? format(new Date(lead.converted_at), 'MMM d, yyyy') : '—';

    return (
        <div className={`rounded-2xl border p-4 ${isCustomer ? 'bg-indigo-50/60 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/40' : 'bg-emerald-50/60 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'}`}>
            <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className={isCustomer ? 'text-indigo-500' : 'text-emerald-500'} />
                <p className={`text-xs font-black uppercase tracking-widest ${isCustomer ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    Converted to {isCustomer ? 'Customer' : 'Merchant'}
                </p>
            </div>
            <div className="space-y-1.5">
                {name && (
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                        {isCustomer ? <UserCheck size={14} className="inline mr-1.5 opacity-60" /> : <Building2 size={14} className="inline mr-1.5 opacity-60" />}
                        {name}
                    </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Converted <span className="font-bold">{convertedAt}</span> by <span className="font-bold">{converterName}</span>
                </p>
            </div>
            <Link
                href={viewHref}
                className={`mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold transition-colors ${isCustomer ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
                View {isCustomer ? 'Customer' : 'Merchant'} <ExternalLink size={12} />
            </Link>
        </div>
    );
}

// ─── Main Panel Component ────────────────────────────────────────────────────

/**
 * LeadConversionPanel
 *
 * Renders:
 *   - For active (unconverted) leads: action buttons to convert to customer/merchant.
 *   - For converted leads: read-only badges showing the linked entity with navigation.
 *   - For leads converted to both: both badges.
 *
 * Props:
 *   lead        — the crm_leads row (must include lifecycle_status, converted_user_id,
 *                  converted_merchant_id, converted_at, converted_by,
 *                  _converted_customer, _converted_merchant, _converted_by fields if joined)
 *   profile     — current user's user_profiles row (for role-based button visibility)
 *   onRefresh   — callback to re-fetch lead data after conversion
 */
export default function LeadConversionPanel({ lead, profile, onRefresh }) {
    const [activeModal, setActiveModal] = useState(null); // null | 'customer' | 'merchant'

    if (!lead) return null;

    const lifecycleStatus  = lead.lifecycle_status || 'active';
    const isArchived       = !!lead.archived_at;
    const isConverted      = lifecycleStatus !== 'active' && lifecycleStatus !== 'lost';
    const hasCustomer      = !!lead.converted_user_id;
    const hasMerchant      = !!lead.converted_merchant_id;

    // Roles that can perform conversion
    const canConvert = profile && [
        'relationship_exec', 'relationship_manager', 'admin', 'super_admin'
    ].includes(profile.role);

    // Exec scope: only show buttons for their own leads
    const isExec = profile?.role === 'relationship_exec';
    const isOwnLead = lead.assigned_to === profile?.id;
    const execCanConvert = !isExec || isOwnLead;

    const showCustomerBtn  = canConvert && execCanConvert && !hasCustomer && !isArchived;
    const showMerchantBtn  = canConvert && execCanConvert && !hasMerchant && !isArchived;
    const showAnything     = hasCustomer || hasMerchant || showCustomerBtn || showMerchantBtn;

    if (!showAnything) return null;

    return (
        <>
            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-gray-700 p-5 shadow-xl shadow-slate-200/10 space-y-4">
                <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} /> CRM Conversion
                </p>

                {/* Existing conversion badges */}
                {hasCustomer && (
                    <ConversionBadge type="customer" lead={lead} />
                )}
                {hasMerchant && (
                    <ConversionBadge type="merchant" lead={lead} />
                )}

                {/* Action buttons for unconverted slots */}
                {(showCustomerBtn || showMerchantBtn) && (
                    <div className={`${hasCustomer || hasMerchant ? 'pt-2 border-t border-gray-100 dark:border-gray-700' : ''} space-y-2`}>
                        {!hasCustomer && !hasMerchant && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                Link this lead to an existing InTrust account to track the conversion.
                            </p>
                        )}
                        {showCustomerBtn && (
                            <button
                                onClick={() => setActiveModal('customer')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-indigo-500/20"
                            >
                                <UserCheck size={16} /> Convert to Customer
                            </button>
                        )}
                        {showMerchantBtn && (
                            <button
                                onClick={() => setActiveModal('merchant')}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                            >
                                <Store size={16} /> Convert to Merchant
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {activeModal && (
                    <ConversionModal
                        type={activeModal}
                        leadId={lead.id}
                        onClose={() => setActiveModal(null)}
                        onSuccess={() => {
                            setActiveModal(null);
                            onRefresh();
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
