'use client';

import { useState } from 'react';
import { ShoppingCart, Loader2, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function FloatingCart({ count, total, items, customer, onClear, primaryColor = '#3b82f6', secondaryColor = '#4f46e5' }) {
    const router = useRouter();
    const [isCheckout, setIsCheckout] = useState(false);

    const handleCheckout = async () => {
        if (!customer) {
            toast.error('Please login to checkout');
            router.push('/login');
            return;
        }

        if (customer.wallet_balance_paise < total) {
            toast.error('Insufficient wallet balance');
            return;
        }

        setIsCheckout(true);
        try {
            const checkoutItems = items.map(item => ({
                inventory_id: item.is_platform_direct ? null : item.id,
                product_id: item.product_id,
                quantity: item.quantity,
                is_platform: !!item.is_platform_direct
            }));

            // Create client inside to ensure it uses the latest session
            const { createClient } = await import('@/lib/supabaseClient');
            const supabase = createClient();

            const { data, error } = await supabase.rpc('customer_bulk_purchase_v2', {
                p_items: checkoutItems,
                p_customer_id: customer.id
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.message);

            toast.success('Order placed successfully!');
            onClear();
            router.push('/shop/orders'); // Redirect to orders after success
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error(error.message || 'Checkout failed');
        } finally {
            setIsCheckout(false);
        }
    };

    return (
        <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg transition-all duration-500 animate-in fade-in slide-in-from-bottom-10">
            <div className={`relative bg-slate-900 text-white p-3 md:p-4 pr-3 pl-6 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-slate-900/40 border border-white/10 backdrop-blur-2xl overflow-hidden`}>
                {/* Background Accent */}
                <div 
                    className="absolute inset-0 opacity-10" 
                    style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                />
                
                <div 
                    onClick={() => router.push('/shop/cart')}
                    className="flex items-center gap-3 md:gap-5 relative z-10 cursor-pointer group/info flex-1"
                >
                    <div className="relative group/cart">
                        <div 
                            className="absolute inset-0 opacity-20 blur-xl group-hover/info:opacity-60 transition-opacity" 
                            style={{ background: primaryColor }}
                        />
                        <div className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 border border-white/10 group-hover/info:bg-white/20 transition-colors">
                            <ShoppingCart size={22} className="text-white group-hover/info:scale-110 transition-transform" />
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-950 shadow-lg">
                                {count}
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 group-hover/info:text-white transition-colors">View Cart</p>
                        <p className="text-base md:text-xl font-black tracking-tight leading-none group-hover/info:translate-x-1 transition-transform">
                            ₹{((total || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2 relative z-10">
                    <button 
                        onClick={onClear}
                        className="p-2 md:p-3 text-slate-500 hover:text-white transition-colors"
                    >
                       <X size={18} />
                    </button>
                    <button 
                        onClick={handleCheckout}
                        disabled={isCheckout}
                        className={`bg-white text-slate-900 hover:bg-slate-100 px-5 md:px-8 py-2.5 md:py-4 rounded-xl md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.1em] flex items-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50`}
                    >
                        {isCheckout ? <Loader2 className="animate-spin" size={16} /> : 'Pay Now'}
                        {!isCheckout && <ChevronRight size={14} strokeWidth={4} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
