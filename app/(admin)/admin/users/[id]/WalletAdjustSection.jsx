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
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all shadow-lg group active:scale-[0.98]"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
                        <Settings2 size={20} className="group-hover:rotate-45 transition-transform duration-500" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-white tracking-wide">Adjust Balance</p>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Credit or Debit Funds</p>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-all group-hover:translate-x-1 duration-300">
                    <span className="font-serif text-lg leading-none mb-0.5 opacity-80">→</span>
                </div>
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
