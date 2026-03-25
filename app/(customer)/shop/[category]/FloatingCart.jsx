'use client';

import { useState } from 'react';
import { ShoppingCart, Loader2, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function FloatingCart({ count, total, savings, items, customer, onClear, primaryColor = '#3b82f6', secondaryColor = '#4f46e5' }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return (
        <div className="fixed bottom-[92px] md:bottom-0 left-0 w-full z-40 animate-in slide-in-from-bottom-5 px-4 md:px-0">
            <div 
                className="text-white px-4 py-3 md:px-6 md:py-4 flex items-center justify-between rounded-2xl md:rounded-none transition-all duration-300"
                style={{ 
                    background: isDark ? `linear-gradient(135deg, ${primaryColor}EE, ${secondaryColor}EE)` : primaryColor,
                    boxShadow: `0 8px 32px ${primaryColor}40`,
                    backdropFilter: 'blur(12px)'
                }}
            >
                {/* Cart Info */}
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg relative" style={{ backgroundColor: `${secondaryColor}40` }}>
                        <ShoppingCart size={20} />
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[10px] font-black flex items-center justify-center shadow-sm" style={{ color: primaryColor }}>
                            {count}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium opacity-80" style={{ color: 'white' }}>
                            {count} item{count !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black tracking-tight leading-none text-white shadow-sm mt-0.5">
                                ₹{((total || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </span>
                            {savings > 0 && (
                                <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                    Save ₹{(savings / 100).toLocaleString('en-IN')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Checkout CTA */}
                <button 
                    onClick={() => router.push('/shop/cart')}
                    className="bg-white hover:bg-opacity-90 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg"
                    style={{ color: primaryColor }}
                >
                    View Cart
                    <ChevronRight size={16} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
