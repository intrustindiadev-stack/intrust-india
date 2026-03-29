'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { Clock, ShieldCheck, CreditCard, ChevronRight, AlertCircle, Loader2, Copy, CheckCircle2, Eye, EyeOff, Info, Calendar, Lock, Smartphone, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ShopOrderCreditCard from '@/components/customer/store-credits/ShopOrderCreditCard';
import { RequestTimeline, UdhariStatusBadge } from '@/components/customer/store-credits/UdhariSharedComponents';

export default function StoreCreditsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('approved');
    const [requests, setRequests] = useState([]);
    const [shopRequests, setShopRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        if (user) {
            fetchRequests();
        }
    }, [user, authLoading, activeTab]);

    async function fetchRequests() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = new URL('/api/udhari/list', window.location.origin);
            url.searchParams.append('role', 'customer');
            
            const res = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const filtered = data.requests.filter(req => {
                if (activeTab === 'pending') return req.status === 'pending';
                if (activeTab === 'approved') return req.status === 'approved';
                return ['completed', 'denied', 'expired', 'cancelled'].includes(req.status);
            });

            setRequests(filtered.filter(r => r.source_type !== 'shop_order'));
        } catch (error) {
            console.error('Error fetching udhari:', error);
            toast.error('Failed to load store credits');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        fetchShopRequests();
    }, [user, activeTab]);

    async function fetchShopRequests() {
        try {
            let query = supabase
                .from('udhari_requests')
                .select(`
                    *,
                    shopping_order_group:shopping_order_group_id (
                        id,
                        total_amount_paise,
                        shopping_order_items (
                            id,
                            quantity,
                            shopping_products (
                                id,
                                title,
                                image_url
                            )
                        )
                    )
                `)
                .eq('customer_id', user.id)
                .eq('source_type', 'shop_order')
                .order('requested_at', { ascending: false });

            if (activeTab === 'pending') query = query.eq('status', 'pending');
            else if (activeTab === 'approved') query = query.eq('status', 'approved');
            else query = query.in('status', ['completed', 'denied', 'expired', 'cancelled']);

            const { data, error } = await query;
            if (error) throw error;
            setShopRequests(data || []);
        } catch (err) {
            console.error('Error fetching shop udhari:', err);
        }
    }

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        toast.success("Coupon code copied!");
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handlePay = async (requestId, paymentMethod = 'wallet') => {
        setPayingId(requestId);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (paymentMethod === 'wallet') {
                // Wallet payment — deducted from InTrust wallet balance
                const res = await fetch('/api/udhari/pay', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ requestId })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                toast.success('Payment successful!');
                fetchRequests();
                fetchShopRequests();

            } else if (paymentMethod === 'sabpaisa') {
                // SabPaisa gateway — UPI, Card, Net Banking, etc.
                const res = await fetch('/api/udhari/pay-sabpaisa', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({ requestId })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                // Redirect to SabPaisa payment gateway via POST form
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = data.paymentUrl;
                form.innerHTML = `
                    <input type="hidden" name="encData" value="${data.encData}" />
                    <input type="hidden" name="clientCode" value="${data.clientCode}" />
                `;
                document.body.appendChild(form);
                form.submit();
                // Don't setPayingId(null) — page will redirect away
                return;
            }
        } catch (error) {
            toast.error(error.message || 'Payment failed');
            if (error.message?.includes('Insufficient wallet balance') || error.message?.includes('insufficient_balance')) {
                router.push('/wallet');
            }
        } finally {
            setPayingId(null);
        }
    };

    if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-outfit">
            <Navbar />

            <div className="flex-1 pt-24 pb-28 px-4 sm:px-6 max-w-4xl mx-auto w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Store Credits</h1>
                            <p className="text-sm text-gray-500 font-medium">Manage your "Pay Later" purchases</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-white/80 backdrop-blur-md rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-8 sticky top-24 z-10">
                    {[
                        { id: 'approved', label: 'Active', icon: CheckCircle2 },
                        { id: 'pending', label: 'Pending', icon: Clock },
                        { id: 'history', label: 'History', icon: Calendar }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                                activeTab === tab.id
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 size={32} className="animate-spin mb-4 text-amber-500" />
                            <p className="font-medium">Fetching your records...</p>
                        </div>
                    ) : (requests.length === 0 && shopRequests.length === 0) ? (
                        <NoRequests activeTab={activeTab} onBrowse={() => router.push('/shop')} onBrowseGiftCards={() => router.push('/gift-cards')} />
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {/* Shop Order Credit Cards */}
                            {shopRequests.map((req) => (
                                <ShopOrderCreditCard
                                    key={`shop-${req.id}`}
                                    req={req}
                                    payingId={payingId}
                                    onPaySuccess={fetchShopRequests}
                                />
                            ))}
                            {/* Gift Card Udhari Cards */}
                            {requests.map((req) => (
                                <UdhariCard 
                                    key={req.id} 
                                    req={req} 
                                    onPay={handlePay} 
                                    payingId={payingId}
                                    onCopy={handleCopyCode}
                                    copiedCode={copiedCode}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
            
            <CustomerBottomNav />
        </div>
    );
}

function UdhariCard({ req, onPay, payingId, onCopy, copiedCode }) {
    const isApproved = req.status === 'approved';
    const isPending = req.status === 'pending';
    
    // Add local state for completed coupon reveal
    const [decryptedCode, setDecryptedCode] = useState(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    const handleRevealCode = async () => {
        if (decryptedCode) {
            setDecryptedCode(null);
            return;
        }
        
        setIsDecrypting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/my-coupons/${req.coupon?.id}/decrypt`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDecryptedCode(data.code);
        } catch (error) {
            toast.error(error.message || 'Failed to decrypt code');
        } finally {
            setIsDecrypting(false);
        }
    };

    // Deadline calculation
    const daysLeft = req.due_date ? Math.ceil((new Date(req.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = daysLeft !== null && daysLeft < 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
        >
            <div className="p-5 sm:p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Gift Card Visual */}
                    <div className="relative w-full md:w-48 h-32 md:h-auto rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 group-hover:border-amber-200 transition-colors">
                        {req.coupon?.image_url ? (
                            <Image src={req.coupon.image_url} alt="Brand" fill className="object-contain p-4 scale-110 group-hover:scale-125 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-white text-4xl">
                                {req.coupon?.brand?.charAt(0)}
                            </div>
                        )}
                        <div className="absolute top-2 right-2">
                            <UdhariStatusBadge status={req.status} daysLeft={daysLeft} />
                        </div>
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {req.coupon?.brand}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    Req: {new Date(req.requested_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-1 leading-tight group-hover:text-amber-600 transition-colors">
                                {req.coupon?.title}
                            </h3>
                            <div className="flex items-center gap-4 mt-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Principal</span>
                                    <span className="text-lg font-black text-gray-900">₹{(req.amount_paise / 100).toFixed(0)}</span>
                                </div>
                                <div className="h-8 w-[1px] bg-gray-100" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Convenience Fee</span>
                                    <span className="text-lg font-black text-gray-900 text-amber-600">₹{((req.amount_paise * 0.03) / 100).toFixed(0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <RequestTimeline status={req.status} />
                    </div>

                    {/* Right: Actions */}
                    <div className="md:w-64 flex flex-col gap-3 justify-center pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-100">
                        {isApproved && (
                            <>
                                <div className="space-y-2 mb-3">
                                    {/* Primary: Wallet payment */}
                                    <button
                                        onClick={() => onPay(req.id, 'wallet')}
                                        disabled={payingId === req.id}
                                        className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 shadow-xl ${
                                            isOverdue
                                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                                                : 'bg-gray-900 hover:bg-black text-white shadow-gray-200'
                                        }`}
                                    >
                                        {payingId === req.id ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                                        PAY WITH WALLET
                                    </button>

                                    {/* Secondary: SabPaisa (UPI / Card) */}
                                    <button
                                        onClick={() => onPay(req.id, 'sabpaisa')}
                                        disabled={payingId === req.id}
                                        className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                    >
                                        {payingId === req.id ? <Loader2 size={18} className="animate-spin" /> : <Smartphone size={18} />}
                                        PAY WITH UPI / CARD
                                    </button>
                                </div>

                                {/* Inline coupon reveal for approved coupons */}
                                <div className={`relative rounded-2xl p-4 transition-all duration-300 mb-4 ${
                                    decryptedCode ? 'bg-amber-50 border-2 border-dashed border-amber-300' : 'bg-gray-50 border border-gray-100'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Coupon Code</span>
                                        <button
                                            onClick={handleRevealCode}
                                            disabled={isDecrypting}
                                            className="text-gray-400 hover:text-amber-600 transition-colors flex items-center gap-1 text-[10px] font-bold"
                                        >
                                            {isDecrypting ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : decryptedCode ? (
                                                <><EyeOff size={14} /> HIDE</>
                                            ) : (
                                                <><Eye size={14} /> REVEAL CODE</>
                                            )}
                                        </button>
                                    </div>

                                    {decryptedCode ? (
                                        <div className="flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
                                            <span className="font-mono font-black text-xl text-gray-900 tracking-wider">
                                                {decryptedCode}
                                            </span>
                                            <button
                                                onClick={() => onCopy(decryptedCode)}
                                                className="p-2 bg-white rounded-xl shadow-sm text-amber-600 hover:scale-110 transition-transform"
                                            >
                                                {copiedCode === decryptedCode ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center p-1">
                                            <span className="font-mono font-bold text-gray-300 tracking-[0.3em]">••••••••</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-start gap-2 text-[10px] text-gray-400 leading-tight px-1 mb-2">
                                    <Info size={12} className="shrink-0 mt-0.5" />
                                    <span>Payment must be made by {new Date(req.due_date).toLocaleDateString()} to avoid account restriction.</span>
                                </div>
                            </>
                        )}

                        {isPending && (
                            <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    className="mb-3 text-amber-500"
                                >
                                    <Clock size={32} />
                                </motion.div>
                                <p className="text-sm font-black text-gray-900">Review in Progress</p>
                                <p className="text-[10px] text-gray-500 text-center mt-2 px-4 leading-relaxed">
                                    Merchant is reviewing your request. This usually takes 2-4 business hours.
                                </p>
                            </div>
                        )}

                        {!isApproved && !isPending && (
                            <div className="flex flex-col flex-1 pb-4">
                                <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-2xl mb-3">
                                    <span className="text-xs font-black uppercase text-gray-400">{req.status}</span>
                                    {req.status === 'completed' && req.completed_at && (
                                        <span className="text-[10px] text-green-600 font-bold mt-1 uppercase tracking-tight">Paid on {new Date(req.completed_at).toLocaleDateString()}</span>
                                    )}
                                </div>
                                {req.status === 'completed' && (
                                    <div className={`relative rounded-2xl p-4 transition-all duration-300 ${decryptedCode ? 'bg-amber-50 border-2 border-dashed border-amber-300' : 'bg-gray-50 border border-gray-100'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Coupon Code</span>
                                            <button 
                                                onClick={handleRevealCode}
                                                disabled={isDecrypting}
                                                className="text-gray-400 hover:text-amber-600 transition-colors"
                                            >
                                                {isDecrypting ? <Loader2 size={16} className="animate-spin" /> : (decryptedCode ? <EyeOff size={16} /> : <Eye size={16} />)}
                                            </button>
                                        </div>
                                        
                                        {decryptedCode ? (
                                            <div className="flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
                                                <span className="font-mono font-black text-xl text-gray-900 tracking-wider">
                                                    {decryptedCode}
                                                </span>
                                                <button 
                                                    onClick={() => onCopy(decryptedCode)}
                                                    className="p-2 bg-white rounded-xl shadow-sm text-amber-600 hover:scale-110 transition-transform"
                                                >
                                                    {copiedCode === decryptedCode ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center p-2">
                                                <span className="font-mono font-bold text-gray-300 tracking-[0.3em]">••••••••</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function NoRequests({ activeTab, onBrowse, onBrowseGiftCards }) {
    const config = {
        approved: { title: "No Active Credits", desc: "Browse gift cards or the shop to get your first store credit!" },
        pending: { title: "No Pending Requests", desc: "Requests sent to merchants will appear here for tracking." },
        history: { title: "History is Empty", desc: "Once you settle or complete requests, they'll show up here." }
    };
    const { title, desc } = config[activeTab] || config.approved;

    return (
        <div className="bg-white rounded-[40px] p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <Clock size={48} className="text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3">{title}</h3>
            <p className="text-gray-500 max-w-xs mx-auto font-medium mb-8 leading-relaxed">
                {desc}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={onBrowse}
                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-gray-200 text-sm tracking-widest"
                >
                    SHOP PRODUCTS
                </button>
                {onBrowseGiftCards && (
                    <button
                        onClick={onBrowseGiftCards}
                        className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black hover:bg-amber-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-200 text-sm tracking-widest"
                    >
                        GIFT CARDS
                    </button>
                )}
            </div>
        </div>
    );
}
