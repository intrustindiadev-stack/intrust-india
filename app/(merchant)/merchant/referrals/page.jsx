import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getMerchantReferralData } from './actions';
import ReferralCodeCard from '@/components/merchant/ReferralCodeCard';
import EnterReferralCodeSection from '@/components/merchant/EnterReferralCodeSection';
import { Network, Users, Calendar, Coins, Gift, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'My Network | Merchant Panel',
};

// Use the same status color logic as MerchantSidebar for consistency
function getStatusBadge(status) {
    let bg = 'bg-gray-500/20';
    let text = 'text-gray-400';
    let border = 'border-gray-500/50';

    switch (status) {
        case 'approved':
            bg = 'bg-green-500/20';
            text = 'text-green-400';
            border = 'border-green-500/50';
            break;
        case 'pending':
            bg = 'bg-yellow-500/20';
            text = 'text-yellow-400';
            border = 'border-yellow-500/50';
            break;
        case 'suspended':
            bg = 'bg-red-500/20';
            text = 'text-red-400';
            border = 'border-red-500/50';
            break;
        case 'rejected':
            bg = 'bg-gray-500/20';
            text = 'text-gray-400';
            border = 'border-gray-500/50';
            break;
    }

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${bg} ${text} ${border}`}>
            {status}
        </span>
    );
}

export default async function MerchantReferralsPage() {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect('/login');
    }

    // Get merchant ID
    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchant) {
        // If not a merchant, they shouldn't be here
        redirect('/merchant-apply');
    }

    const { referralCode, hasReferrer, directReferrals, prizeHistory, chainDepth } = await getMerchantReferralData(merchant.id);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-24 lg:pb-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Network className="text-[#D4AF37]" size={32} />
                        My Network
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Grow your network and earn cash prizes for successful referrals.
                    </p>
                </div>
            </div>

            {/* Promotional Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-[#020617] dark:to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg border border-slate-700/50 dark:border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute -right-10 -top-10 text-[#D4AF37] opacity-[0.08] pointer-events-none">
                    <Gift size={220} />
                </div>
                
                <div className="relative z-10 flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-3">
                        <Sparkles size={14} />
                        Limited Time Offer
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white leading-tight">
                        Earn <span className="text-[#D4AF37]">₹20</span> For Every Referral!
                    </h2>
                    <p className="text-slate-300 max-w-xl text-sm sm:text-base mx-auto md:mx-0">
                        Invite other merchants to join InTrust India using your unique referral code. When they activate their subscription, you instantly receive ₹20 directly in your wallet!
                    </p>
                </div>
                
                <div className="relative z-10 shrink-0 bg-gradient-to-br from-[#D4AF37] to-[#F3E5AB] text-slate-900 px-8 py-5 rounded-xl font-black text-center shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-[#fce48a] flex flex-col items-center justify-center min-w-[160px]">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Instant Reward</div>
                    <div className="text-4xl flex items-center drop-shadow-sm">
                        ₹20
                    </div>
                </div>
            </div>

            {/* Section 1: Referral Code Card */}
            <ReferralCodeCard referralCode={referralCode} />

            {/* Section 1.5: Enter Referral Code */}
            <EnterReferralCodeSection hasReferrer={hasReferrer} />

            {/* Section 2: My Network */}
            <section className="bg-white dark:bg-[#020617] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Users className="text-[#D4AF37]" size={20} />
                        Direct Referrals
                    </h2>
                    
                    {chainDepth > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                            <Network size={14} className="text-emerald-500" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                                Network Depth: {chainDepth} level{chainDepth > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {directReferrals.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={24} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No referrals yet</h3>
                            <p className="text-slate-500">Share your link to invite merchants and build your network.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-0">
                            {directReferrals.map((ref, idx) => (
                                <div key={idx} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                                            {ref?.business_name?.[0]?.toUpperCase() || 'M'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">
                                                {ref?.business_name || 'Unknown Business'}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <Calendar size={12} />
                                                Joined {new Date(ref?.created_at || new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0">
                                        {getStatusBadge(ref?.status)}
                                        {ref?.subscription_status === 'active' ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/20 text-emerald-400 border-emerald-500/50 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Subscribed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-slate-500/10 text-slate-500 border-slate-500/20">
                                                Free Tier
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Section 3: Referral Prize History */}
            <section className="bg-white dark:bg-[#020617] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Coins className="text-[#D4AF37]" size={20} />
                        Wallet Prizes Earned
                    </h2>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {prizeHistory.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Coins size={24} className="text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">No prizes earned yet</h3>
                            <p className="text-slate-500">Prizes will appear here when your referrals activate their subscription.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-0">
                            {prizeHistory.map((prize) => {
                                // Extract merchant name from description or show generic text
                                const descMatches = prize.description?.match(/from merchant (.*)$/i);
                                const sourceMerchant = descMatches ? descMatches[1] : (prize.description || 'Referral Bonus');
                                
                                return (
                                    <div key={prize.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                                                <Coins size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white text-base sm:text-lg">
                                                    {sourceMerchant}
                                                </h4>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {new Date(prize.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-emerald-500 text-lg sm:text-xl">
                                                +₹{(prize.amount_paise / 100).toFixed(2)}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                Wallet Cash
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
