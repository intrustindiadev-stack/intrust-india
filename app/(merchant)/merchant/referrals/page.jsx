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
            <div className="bg-gradient-to-br from-[#0c0e16] to-[#020617] rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 group">
                <div className="absolute -right-10 -top-10 text-amber-500/20 blur-3xl pointer-events-none transition-all duration-700 group-hover:bg-amber-400/30 w-64 h-64 rounded-full" />
                <div className="absolute right-0 bottom-0 text-[#D4AF37] opacity-[0.03] pointer-events-none transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                    <Gift size={280} />
                </div>
                
                <div className="relative z-10 flex-1 text-center md:text-left space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                        <Sparkles size={14} className="animate-pulse" />
                        Premium Partner Offer
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                        Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">₹20</span> For Every Referral!
                    </h2>
                    <p className="text-slate-400 max-w-xl text-sm sm:text-base mx-auto md:mx-0 font-medium leading-relaxed">
                        Invite other merchants to join InTrust India using your unique referral code. When they activate their subscription, you instantly receive ₹20 directly in your wallet!
                    </p>
                </div>
                
                <div className="relative z-10 shrink-0 bg-gradient-to-br from-amber-500 to-yellow-300 text-slate-900 px-8 py-6 rounded-2xl font-black text-center shadow-[0_0_40px_rgba(245,158,11,0.3)] border-2 border-yellow-200/50 flex flex-col items-center justify-center min-w-[180px] transform hover:scale-105 transition-transform duration-300">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Instant Reward</div>
                    <div className="text-5xl flex items-center drop-shadow-md">
                        ₹20
                    </div>
                </div>
            </div>

            {/* Section 1: Referral Code Card */}
            <ReferralCodeCard referralCode={referralCode} />

            {/* Section 1.5: Enter Referral Code */}
            <EnterReferralCodeSection hasReferrer={hasReferrer} />

            {/* Section 2: My Network */}
            <section className="bg-white dark:bg-[#0c0e16] rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
                            <Users className="text-amber-500 dark:text-amber-400" size={20} />
                        </div>
                        Direct Referrals
                    </h2>
                    
                    {chainDepth > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full shadow-sm">
                            <Network size={16} className="text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-black uppercase tracking-widest">
                                Network Depth: {chainDepth} level{chainDepth > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/5 p-4 md:p-6 space-y-4">
                    {directReferrals.length === 0 ? (
                        <div className="p-16 text-center bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                            <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-white/10">
                                <Users size={32} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">No referrals yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Share your link to invite merchants and build your network.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {directReferrals.map((ref, idx) => (
                                <div key={idx} className="p-4 sm:p-5 bg-white dark:bg-[#11131a] rounded-2xl border border-slate-100 dark:border-white/10 hover:shadow-xl dark:hover:shadow-2xl dark:hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform shrink-0 border border-white/20">
                                            {ref?.business_name?.[0]?.toUpperCase() || 'M'}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tight">
                                                {ref?.business_name || 'Unknown Business'}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                                                <Calendar size={12} />
                                                Joined {new Date(ref?.created_at || new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end pt-3 sm:pt-0">
                                        {getStatusBadge(ref?.status)}
                                        {ref?.subscription_status === 'active' ? (
                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2 shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                                                Subscribed
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 shadow-sm">
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
            <section className="bg-white dark:bg-[#0c0e16] rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
                            <Coins className="text-amber-500 dark:text-amber-400" size={20} />
                        </div>
                        Wallet Prizes Earned
                    </h2>
                </div>

                <div className="p-4 md:p-6 space-y-4">
                    {prizeHistory.length === 0 ? (
                        <div className="p-16 text-center bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-slate-100 dark:border-white/5">
                            <div className="w-20 h-20 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-white/10">
                                <Coins size={32} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">No prizes earned yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Prizes will appear here when your referrals activate their subscription.</p>
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
