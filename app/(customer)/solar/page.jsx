import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SolarHero from '@/components/solar/customer/SolarHero';
import SolarLeadForm from '@/components/solar/customer/SolarLeadForm';
import SolarRequestTracker from '@/components/solar/customer/SolarRequestTracker';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { WHY_SOLAR } from '@/lib/solar/estimator'; // I need to move WHY_SOLAR to estimator or create SolarWhy component. Wait, I didn't export WHY_SOLAR. Let me just inline it or create a SolarWhy.jsx later. I will inline it for now or extract.
import { IndianRupee, TrendingDown, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { revalidatePath } from 'next/cache';

const WHY_SOLAR_LIST = [
    { title: 'Zero Investment', desc: 'Government subsidy covers your full down payment', icon: IndianRupee },
    { title: 'EMI = Savings', desc: 'Your solar savings cover your monthly EMI completely', icon: TrendingDown },
    { title: 'Savings Guarantee', desc: "You save or we pay — India's first savings guarantee", icon: ShieldCheck },
    { title: '25-Year Warranty', desc: 'Premium panels with manufacturer-backed warranty', icon: CheckCircle2 },
];

export const metadata = {
    title: 'InTrust Solar | Free Consultation & Zero Investment',
    description: 'Get a free solar site survey. Government subsidy covers your down payment, and electricity savings cover your EMI.',
};

export default async function SolarServicePage() {
    // Determine active user and existing lead server-side
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let existingLead = null;
    if (user) {
        const { data } = await supabase
            .from('solar_leads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        existingLead = data;
    }

    // A simple server action to revalidate path on successful submission
    async function handleSubmissionSuccess() {
        'use server';
        revalidatePath('/solar');
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#08090b] text-slate-900 dark:text-white overflow-x-hidden">
            <div className="fixed top-0 left-0 right-0 z-[120]">
                <Navbar />
            </div>

            <main className="relative z-10 pt-4">
                <SolarHero />

                {/* Optional tracker logic based on user session */}
                {existingLead && (
                    <SolarRequestTracker existingLead={existingLead} />
                )}

                {/* Why Solar Section */}
                <section className="py-16 px-4 bg-white dark:bg-white/[0.02]">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-10">
                            <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Why Solar?</p>
                            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                India's smartest energy move
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {WHY_SOLAR_LIST.map((item, i) => (
                                <div key={i} className="flex gap-4 p-6 rounded-3xl border bg-slate-50 border-slate-200 dark:bg-white/5 dark:border-white/10">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                        <item.icon size={22} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 dark:text-white mb-1">{item.title}</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-16 px-4">
                    <div className="max-w-lg mx-auto">
                        <div className="text-center mb-8">
                            <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-2">Free Consultation</p>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Book Your Solar Site Survey</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Takes less than 60 seconds. No commitment required.</p>
                        </div>
                        
                        {/* The form runs entirely on client, but we pass server data to it */}
                        <SolarLeadForm existingLead={existingLead} onSubmissionSuccess={handleSubmissionSuccess} />
                    </div>
                </section>

                <Footer />
            </main>
        </div>
    );
}
