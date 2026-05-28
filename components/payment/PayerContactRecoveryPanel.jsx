'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, HelpCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import PayerContactHelpTooltip from '@/components/merchant/PayerContactHelpTooltip';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';
import { normalizePayerMobile } from '@/lib/merchant/payerContactRules';

const FIELD_META = {
    phone: {
        label: 'Mobile number',
        inputLabel: 'Mobile Number',
        placeholder: '10-digit mobile number',
        type: 'tel',
        focus: 'business_phone',
        profileFocus: 'phone',
        defaultMessage: 'A valid mobile number is required by the payment gateway. Add it once to continue.',
    },
    email: {
        label: 'Email address',
        inputLabel: 'Email Address',
        placeholder: 'you@example.com',
        type: 'email',
        focus: 'business_email',
        profileFocus: 'email',
        defaultMessage: 'A valid email address is required by the payment gateway. Add it once to continue.',
    },
};

export function payerContactFieldFromServer(field) {
    if (field === 'payerMobile') return 'phone';
    if (field === 'payerEmail') return 'email';
    return field === 'phone' || field === 'email' ? field : null;
}

export default function PayerContactRecoveryPanel({
    field,
    message,
    currentValue = '',
    onSave,
    profileDeepLinkBase = '/profile',
    returnPath = '',
    merchantContext = false,
}) {
    const router = useRouter();
    const normalizedField = payerContactFieldFromServer(field) || 'phone';
    const meta = FIELD_META[normalizedField] || FIELD_META.phone;
    const inputRef = useRef(null);
    const [value, setValue] = useState(currentValue || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setValue(currentValue || '');
        setError('');
    }, [currentValue, normalizedField]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [normalizedField]);

    const helperMessage = message || meta.defaultMessage;

    const profileHref = useMemo(() => {
        const params = new URLSearchParams();
        params.set('focus', merchantContext ? meta.focus : meta.profileFocus);
        if (returnPath) params.set('return', returnPath);
        return `${profileDeepLinkBase}?${params.toString()}`;
    }, [merchantContext, meta.focus, meta.profileFocus, profileDeepLinkBase, returnPath]);

    const handleInputChange = (event) => {
        const nextValue = event.target.value;
        setValue(normalizedField === 'phone' ? nextValue.replace(/\D/g, '').slice(0, 10) : nextValue);
    };

    const handleSave = async () => {
        const nextValue = normalizedField === 'phone'
            ? normalizePayerMobile(value).slice(-10)
            : String(value || '').trim();
        const validation = validatePayerContact({
            email: normalizedField === 'email' ? nextValue : 'valid@example.com',
            phone: normalizedField === 'phone' ? nextValue : '9876543210',
        });

        if (validation.errors[normalizedField]) {
            setError(validation.errors[normalizedField]);
            return;
        }

        setSaving(true);
        setError('');
        try {
            await onSave?.(nextValue, normalizedField);
            toast.success(`${meta.label} updated`);
        } catch (err) {
            console.error('[PayerContactRecoveryPanel] Save failed:', err);
            setError(err?.message || `Failed to save ${meta.label.toLowerCase()}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                    <AlertTriangle size={17} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-black">{meta.label} required</p>
                        <PayerContactHelpTooltip field={normalizedField} />
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-800 dark:text-amber-200">
                        {helperMessage}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor={`payer-contact-${normalizedField}`}>
                    {meta.inputLabel}
                </label>
                <input
                    id={`payer-contact-${normalizedField}`}
                    ref={inputRef}
                    type={meta.type}
                    value={value}
                    onChange={handleInputChange}
                    placeholder={meta.placeholder}
                    className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-amber-500/30 dark:bg-slate-950/50 dark:text-white dark:placeholder-slate-500"
                    maxLength={normalizedField === 'phone' ? 10 : undefined}
                />
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving && <Loader2 size={15} className="animate-spin" />}
                    {saving ? 'Saving...' : 'Fix Here'}
                </button>
            </div>

            {error && <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{error}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-black">
                <button
                    type="button"
                    onClick={() => router.push(profileHref)}
                    className="inline-flex items-center gap-1 text-amber-800 underline decoration-amber-400 underline-offset-2 hover:text-amber-950 dark:text-amber-200"
                >
                    Open Profile <ExternalLink size={13} />
                </button>
                <span className="inline-flex items-center gap-1 text-amber-700/80 dark:text-amber-200/80">
                    <HelpCircle size={13} />
                    Saved once, reused for future payments
                </span>
            </div>
        </div>
    );
}
