'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'merchant_apply_popup_dismissed';

/**
 * useMerchantApplyPopup
 * - Provides { isOpen, openMerchantPopup, closeMerchantPopup }
 * - Auto-triggers after a delay if merchantStatus is not present
 * - Fires only once per browser session (uses sessionStorage)
 *
 * Usage:
 *   const { isOpen, closeMerchantPopup } = useMerchantApplyPopup({ merchantStatus: userData.merchantStatus, enabled: !loading && !!user, delay: 15000 });
 */
export function useMerchantApplyPopup({ merchantStatus = null, enabled = false, delayMs = 12000 } = {}) {
    const [isOpen, setIsOpen] = useState(false);

    const openMerchantPopup = useCallback(() => setIsOpen(true), []);
    const closeMerchantPopup = useCallback(() => {
        setIsOpen(false);
        // Mark as dismissed for this session
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
    }, []);

    useEffect(() => {
        if (!enabled) return;
        
        // Don't show if they already have a merchant status (pending, approved, etc.)
        if (merchantStatus) return;
        
        // Don't show if already dismissed this session
        try {
            if (sessionStorage.getItem(SESSION_KEY)) return;
        } catch (_) {}

        // Add a slight randomization to the delay
        const randomizedDelay = delayMs + Math.floor(Math.random() * 3000);
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, randomizedDelay);

        return () => clearTimeout(timer);
    }, [enabled, merchantStatus, delayMs]);

    return { isOpen, openMerchantPopup, closeMerchantPopup };
}
