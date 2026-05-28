'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import SubscriptionGuardModal from './SubscriptionGuardModal';
import { OPERATIONS_FEATURES } from '@/lib/merchant/featureGates';

const SubscriptionContext = createContext();
const contextLoadedAt = Date.now();

/**
 * Provides subscription context.
 * @param {Object} props
 * @param {boolean} props.isSubscribed
 * @param {Object} props.merchantData - The merchant object, containing profile info and resolved payerEmail, payerPhone
 * @param {Array} props.plans
 * @param {React.ReactNode} props.children
 */
export function SubscriptionProvider({ isSubscribed, merchantData, plans = [], children }) {
    const [showModal, setShowModal] = useState(false);
    const [pendingFeatureLabel, setPendingFeatureLabel] = useState(null);
    const pathname = usePathname();

    const isRenewal = merchantData?.subscription_status === 'active' || Boolean(merchantData?.subscription_expires_at);

    // Derived subscription metadata
    const subscriptionStatus = merchantData?.subscription_status || null;
    const expiresAt = merchantData?.subscription_expires_at || null;
    const isAdmin = merchantData?.user_profiles?.role === 'admin' || merchantData?.user_profiles?.role === 'super_admin';

    const daysUntilExpiry = (() => {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt).getTime() - contextLoadedAt;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    })();

    // Auto-close modal on navigation
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setShowModal(false);
            setPendingFeatureLabel(null);
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [pathname]);

    /**
     * Opens the subscription guard modal with an optional feature-specific label.
     * Used by UI surfaces (sidebar, settings tabs) to prompt subscription.
     */
    const requireSubscription = useCallback((featureLabel) => {
        if (isSubscribed || isAdmin) return; // Already has access
        setPendingFeatureLabel(featureLabel || null);
        setShowModal(true);
    }, [isAdmin, isSubscribed]);

    /**
     * Returns true if the feature is locked for the current user.
     * Admins always bypass; subscribed users always have access.
     */
    const isFeatureLocked = useCallback((featureKey) => {
        if (isSubscribed || isAdmin) return false;
        return featureKey in OPERATIONS_FEATURES;
    }, [isAdmin, isSubscribed]);

    /**
     * Backward-compatible action guard.
     * Calls the callback if the user has access, otherwise opens the modal.
     */
    const performAction = useCallback((callback) => {
        if (isSubscribed || isAdmin) {
            if (callback) callback();
        } else {
            setShowModal(true);
        }
    }, [isAdmin, isSubscribed]);

    return (
        <SubscriptionContext.Provider value={{
            isSubscribed,
            isAdmin,
            subscriptionStatus,
            expiresAt,
            daysUntilExpiry,
            showModal,
            setShowModal,
            performAction,
            requireSubscription,
            isFeatureLocked,
            pendingFeatureLabel,
            merchantData,
            plans,
        }}>
            {children}
            
            {/* The global modal that appears when a locked action is triggered */}
            <SubscriptionGuardModal 
                isOpen={showModal} 
                onClose={() => {
                    setShowModal(false);
                    setPendingFeatureLabel(null);
                }}
                merchantData={merchantData}
                isRenewal={isRenewal} 
                plans={plans}
                featureLabel={pendingFeatureLabel}
            />
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    return useContext(SubscriptionContext);
}
