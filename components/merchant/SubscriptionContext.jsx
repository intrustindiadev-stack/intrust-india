'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import SubscriptionGuardModal from './SubscriptionGuardModal';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ isSubscribed, merchantData, plans = [], children }) {
    const [showModal, setShowModal] = useState(false);
    const pathname = usePathname();
    const isRenewal = merchantData?.subscription_status === 'active' || Boolean(merchantData?.subscription_expires_at);

    // Optionally auto-close modal on navigation
    useEffect(() => {
        const timeoutId = window.setTimeout(() => setShowModal(false), 0);
        return () => window.clearTimeout(timeoutId);
    }, [pathname]);

    const performAction = (callback) => {
        const isAdmin = merchantData?.user_profiles?.role === 'admin' || merchantData?.user_profiles?.role === 'super_admin';
        
        if (isSubscribed || isAdmin) {
            if (callback) callback();
        } else {
            setShowModal(true);
        }
    };

    return (
        <SubscriptionContext.Provider value={{ isSubscribed, showModal, setShowModal, performAction }}>
            {children}
            
            {/* The global modal that appears when a locked action is triggered */}
            <SubscriptionGuardModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)}
                merchantData={merchantData}
                isRenewal={isRenewal} 
                plans={plans}
            />
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    return useContext(SubscriptionContext);
}
