'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle, BookOpen, ChevronDown, ChevronRight, Mail, Phone,
    MessageCircle, Clock, Calendar, FileText, User, Zap, Home,
    DollarSign, CheckCircle, ExternalLink, Shield, BookMarked
} from 'lucide-react';

const MODULES = [
    {
        icon: Home,
        title: 'Dashboard',
        path: '/employee',
        color: 'bg-amber-100 text-amber-700',
        description: 'Your personal workspace overview.',
        steps: [
            'The dashboard shows today\'s attendance status, upcoming leaves, and recent notifications.',
            'Quick Stats show your total present days, pending leaves, and pending tasks.',
            'Use Quick Actions to navigate to key sections instantly.',
        ],
    },
    {
        icon: Clock,
        title: 'Attendance',
        path: '/employee/attendance',
        color: 'bg-blue-100 text-blue-700',
        description: 'View your daily attendance records.',
        steps: [
            'The Attendance page shows a monthly calendar view of your check-in/out history.',
            'Green = Present, Red = Absent, Yellow = Late, Gray = Holiday/Weekend.',
            'If attendance is incorrect, contact your HR Manager to fix it manually.',
        ],
    },
    {
        icon: Calendar,
        title: 'Leave Management',
        path: '/employee/leaves',
        color: 'bg-violet-100 text-violet-700',
        description: 'Apply for and track your leaves.',
        steps: [
            'Click "+ Apply Leave" to submit a leave request with start date, end date, and reason.',
            'Track your request status: Pending → Approved / Rejected.',
            'View your remaining leave balance for Casual, Sick, and Earned leaves.',
            'Approved leave automatically updates your attendance record.',
        ],
    },
    {
        icon: FileText,
        title: 'Payslips',
        path: '/employee/payslips',
        color: 'bg-emerald-100 text-emerald-700',
        description: 'View and download your salary slips.',
        steps: [
            'Payslips are available once HR processes your salary for a given month.',
            'Click on any month\'s payslip card to view the detailed breakdown.',
            'Use the Download button to save the payslip PDF for your records.',
            'Payslips show: Basic, HRA, Allowances, Deductions, and Net Pay.',
        ],
    },
    {
        icon: BookMarked,
        title: 'Training',
        path: '/employee/training',
        color: 'bg-rose-100 text-rose-700',
        description: 'View your assigned training sessions.',
        steps: [
            'The Training page lists all sessions assigned to you by HR.',
            'Shows session topic, trainer name, date, and completion status.',
            'Mark a session as complete after attending.',
        ],
    },
    {
        icon: User,
        title: 'My Profile',
        path: '/employee/profile',
        color: 'bg-indigo-100 text-indigo-700',
        description: 'View and update your personal details.',
        steps: [
            'Click "Edit Profile" to update your display name and phone number.',
            'Upload a profile photo using the camera icon — it opens the crop tool.',
            'Your profile also shows your ID Card and a verification badge.',
            'To change your password, use the "Security" tab in Settings.',
        ],
    },
];

const FAQS = [
    { q: 'How do I apply for leave?', a: 'Go to Leaves in the sidebar → Click "+ Apply Leave" → Fill the form with start date, end date, and reason → Submit. Your manager will be notified.' },
    { q: 'Why can\'t I see my payslip?', a: 'Payslips appear only after HR processes your salary for that month. If you think it\'s overdue, contact your HR Manager.' },
    { q: 'How do I download my payslip?', a: 'Go to Payslips → Click on the month you want → Click the "Download PDF" button on the payslip detail page.' },
    { q: 'My attendance shows "Absent" but I was present. What do I do?', a: 'Contact your HR Manager or email intrustindiadev@gmail.com. Only HR Managers can edit attendance records.' },
    { q: 'How do I update my profile photo?', a: 'Go to My Profile → Click the camera icon on your avatar → Choose or drag-and-drop a photo → Crop it → Click "Save Photo".' },
    { q: 'Can I access the CRM or HRM panel from here?', a: 'Only if your role has permission (e.g., Sales Exec can access CRM, HR staff can access HRM). If you don\'t see the links, your current role doesn\'t have access. Contact Admin.' },
];

function AccordionItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/80 transition-colors gap-4">
                <span className="font-bold text-gray-800 text-sm">{q}</span>
                {open ? <ChevronDown size={16} className="text-violet-600 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-white/40 pt-4 bg-white/30">{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ModuleCard({ mod }) {
    const [open, setOpen] = useState(false);
    const Icon = mod.icon;
    return (
        <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/80 transition-colors relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mod.color} shrink-0 shadow-inner relative z-10`}>
                    <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                    <p className="font-black text-gray-900 text-sm group-hover:text-violet-700 transition-colors">{mod.title}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 relative z-10">
                    <a href={mod.path} onClick={(e) => e.stopPropagation()} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600/10 text-[10px] font-bold text-violet-700 hover:bg-violet-600/20 transition-colors">
                        Open <ExternalLink size={12} />
                    </a>
                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center shadow-sm group-hover:bg-white transition-colors">
                        {open ? <ChevronDown size={16} className="text-violet-600" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                </div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-white/40 bg-white/30">
                            <p className="text-[11px] font-black text-violet-700 uppercase tracking-widest mt-4 mb-3">Step-by-Step Guide</p>
                            <ol className="space-y-3">
                                {mod.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-indigo-800 shadow-md shadow-violet-600/20 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                                        <span className="pt-0.5 leading-relaxed">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function EmployeeHelpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)] relative overflow-hidden">
            {/* Ambient Background Blur */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-fuchsia-400/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-10 pb-16 relative z-10">

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-br from-violet-800 via-indigo-700 to-fuchsia-900 rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-2xl shadow-violet-900/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20 shadow-inner">
                            <HelpCircle size={12} className="text-violet-300" /> Employee Center
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">Employee Hub Guide</h1>
                        <p className="text-violet-50/90 text-sm sm:text-base font-medium leading-relaxed max-w-xl mb-8">
                            Welcome to the Employee Portal. Learn how to track your attendance, apply for leaves, and download payslips.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {['Dashboard', 'Attendance', 'Leaves', 'Payslips', 'Profile'].map((tag, i) => (
                                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + (i * 0.05) }} key={tag} className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-sm">
                                    {tag}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Key Policies */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                        <Shield size={20} className="text-amber-500" /> Key Policies at a Glance
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { title: 'Leave Types', items: ['Casual Leave — 12 days/year', 'Sick Leave — 10 days/year', 'Earned Leave — accrued monthly'], color: 'bg-violet-50/50 border-violet-100' },
                            { title: 'Attendance Rules', items: ['Check-in by 10:00 AM = On Time', 'After 10:00 AM = Late', '3 lates = 1 absent (policy may vary)'], color: 'bg-blue-50/50 border-blue-100' },
                            { title: 'Payslip Timeline', items: ['Salary processed by 1st of month', 'Payslip available after processing', 'Query: email HR or support team'], color: 'bg-emerald-50/50 border-emerald-100' },
                        ].map(p => (
                            <div key={p.title} className={`p-4 rounded-2xl border ${p.color}`}>
                                <p className="font-black text-gray-900 text-sm mb-3">{p.title}</p>
                                <ul className="space-y-1.5">
                                    {p.items.map(item => (
                                        <li key={item} className="flex gap-2 text-xs text-gray-600">
                                            <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Module Guides */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-violet-600" /> Module Guides
                    </h2>
                    <div className="space-y-3">
                        {MODULES.map(mod => <ModuleCard key={mod.title} mod={mod} />)}
                    </div>
                </motion.div>

                {/* FAQs */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <Zap size={22} className="text-white" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-3">
                        {FAQS.map(faq => <AccordionItem key={faq.q} q={faq.q} a={faq.a} />)}
                    </div>
                </motion.div>

                {/* Contact Support */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-8 sm:p-10 text-white shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <MessageCircle size={22} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">Still Need Help?</h2>
                                <p className="text-gray-400 text-xs font-medium">Our support team is here for you</p>
                            </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-8 leading-relaxed max-w-2xl">
                            If your question isn't answered here, or you're experiencing a technical issue, reach out to the InTrust support team directly.
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            <a href="mailto:intrustindiadev@gmail.com" className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 group">
                                <Mail size={18} className="text-violet-300 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Email Support</p>
                                    <p className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">intrustindiadev@gmail.com</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
