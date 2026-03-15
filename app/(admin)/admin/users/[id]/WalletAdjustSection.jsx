'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2 } from 'lucide-react';
import WalletAdjustModal from '@/components/admin/WalletAdjustModal';

/**
 * WalletAdjustSection — Client component for customer wallet adjustments.
 * Renders an "Adjust Wallet" button that opens the modal.
 *
 * @param {object} props
 * @param {string} props.userId
 * @param {number} props.initialBalance - Balance in rupees
 * @param {string[]} props.adminPermissions
 */
export default function WalletAdjustSection({ userId, initialBalance, adminPermissions = [] }) {
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
                <Settings2 size={14} />
                Adjust Wallet
            </button>

            {showModal && (
                <WalletAdjustModal
                    userId={userId}
                    walletType="customer"
                    currentBalance={initialBalance}
                    onClose={handleClose}
                    adminPermissions={adminPermissions}
                />
            )}
        </>
    );
}
