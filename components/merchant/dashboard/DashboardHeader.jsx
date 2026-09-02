'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LiveButton from '@/components/merchant/LiveButton';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import AIGrowModal from './AIGrowModal';

/* === STEP 0: AUDIT ===
   STATE VARIABLES: 
   - [showBalance, setShowBalance]: Toggles balance visibility
   - [animatedRevenue, setAnimatedRevenue]: Animates the balance text
   - [isAIGrowModalOpen, setIsAIGrowModalOpen]: Toggles AI Grow modal

   FUNCTIONS:
   - setShowBalance(!showBalance)
   - setIsAIGrowModalOpen(true)
   
   EXTERNAL COMPONENTS:
   - <StoreStatusToggle> (handles LIVE/OFFLINE state)
   - <LiveButton> (preserved, though original was alongside toggle, we'll keep StoreStatusToggle)
   - <AIGrowModal>
   
   LINKS:
   - /merchant/profile
   - /merchant/subscription
   - /merchant/shopping/wholesale (Add Stock)
   - /merchant/wallet (Withdraw)
*/

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

function getPlanBadgeStyles(tier) {
  switch (tier?.toLowerCase()) {
    case 'enterprise': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'pro': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export default function DashboardHeader({ merchant, profile, walletBalancePaise }) {
    const router = useRouter();
    const [showBalance, setShowBalance] = useState(false);
    const [animatedRevenue, setAnimatedRevenue] = useState(0);
    const [isAIGrowModalOpen, setIsAIGrowModalOpen] = useState(false);

    // Subscription expiry countdown
    const expiryDate = merchant?.subscription_expires_at ? new Date(merchant.subscription_expires_at) : null;
    const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const showExpiryBanner = daysLeft !== null && daysLeft <= 30;
    const expiryColor = daysLeft <= 0 ? 'expired' : daysLeft <= 7 ? 'urgent' : 'warning';

    useEffect(() => {
        if (showBalance) {
            let startTimestamp = null;
            const duration = 800; // ms
            const target = walletBalancePaise / 100;

            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 4);

                setAnimatedRevenue(target * easeProgress);

                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setAnimatedRevenue(target);
                }
            };
            window.requestAnimationFrame(step);
        } else {
            setAnimatedRevenue(0);
        }
    }, [showBalance, walletBalancePaise]);

    const planName = merchant?.subscription_status === 'active' ? 'Pro' : 'Free';
    const planTier = merchant?.subscription_status === 'active' ? 'pro' : 'free';

    return (
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-200/60 p-5 md:p-8 mb-8">
          {/* Decorative Ambient Blobs for Premium Light Theme */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-purple-100/40 blur-3xl pointer-events-none"></div>
          <div className="absolute top-10 left-1/3 w-72 h-72 rounded-full bg-amber-50/60 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-8">
        
            {/* ── LEFT: Greeting, Plan, Balance ── */}
            <div className="flex-1 min-w-0">
              {/* Greeting */}
              <div className="flex items-center gap-3.5">
                  <Link href="/merchant/profile" className="w-12 h-12 shrink-0 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                      {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                          <span className="material-icons-round text-slate-400 text-2xl">storefront</span>
                      )}
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate tracking-tight">
                    Good {getTimeGreeting()}, <span className="text-slate-600">{merchant.business_name || 'Merchant'}</span>
                  </h1>
              </div>
        
              {/* Plan Status Badge */}
              <div className="mt-3 flex items-center gap-2 pl-[3.75rem]">
                <button
                    onClick={() => router.push('/merchant/subscription')}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border hover:opacity-80 transition-opacity ${
                      planTier === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                >
                  {planName}
                </button>
                
                {daysLeft !== null && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        expiryColor === 'expired'
                            ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                            : expiryColor === 'urgent'
                                ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse'
                                : daysLeft <= 30
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}>
                        {daysLeft <= 0
                            ? 'Plan Expired'
                            : `Ends in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`}
                    </span>
                )}
              </div>
        
              {/* Portfolio Balance */}
              <div className="mt-8 pl-1">
                <p className="text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Portfolio Balance</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {!showBalance ? '••••••' : formatCurrency(animatedRevenue)}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-slate-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 p-2 rounded-xl border border-slate-100 hover:border-blue-100 shadow-sm"
                    aria-label={!showBalance ? 'Show balance' : 'Hide balance'}
                  >
                    {!showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
        
            {/* ── RIGHT: Actions & Toggles ── */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-4 flex-shrink-0">
        
              {/* Primary Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  href="/merchant/shopping/wholesale"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.15)] hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  Add Stock
                </Link>
                <Link
                  href="/merchant/wallet"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-white text-slate-700 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm hover:-translate-y-0.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw
                </Link>
              </div>
        
              {/* Operational Toggles */}
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start mt-2 sm:mt-0 p-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                <LiveButton />
                
                <div className="flex items-center pl-1 pr-2 border-r border-slate-200">
                  <StoreStatusToggle initialStoreData={merchant} compact={true} />
                </div>
        
                {/* AI Grow Button */}
                <button
                  onClick={() => setIsAIGrowModalOpen(true)}
                  className="relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 text-orange-600 text-xs font-bold hover:from-amber-100 hover:to-orange-100 transition-all shadow-sm group"
                >
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  AI Grow
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black shadow-sm ring-2 ring-white animate-pulse">
                    3
                  </span>
                </button>
              </div>
            </div>
          </div>
          <AIGrowModal isOpen={isAIGrowModalOpen} onClose={() => setIsAIGrowModalOpen(false)} />
        </div>
    );
}
