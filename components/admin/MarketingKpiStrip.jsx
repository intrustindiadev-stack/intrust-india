import Link from 'next/link';
import { 
    Share2, 
    MousePointerClick, 
    Trophy, 
    CreditCard, 
    Gift, 
    Banknote, 
    ArrowRight, 
    Sparkles 
} from 'lucide-react';

export default function MarketingKpiStrip({ stats = {} }) {
    const {
        totalShares = 0,
        totalClicks = 0,
        dailyPlays = 0,
        sponsorshipRevenuePaise = 0,
        pendingGiftClaims = 0,
        cashbacksPaidPaise = 0
    } = stats;

    const kpis = [
        {
            label: 'Share Links Created',
            value: Number(totalShares).toLocaleString('en-IN'),
            sub: 'Across merchant & user channels',
            icon: Share2,
            accent: 'text-blue-600 bg-blue-50 border-blue-100'
        },
        {
            label: 'Total Link Clicks',
            value: Number(totalClicks).toLocaleString('en-IN'),
            sub: 'Tracked referral traffic',
            icon: MousePointerClick,
            accent: 'text-indigo-600 bg-indigo-50 border-indigo-100'
        },
        {
            label: 'Daily Quiz Plays',
            value: Number(dailyPlays).toLocaleString('en-IN'),
            sub: 'Trivia challenge attempts',
            icon: Trophy,
            accent: 'text-amber-600 bg-amber-50 border-amber-100'
        },
        {
            label: 'Sponsorship Revenue',
            value: `₹${(Number(sponsorshipRevenuePaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            sub: 'Merchant billboard bookings',
            icon: CreditCard,
            accent: 'text-emerald-600 bg-emerald-50 border-emerald-100'
        },
        {
            label: 'Pending Gift Claims',
            value: Number(pendingGiftClaims).toLocaleString('en-IN'),
            sub: 'Awaiting courier fulfillment',
            icon: Gift,
            accent: 'text-rose-600 bg-rose-50 border-rose-100',
            highlight: pendingGiftClaims > 0
        },
        {
            label: 'Cashbacks Credited',
            value: `₹${(Number(cashbacksPaidPaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            sub: 'Challenge & referral payouts',
            icon: Banknote,
            accent: 'text-teal-600 bg-teal-50 border-teal-100'
        }
    ];

    return (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles size={17} />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                            Marketing & Growth Operations
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Real-time overview of referral links, trivia participation, sponsorships, and reward payouts.
                        </p>
                    </div>
                </div>

                <Link
                    href="/admin/marketing"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto group"
                >
                    <span>Open Marketing Suite</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {kpis.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div
                            key={idx}
                            className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                                kpi.highlight 
                                    ? 'bg-rose-50/70 border-rose-200 shadow-2xs animate-pulse' 
                                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 line-clamp-1">
                                    {kpi.label}
                                </span>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${kpi.accent}`}>
                                    <Icon size={12} />
                                </div>
                            </div>

                            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                                {kpi.value}
                            </div>

                            <div className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">
                                {kpi.sub}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
