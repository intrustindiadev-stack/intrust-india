'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Heart, BookOpen, Clock, Laptop, TrendingUp, Award,
    Search, Sparkles, ArrowRight, Star, Briefcase, MapPin, ChevronRight, Users, Building2 
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const DEPT_COLORS = {
    freelancer: 'bg-violet-50 text-violet-700 border-violet-100',
    agent: 'bg-blue-50 text-blue-700 border-blue-100',
    dsa: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    sales: 'bg-orange-50 text-orange-700 border-orange-100',
    other: 'bg-gray-50 text-gray-600 border-gray-100',
};

const BENEFITS = [
    { icon: Heart, label: 'Health Insurance', desc: 'Full family coverage', color: 'text-rose-500', bg: 'bg-rose-50' },
    { icon: BookOpen, label: 'Learning Budget', desc: '₹25,000/year', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Clock, label: 'Flexible Leaves', desc: '24 days/year', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Laptop, label: 'Remote Friendly', desc: 'Hybrid options', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { icon: TrendingUp, label: 'Stock Options', desc: 'ESOP program', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: Award, label: 'Performance Bonus', desc: 'Quarterly payouts', color: 'text-purple-500', bg: 'bg-purple-50' },
];

const TESTIMONIALS = [
    { name: 'Priya Sharma', role: 'Senior Engineer', dept: 'Engineering', quote: 'Joined 2 years ago and grew from junior to lead. The ownership here is real.', avatar: 'P' },
    { name: 'Rahul Mehta', role: 'Sales Manager', dept: 'Sales', quote: 'Best decision I made. Transparent comp, great team, and real growth path.', avatar: 'R' },
    { name: 'Ananya Roy', role: 'HR Business Partner', dept: 'HR', quote: 'We actually practice what we preach. People-first culture is not just a tagline.', avatar: 'A' },
];

function JobCard({ job, index }) {
    const deptColor = DEPT_COLORS[job.category] || 'bg-indigo-50 text-indigo-700 border-indigo-100';
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 p-5 sm:p-6 group cursor-pointer"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0 group-hover:from-indigo-200 group-hover:to-violet-200 transition-all"
                    >
                        <Building2 size={22} className="text-indigo-600" />
                    </motion.div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{job.title}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {job.category && <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${deptColor} capitalize`}>{job.category}</span>}
                            {job.location && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} />{job.location}</span>}
                            {job.commission_structure && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 line-clamp-1 max-w-[180px]">{job.commission_structure.split('\n')[0]}</span>}
                        </div>
                        {job.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{job.description}</p>}
                    </div>
                </div>
                <Link
                    href={`/career/apply?role=${job.id}`}
                    className="group/btn flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap flex-shrink-0 active:scale-95"
                >
                    Apply Now
                    <motion.span animate={{ x: 0 }} whileHover={{ x: 3 }}>
                        <ChevronRight size={16} />
                    </motion.span>
                </Link>
            </div>
        </motion.div>
    );
}

export default function CareerPage() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [imgLoaded, setImgLoaded] = useState(false);

    const fetchJobs = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('career_job_roles')
                .select('*').eq('is_active', true).order('created_at', { ascending: false });
            if (error) throw error;
            setJobs(data || []);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const departments = ['all', ...new Set(jobs.map(j => j.category).filter(Boolean))];
    const filtered = jobs.filter(j => {
        const matchDept = deptFilter === 'all' || j.category === deptFilter;
        const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.category?.toLowerCase().includes(search.toLowerCase());
        return matchDept && matchSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── HERO ── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-purple-900 text-white">
                {/* Background image */}
                <div className="absolute inset-0">
                    <Image
                        src="/images/career/hero.png"
                        alt="InTrust team at work"
                        fill
                        className={`object-cover transition-opacity duration-1000 ${imgLoaded ? 'opacity-30' : 'opacity-0'}`}
                        onLoad={() => setImgLoaded(true)}
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-violet-900/70 to-purple-900/80" />
                    {/* Dot grid */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    {/* Blur blobs */}
                    <div className="absolute top-20 left-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center px-4 pt-20 pb-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium mb-6 backdrop-blur-sm">
                        <Sparkles size={14} className="text-violet-300" />
                        We're hiring across {jobs.length > 0 ? jobs.length : 'multiple'} roles
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
                        Build the future<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-pink-300 to-indigo-300">
                            with InTrust
                        </span>
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                        className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
                        Join a team redefining enterprise operations across India. We believe in ownership, growth, and solving problems that actually matter.
                    </motion.p>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search roles..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-xl" />
                        </div>
                        {user && (
                            <Link href="/career/applications"
                                className="inline-flex items-center justify-center gap-2 bg-white/15 border border-white/20 hover:bg-white/25 text-white px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all backdrop-blur-sm active:scale-95 whitespace-nowrap">
                                My Applications <ArrowRight size={15} />
                            </Link>
                        )}
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="grid grid-cols-3 gap-3 mt-12 max-w-sm mx-auto sm:max-w-md">
                        {[
                            { icon: Briefcase, value: `${filtered.length || '10'}+`, label: 'Open Roles' },
                            { icon: Users, value: '200+', label: 'Team Size' },
                            { icon: TrendingUp, value: '3x', label: 'YoY Growth' },
                        ].map((s, i) => (
                            <motion.div key={s.label} whileHover={{ scale: 1.05 }}
                                className="bg-white/10 border border-white/10 rounded-2xl py-4 text-center backdrop-blur-sm">
                                <p className="text-2xl font-black">{s.value}</p>
                                <p className="text-white/60 text-xs font-medium mt-1">{s.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Culture Image Strip */}
                <div className="relative z-10 w-full overflow-hidden h-40 sm:h-52">
                    <Image
                        src="/images/career-culture.png"
                        alt="InTrust office culture"
                        fill
                        className="object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-transparent to-transparent" />
                </div>
            </section>

            {/* ── BENEFITS ── */}
            <section className="py-14 px-4 bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto">
                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                        className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-10">
                        Why people love working here
                    </motion.p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                        {BENEFITS.map((b, i) => (
                            <motion.div key={b.label}
                                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                                whileHover={{ y: -8, scale: 1.05 }}
                                className="flex flex-col items-center gap-3 text-center p-6 rounded-[2rem] bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-default group"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${b.bg} flex items-center justify-center transition-transform duration-300 group-hover:rotate-6`}>
                                    <b.icon size={28} className={b.color} />
                                </div>
                                <p className="text-sm font-black text-gray-900">{b.label}</p>
                                <p className="text-xs text-gray-500 font-medium leading-tight">{b.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section className="py-14 px-4 bg-gray-50 border-b border-gray-100">
                <div className="max-w-5xl mx-auto">
                    <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                        className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-10">
                        Hear from the team
                    </motion.p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {TESTIMONIALS.map((t, i) => (
                            <motion.div key={t.name}
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                whileHover={{ y: -4 }}
                                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, si) => <Star key={si} size={14} className="text-amber-400 fill-amber-400" />)}
                                </div>
                                <p className="text-sm text-gray-600 italic leading-relaxed mb-5">"{t.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{t.name}</p>
                                        <p className="text-xs text-gray-400">{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── OPEN ROLES ── */}
            <section className="max-w-5xl mx-auto px-4 py-12">
                {/* Dept filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
                    {departments.map(d => (
                        <motion.button key={d} onClick={() => setDeptFilter(d)}
                            whileTap={{ scale: 0.95 }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${deptFilter === d ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50'}`}>
                            {d === 'all' ? 'All Departments' : d}
                        </motion.button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-28 bg-white rounded-3xl border border-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-white rounded-[3rem] border border-gray-100 p-20 text-center shadow-inner"
                    >
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search size={40} className="text-gray-300" />
                        </div>
                        <p className="text-2xl font-black text-gray-900 tracking-tight">No open positions right now</p>
                        <p className="text-gray-500 mt-2 font-medium">We're always growing. Check back soon!</p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-gray-500 mb-2">
                                {filtered.length} open position{filtered.length !== 1 ? 's' : ''}
                            </p>
                            {filtered.map((job, i) => <JobCard key={job.id} job={job} index={i} />)}
                        </div>
                    </AnimatePresence>
                )}

                {/* Open Application CTA */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="mt-16 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-purple-900 rounded-[3rem] p-10 sm:p-16 text-white text-center shadow-2xl"
                >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-400/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px]" />
                    
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                            <Sparkles size={32} className="text-violet-300" />
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">Don't see your role?</h3>
                        <p className="text-white/70 mb-10 max-w-lg mx-auto text-lg leading-relaxed font-medium">
                            We're always looking for exceptional talent. Drop your CV and we'll reach out when the right opportunity arrives.
                        </p>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link href="/career/apply"
                                className="inline-flex items-center gap-3 bg-white text-indigo-950 font-black px-10 py-5 rounded-2xl hover:shadow-2xl hover:shadow-white/10 transition-all text-sm uppercase tracking-widest"
                            >
                                Send Open Application <ChevronRight size={20} />
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
