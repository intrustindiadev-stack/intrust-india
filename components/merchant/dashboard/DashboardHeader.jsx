'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LiveButton from '@/components/merchant/LiveButton';
import StoreStatusToggle from '@/components/merchant/StoreStatusToggle';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Plus, ArrowUpRight, ArrowDownRight, Zap, TrendingUp } from 'lucide-react';
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
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/80 shadow-sm border border-slate-200/60 dark:border-white/10 p-5 md:p-8 mb-8 backdrop-blur-md">
          {/* Decorative Ambient Blobs for Premium Light & Dark Theme */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-100/50 dark:bg-blue-950/20 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 -mb-20 w-80 h-80 rounded-full bg-purple-100/40 dark:bg-purple-950/20 blur-3xl pointer-events-none"></div>
          <div className="absolute top-10 left-1/3 w-72 h-72 rounded-full bg-amber-50/60 dark:bg-amber-950/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col gap-6 lg:gap-8">
        
            {/* ── TOP TIER: Greeting, Identity & Operational Status ── */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Greeting & Identity */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <Link href="/merchant/profile" className="w-12 h-12 shrink-0 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden hover:scale-105 transition-transform cursor-pointer mt-0.5 sm:mt-0">
                      {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                          <span className="material-icons-round text-slate-400 text-2xl">storefront</span>
                      )}
                  </Link>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
                      Good {getTimeGreeting()}, <span className="text-slate-600 dark:text-slate-300">{merchant.business_name || 'Merchant'}</span>
                    </h1>

                    {/* Plan Status Badges */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <button
                          onClick={() => router.push('/merchant/subscription')}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border hover:opacity-80 transition-opacity ${
                            planTier === 'pro' 
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-sm' 
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                      >
                        {planName}
                      </button>
                      
                      {daysLeft !== null && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              expiryColor === 'expired'
                                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 shadow-sm'
                                  : expiryColor === 'urgent'
                                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 shadow-sm animate-pulse'
                                      : daysLeft <= 30
                                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 shadow-sm'
                                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                              {daysLeft <= 0
                                  ? 'Plan Expired'
                                  : `Ends in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`}
                          </span>
                      )}
                    </div>
                  </div>
              </div>

              {/* Operational Status & Toggles */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap shrink-0">
                {/* Store Status Group */}
                <div className="flex items-center gap-3 sm:gap-4 p-1.5 sm:p-2 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs">
                  <LiveButton />
                  <div className="flex items-center pl-1 pr-2">
                    <StoreStatusToggle initialStoreData={merchant} compact={true} />
                  </div>
                </div>
                
                {/* AI Actions Group */}
                <div className="flex items-center gap-3 sm:gap-4 p-1.5 sm:p-2 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs">
                  {/* AI Orders Button */}
                  <button
                    onClick={() => router.push('/merchant/ai-orders')}
                    className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-sm"
                  >
                    <Zap className="w-4 h-4" />
                    AI Orders
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black shadow-sm ring-2 ring-white dark:ring-slate-900">
                      1
                    </span>
                  </button>
                  
                  {/* AI Grow Button (Clean & Green) */}
                  <button
                    onClick={() => setIsAIGrowModalOpen(true)}
                    className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm"
                  >
                    <TrendingUp className="w-4 h-4" />
                    AI Grow
                  </button>
                </div>
              </div>
            </div>

            {/* ── BOTTOM TIER: Portfolio Balance & Primary Action Buttons ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4 border-t border-slate-100/80 dark:border-slate-800/80">
              {/* Portfolio Balance */}
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Portfolio Balance</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {!showBalance ? '••••••' : formatCurrency(animatedRevenue)}
                  </span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 p-2 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-100 shadow-sm"
                    aria-label={!showBalance ? 'Show balance' : 'Hide balance'}
                  >
                    {!showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/merchant/shopping/wholesale"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_4px_14px_0_rgba(79,70,229,0.25)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.15)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Add Stock
                </Link>
                <Link
                  href="/merchant/wallet"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw
                </Link>
              </div>
            </div>
          </div>
          <AIGrowModal isOpen={isAIGrowModalOpen} onClose={() => setIsAIGrowModalOpen(false)} />
        </div>
    );
}
