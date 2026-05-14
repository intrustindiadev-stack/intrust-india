'use client';

import { useEffect } from 'react';
import MerchantSubscriptionPayButton from './MerchantSubscriptionPayButton';

export default function SubscriptionGuardModal({ isOpen, onClose, merchantData, plans = [], isRenewal = false }) {
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
                    {(!merchantData.user_profiles?.email || !merchantData.user_profiles?.phone) ? (
                        <div className="bg-white p-6 rounded-2xl shadow-xl text-center space-y-4">
                            <h3 className="text-xl font-bold text-slate-800">Complete Your Profile</h3>
                            <p className="text-slate-600 text-sm">Please complete your profile with a valid email and phone number before subscribing.</p>
                            <a href="/merchant/profile" className="inline-block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                                Go to Profile
                            </a>
                        </div>
                    ) : (
                        <MerchantSubscriptionPayButton
                            merchantId={merchantData.id}
                            businessName={merchantData.business_name}
                            payerName={merchantData.user_profiles?.full_name || 'Merchant User'}
                            payerEmail={merchantData.user_profiles?.email}
                            payerMobile={merchantData.user_profiles?.phone}
                            isRenewal={isRenewal}
                            subscriptionExpiresAt={merchantData.subscription_expires_at}
                            plans={plans}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
