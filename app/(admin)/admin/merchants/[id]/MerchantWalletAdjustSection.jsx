'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import WalletAdjustModal from '@/components/admin/WalletAdjustModal';

/**
 * MerchantWalletAdjustSection — Client component for merchant wallet adjustments.
 * Renders an "Adjust Wallet" button that opens the modal.
 *
 * @param {object} props
 * @param {string} props.merchantUserId - The merchant's user UUID (for wallet operations)
 * @param {string} props.merchantId - The merchant row ID (for reference)
 * @param {number} props.initialBalance - Balance in rupees
 * @param {string[]} props.adminPermissions
 */
export default function MerchantWalletAdjustSection({ merchantUserId, merchantId, initialBalance, adminPermissions = [] }) {
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    const handleClose = (actionTaken) => {
        setShowModal(false);
        if (actionTaken) {
            router.refresh();
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 bg-amber-500 text-white text-[10px] font-black rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] uppercase tracking-widest text-center flex items-center justify-center gap-2"
            >
                <Settings2 size={14} />
                Adjust Wallet
            </button>

            {showModal && (
                <WalletAdjustModal
                    userId={merchantUserId}
                    walletType="merchant"
                    currentBalance={initialBalance}
                    onClose={handleClose}
                    adminPermissions={adminPermissions}
                />
            )}
        </>
    );
}
