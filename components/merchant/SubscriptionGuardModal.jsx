'use client';

import { useEffect, useMemo, useState } from 'react';
import MerchantSubscriptionPayButton from './MerchantSubscriptionPayButton';
import { supabase } from '@/lib/supabaseClient';
import { validatePayerContact } from '@/lib/merchant/validatePayerContact';
import PayerContactRecoveryPanel from '@/components/payment/PayerContactRecoveryPanel';
import toast from 'react-hot-toast';

export default function SubscriptionGuardModal({ isOpen, onClose, merchantData, plans = [], isRenewal = false, featureLabel = null }) {
    const [resolvedPhone, setResolvedPhone] = useState('');
    const [resolvedEmail, setResolvedEmail] = useState('');
    const [openPrompts, setOpenPrompts] = useState({ phone: false, email: false });
    const [serverContactError, setServerContactError] = useState(null);

    const validation = useMemo(
        () => validatePayerContact({ email: resolvedEmail, phone: resolvedPhone }),
        [resolvedEmail, resolvedPhone]
    );

    useEffect(() => {
        if (isOpen && merchantData) {
            document.body.style.overflow = 'hidden';
            setResolvedPhone(merchantData.payerPhone || merchantData.user_profiles?.phone || '');
            setResolvedEmail(merchantData.payerEmail || merchantData.user_profiles?.email || '');
        } else {
            document.body.style.overflow = 'unset';
            setOpenPrompts({ phone: false, email: false });
            setServerContactError(null);
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, merchantData]);

    useEffect(() => {
        if (!isOpen) return;
        setOpenPrompts({
            phone: Boolean(validation.errors.phone),
            email: Boolean(validation.errors.email),
        });
    }, [isOpen, resolvedEmail, resolvedPhone, validation.errors.email, validation.errors.phone]);

    if (!isOpen || !merchantData) return null;

    const openInlinePrompt = (field) => {
        setOpenPrompts(prev => ({ ...prev, [field]: true }));
    };

    const handleSaveContact = async (nextValue, field) => {
        const nextValidation = validatePayerContact({
            email: field === 'email' ? nextValue : resolvedEmail,
            phone: field === 'phone' ? nextValue : resolvedPhone,
        });
        if (nextValidation.errors[field]) {
            throw new Error(nextValidation.errors[field]);
        }

        try {
            const merchantUpdates = field === 'phone'
                ? { business_phone: nextValue }
                : { business_email: nextValue };
            const profileUpdates = field === 'phone'
                ? { phone: nextValue }
                : { email: nextValue };

            const [merchantUpdate, profileUpdate] = await Promise.all([
                supabase
                    .from('merchants')
                    .update(merchantUpdates)
                    .eq('id', merchantData.id),
                supabase
                    .from('user_profiles')
                    .update(profileUpdates)
                    .eq('id', merchantData.user_id || merchantData.user_profiles?.id),
            ]);

            if (merchantUpdate.error) throw merchantUpdate.error;
            if (profileUpdate.error) throw profileUpdate.error;

            if (field === 'phone') setResolvedPhone(nextValue);
            if (field === 'email') setResolvedEmail(nextValue);
            setOpenPrompts(prev => ({ ...prev, [field]: false }));
            setServerContactError(null);
            toast.success(`${field === 'phone' ? 'Mobile number' : 'Email'} updated — ready to pay`);
        } catch (err) {
            console.error(`Error saving ${field}:`, err);
            throw err;
        }
    };

    const contactPrompt = (
        <>
            {(openPrompts.phone || serverContactError?.field === 'phone') && (
                <PayerContactRecoveryPanel
                    field="phone"
                    message={serverContactError?.field === 'phone' ? serverContactError.message : validation.errors.phone}
                    currentValue={resolvedPhone}
                    onSave={handleSaveContact}
                    profileDeepLinkBase="/merchant/profile"
                    returnPath={typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/merchant/settings'}
                    merchantContext
                />
            )}
            {(openPrompts.email || serverContactError?.field === 'email') && (
                <PayerContactRecoveryPanel
                    field="email"
                    message={serverContactError?.field === 'email' ? serverContactError.message : validation.errors.email}
                    currentValue={resolvedEmail}
                    onSave={handleSaveContact}
                    profileDeepLinkBase="/merchant/profile"
                    returnPath={typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/merchant/settings'}
                    merchantContext
                />
            )}
        </>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content - Leveraging existing Pay Button Card */}
            <div className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 rounded-3xl">
                <div className="w-full">
                    {featureLabel && (
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-t-3xl px-4 py-3 text-center">
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2">
                                <span className="material-icons-round text-base">lock</span>
                                Subscribe to enable {featureLabel}
                            </p>
                        </div>
                    )}
                    <MerchantSubscriptionPayButton
                        merchantId={merchantData.id}
                        businessName={merchantData.business_name}
                        payerName={merchantData.user_profiles?.full_name || 'Merchant User'}
                        payerEmail={resolvedEmail}
                        payerMobile={resolvedPhone}
                        isRenewal={isRenewal}
                        subscriptionExpiresAt={merchantData.subscription_expires_at}
                        plans={plans}
                        contactPrompt={contactPrompt}
                        disablePay={false}
                        onRequestInlineEdit={openInlinePrompt}
                        onServerFieldError={(field, message) => {
                            openInlinePrompt(field);
                            setServerContactError({ field, message });
                            toast.error(message);
                        }}
                        onClose={onClose}
                    />
                </div>
            </div>
        </div>
    );
}
