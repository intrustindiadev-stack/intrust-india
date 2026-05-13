'use client';

import { Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/contexts/ThemeContext';

const NotifyMeButton = ({ productId, inventoryId, email, variant = 'solid', className = '' }) => {
    if (!productId) {
        console.warn('[NotifyMeButton] productId is required');
        return null;
    }

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const variantClasses = {
        solid: isDark 
            ? 'bg-white text-slate-900 hover:bg-white/90' 
            : 'bg-slate-900 text-white hover:bg-slate-800',
        outline: isDark 
            ? 'border border-white/20 text-white bg-transparent hover:bg-white/[0.06]' 
            : 'border border-slate-900 text-slate-900 bg-white hover:bg-slate-50'
    };

    const handleNotify = async () => {
        if (!email) {
            toast.error("Please login to request restock alerts");
            return;
        }

        try {
            const res = await fetch('/api/notify/restock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId, inventory_id: inventoryId, email })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "We'll email you when this is back in stock");
            } else {
                toast.error(data.error || "Failed to set alert");
            }
        } catch (err) {
            console.error('[NotifyMe] Error:', err);
            toast.error("Something went wrong");
        }
    };

    return (
        <button
            onClick={handleNotify}
            className={`w-full h-9 md:h-10 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${variantClasses[variant] || variantClasses.solid} ${className}`}
        >
            <Bell size={14} strokeWidth={2.5} />
            <span>Notify Me</span>
        </button>
    );
};

export default NotifyMeButton;
