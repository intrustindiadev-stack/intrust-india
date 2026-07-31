'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { 
    Award, CheckCircle2, Sparkles, ArrowRight, X, Briefcase, 
    ShieldCheck, Zap, User, Star, Rocket, Clock, Compass 
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/contexts/AuthContext';

const ROLE_DETAILS = {
    employee: {
        title: 'InTrust Employee Portal Unlocked',
        badge: 'Official Employee',
        color: 'from-blue-600 to-indigo-600',
        badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        icon: User,
        steps: [
            { title: 'Complete Profile & Identity', desc: 'Verify personal & bank details for payroll', link: '/employee/profile', icon: User },
            { title: '1-Tap Attendance Check-In', desc: 'Mark your daily attendance with location', link: '/employee', icon: Clock },
            { title: 'Explore Employee Perks', desc: 'Health insurance, learning budget & leaves', link: '/employee/leaves', icon: Star },
        ]
    },
    relationship_exec: {
        title: 'CRM Portal Unlocked',
        badge: 'Relationship Executive',
        color: 'from-amber-500 to-orange-600',
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: Zap,
        steps: [
            { title: 'Set Up CRM Profile', desc: 'Add contact details and target preferences', link: '/crm/profile', icon: User },
            { title: 'Access Lead Pipeline', desc: 'View assigned leads and schedule follow-ups', link: '/crm/leads', icon: Rocket },
            { title: 'Check Your Targets', desc: 'Track your deal conversions & performance', link: '/crm', icon: Award },
        ]
    },
    hr_manager: {
        title: 'HRM Control Hub Unlocked',
        badge: 'HR Manager',
        color: 'from-purple-600 to-violet-600',
        badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        icon: Briefcase,
        steps: [
            { title: 'Recruitment Pipeline', desc: 'Review candidates & schedule interviews', link: '/hrm/recruitment', icon: Briefcase },
            { title: 'Manage Job Postings', desc: 'Create & publish active job openings', link: '/hrm/jobs', icon: Compass },
            { title: 'Employee Directory', desc: 'Monitor team attendance and leave requests', link: '/hrm', icon: ShieldCheck },
        ]
    },
    merchant: {
        title: 'Merchant Control Panel Unlocked',
        badge: 'Verified Merchant',
        color: 'from-emerald-600 to-teal-600',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: ShieldCheck,
        steps: [
            { title: 'Configure Store Profile', desc: 'Upload logo, description & operating hours', link: '/merchant/profile', icon: User },
            { title: 'Add Shopping Products', desc: 'List inventory & offers on InTrust Mart', link: '/merchant/products', icon: Rocket },
            { title: 'Setup NFC Terminal', desc: 'Accept tap & pay customer rewards', link: '/merchant', icon: Zap },
        ]
    }
};

export default function WelcomeRoleCelebrationModal({ forceShow = false, onClose = () => {} }) {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    useEffect(() => {
        if (forceShow) {
            setIsOpen(true);
            return;
        }

        if (!user || !profile?.role) return;

        // Only trigger for internal elevated roles
        const targetRoles = [
            'employee', 'freelancer', 'video_editor', 'social_media_manager',
            'seo_specialist', 'advertiser', 'support_agent',
            'relationship_exec', 'hr_manager', 'merchant'
        ];
        if (!targetRoles.includes(profile.role)) return;

        // Check if celebration was already shown in localStorage or profile
        const storageKey = `welcome_shown_${user.id}_${profile.role}`;
        const alreadyShown = localStorage.getItem(storageKey) || profile.welcome_celebration_shown;

        if (!alreadyShown) {
            setIsOpen(true);
        }
    }, [user, profile, forceShow]);

    const handleDismiss = async () => {
        setIsOpen(false);
        onClose();
        if (user && profile?.role) {
            const storageKey = `welcome_shown_${user.id}_${profile.role}`;
            localStorage.setItem(storageKey, 'true');

            try {
                await supabase
                    .from('user_profiles')
                    .update({ welcome_celebration_shown: true })
                    .eq('id', user.id);
            } catch (err) {
                console.warn('Failed to persist welcome flag in DB:', err);
            }
        }
    };

    if (!isOpen) return null;

    const currentRoleKey = profile?.role && ROLE_DETAILS[profile.role] ? profile.role : 'employee';
    const config = ROLE_DETAILS[currentRoleKey];
    const RoleIcon = config.icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-xl">
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={false}
                    numberOfPieces={400}
                    gravity={0.15}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white my-auto"
                >
                    {/* Top Decorative Background Glow */}
                    <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>

                    <div className="p-6 sm:p-8 relative z-10">
                        {/* InTrust Brand Header */}
                        <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-4">
                            <div className="flex items-center gap-3">
                                <Image
                                    src="/logo.png"
                                    alt="InTrust Logo"
                                    width={38}
                                    height={38}
                                    className="object-contain"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <div>
                                    <h3 className="text-sm font-bold tracking-wider uppercase text-indigo-400">InTrust Platform</h3>
                                    <p className="text-xs text-slate-400">Official Onboarding</p>
                                </div>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${config.badgeBg} flex items-center gap-1.5`}>
                                <RoleIcon size={13} />
                                {config.badge}
                            </span>
                        </div>

                        {/* Hero Celebration Banner */}
                        <div className="text-center my-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/30 mb-4"
                            >
                                <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
                                    <Award size={42} className="text-amber-400" />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                                    Welcome to the InTrust Team! 🎉
                                </h2>
                                <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
                                    Congratulations <span className="font-semibold text-white">{profile?.full_name || 'Team Member'}</span>! Your account has been officially granted access to the internal portal.
                                </p>
                            </motion.div>
                        </div>

                        {/* Onboarding Quick Steps Grid */}
                        <div className="mt-6 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-amber-400" />
                                Quick Start Checklist
                            </h4>

                            <div className="grid grid-cols-1 gap-2.5">
                                {config.steps.map((step, idx) => {
                                    const StepIcon = step.icon;
                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + idx * 0.1 }}
                                        >
                                            <Link
                                                href={step.link}
                                                onClick={handleDismiss}
                                                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <StepIcon size={18} />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                                            {step.title}
                                                        </h5>
                                                        <p className="text-xs text-slate-400">{step.desc}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight size={16} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                            <button
                                onClick={handleDismiss}
                                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Rocket size={18} />
                                Enter Dashboard
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
