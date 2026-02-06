'use client';

import { Zap } from 'lucide-react';

export default function CheckoutButton({ amount, onClick, disabled = false }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full py-3.5 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
            <Zap size={18} />
            <span>Pay ₹{amount}</span>
        </button>
    );
}
