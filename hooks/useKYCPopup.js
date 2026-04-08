'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'kyc_popup_dismissed';

/**
 * useKYCPopup
 * - Provides { isOpen, openKYC, closeKYC }
 * - Auto-triggers after 5–10 seconds if kycStatus is not 'verified'
 * - Fires only once per browser session (uses sessionStorage)
 *
 * Usage:
 *   const { isOpen, openKYC, closeKYC } = useKYCPopup({ kycStatus: profile?.kyc_status, enabled: !!user });
 */
export function useKYCPopup({ kycStatus = null, enabled = false } = {}) {
    const [isOpen, setIsOpen] = useState(false);

    const openKYC = useCallback(() => setIsOpen(true), []);
    const closeKYC = useCallback(() => {
        setIsOpen(false);
        // Mark as dismissed for this session
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
    }, []);

    useEffect(() => {
        if (!enabled) return;
        // Don't show if already verified
        if (kycStatus === 'verified') return;
        // Don't show if already dismissed this session
        try {
            if (sessionStorage.getItem(SESSION_KEY)) return;
        } catch (_) {}

        // Random delay between 5 and 10 seconds
        const delay = Math.floor(Math.random() * 5000) + 5000;
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [enabled, kycStatus]);

    return { isOpen, openKYC, closeKYC };
}
