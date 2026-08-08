'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { 
    Award, CheckCircle2, Sparkles, ArrowRight, X, Briefcase, 
    ShieldCheck, Zap, User, Star, Rocket, Clock, Compass, ChevronRight
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
    const [step, setStep] = useState(0); // 0: Welcome, 1: Walkthrough, 2: Ready
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

        const targetRoles = [
            'employee', 'freelancer', 'video_editor', 'social_media_manager',
            'seo_specialist', 'advertiser', 'support_agent',
            'relationship_exec', 'hr_manager', 'merchant'
        ];
        if (!targetRoles.includes(profile.role)) return;

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

    const nextStep = () => setStep(s => Math.min(2, s + 1));
    const prevStep = () => setStep(s => Math.max(0, s - 1));

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    const content = (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex flex-col bg-white overflow-hidden text-slate-900 font-[family-name:var(--font-outfit)]">
                {step === 0 && (
                    <Confetti
                        width={windowSize.width}
                        height={windowSize.height}
                        recycle={false}
                        numberOfPieces={500}
                        gravity={0.15}
                        colors={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']}
                    />
                )}

                {/* Navbar */}
                <div className="w-full flex justify-between items-center p-6 sm:p-10 relative z-20">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="InTrust Logo" className="h-8 object-contain" />
                        <span className="text-xl font-extrabold tracking-tight">INTRUST</span>
                    </div>
                    <button onClick={handleDismiss} className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">
                        Skip Onboarding
                    </button>
                </div>

                {/* Slides Container */}
                <div className="flex-1 relative flex items-center justify-center">
                    <AnimatePresence custom={1} mode="wait">
                        {step === 0 && (
                            <motion.div 
                                key="step0"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                            >
                                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 flex items-center justify-center mb-8 relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full animate-ping opacity-20 blur-xl"></div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 rounded-full border border-white/40 backdrop-blur-sm shadow-[0_0_80px_rgba(59,130,246,0.3)]"></div>
                                    <img src="/logo.png" alt="Company Logo" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
                                </div>
                                <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 text-slate-900">
                                    Welcome aboard, {profile?.full_name?.split(' ')[0] || 'Partner'}!
                                </h1>
                                <p className="text-lg sm:text-xl text-slate-500 max-w-2xl">
                                    We are thrilled to have you join the InTrust ecosystem. You've officially been granted access to your internal portal. Let's get you set up for success.
                                </p>
                            </motion.div>
                        )}

                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full"
                            >
                                <div className="text-center mb-10">
                                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border ${config.badgeBg} mb-4`}>
                                        <RoleIcon size={16} /> {config.badge}
                                    </span>
                                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
                                        Your Roadmap to Success
                                    </h2>
                                </div>

                                <div className="w-full space-y-4">
                                    {config.steps.map((s, i) => {
                                        const Icon = s.icon;
                                        return (
                                            <div key={i} className="flex items-center gap-6 p-6 rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow group">
                                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                    <Icon size={28} />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                                                    <p className="text-slate-500 font-medium">{s.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                            >
                                <div className="w-40 h-40 rounded-full bg-emerald-50 flex items-center justify-center mb-8">
                                    <Rocket size={64} className="text-emerald-600" />
                                </div>
                                <h2 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 text-slate-900">
                                    You're all set!
                                </h2>
                                <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mb-12">
                                    Your portal is ready and waiting. Dive in to explore your dashboard, connect with the team, and start making an impact.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="w-full p-6 sm:p-10 flex items-center justify-between relative z-20">
                    <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`} />
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {step > 0 && (
                            <button onClick={prevStep} className="px-6 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors">
                                Back
                            </button>
                        )}
                        {step < 2 ? (
                            <button onClick={nextStep} className="px-8 py-4 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center gap-2">
                                Next <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button onClick={handleDismiss} className="px-10 py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all flex items-center gap-2">
                                Enter Dashboard <Rocket size={20} />
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </AnimatePresence>
    );

    return createPortal(content, document.body);
}
