'use client';

import { useEffect } from 'react';
import MerchantSubscriptionPayButton from './MerchantSubscriptionPayButton';

export default function SubscriptionGuardModal({ isOpen, onClose, merchantData, isRenewal = false }) {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !merchantData) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content - Leveraging existing Pay Button Card */}
            <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute -top-12 right-0 md:-right-12 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-colors"
                >
                    <span className="material-icons-round">close</span>
                </button>

                <div className="w-full">
                    <MerchantSubscriptionPayButton
                        merchantId={merchantData.id}
                        businessName={merchantData.business_name}
                        payerName={merchantData.user_profiles?.full_name || 'Merchant User'}
                        payerEmail={merchantData.user_profiles?.email || 'merchant@example.com'}
                        payerMobile={merchantData.user_profiles?.phone || '9999999999'}
                        isRenewal={isRenewal}
                        subscriptionExpiresAt={merchantData.subscription_expires_at}
                    />
                </div>
            </div>
        </div>
    );
}
