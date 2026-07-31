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
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors gap-4">
                <span className="font-bold text-gray-800 text-sm">{q}</span>
                {open ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">{a}</p>
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${mod.color} shrink-0`}><Icon size={20} /></div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm">{mod.title}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">{mod.description}</p>
                </div>
                {open ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-gray-100">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4 mb-3">How to use</p>
                            <ol className="space-y-2">
                                {mod.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                        {step}
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
        <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)]">
            <div className="max-w-4xl mx-auto space-y-10 pb-16">

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-8 sm:p-12 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-black uppercase tracking-widest mb-4 border border-white/20">
                            <HelpCircle size={12} /> Help Center
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black mb-3">Employee Portal Guide</h1>
                        <p className="text-amber-100/80 text-sm font-medium leading-relaxed max-w-xl">
                            Your complete guide to using the InTrust Employee Portal. Learn how to manage your attendance, leaves, payslips, and profile.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            {['Dashboard', 'Attendance', 'Leaves', 'Payslips', 'Training', 'Profile'].map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">{tag}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Key Policies */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                        <Shield size={20} className="text-amber-500" /> Key Policies at a Glance
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { title: 'Leave Types', items: ['Casual Leave — 12 days/year', 'Sick Leave — 10 days/year', 'Earned Leave — accrued monthly'], color: 'bg-violet-50 border-violet-100' },
                            { title: 'Attendance Rules', items: ['Check-in by 10:00 AM = On Time', 'After 10:00 AM = Late', '3 lates = 1 absent (policy may vary)'], color: 'bg-blue-50 border-blue-100' },
                            { title: 'Payslip Timeline', items: ['Salary processed by 1st of month', 'Payslip available after processing', 'Query: email HR or support team'], color: 'bg-emerald-50 border-emerald-100' },
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
                        <BookOpen size={20} className="text-amber-500" /> Module Guides
                    </h2>
                    <div className="space-y-3">
                        {MODULES.map(mod => <ModuleCard key={mod.title} mod={mod} />)}
                    </div>
                </motion.div>

                {/* FAQs */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                        <Zap size={20} className="text-amber-500" /> Frequently Asked Questions
                    </h2>
                    <div className="space-y-3">
                        {FAQS.map(faq => <AccordionItem key={faq.q} q={faq.q} a={faq.a} />)}
                    </div>
                </motion.div>

                {/* Contact */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <MessageCircle size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">Need Support?</h2>
                            <p className="text-gray-400 text-xs">Contact our support team anytime</p>
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        If your question isn't answered here or you have a technical issue with the portal, reach out to us directly.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a href="mailto:intrustindiadev@gmail.com" className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 group">
                            <Mail size={18} className="text-blue-300 shrink-0" />
                            <div>
                                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Email Support</p>
                                <p className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">intrustindiadev@gmail.com</p>
                            </div>
                        </a>
                        <a href="https://wa.me/919953546539" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white/10 hover:bg-green-500/20 rounded-xl transition-all border border-white/10 group">
                            <Phone size={18} className="text-green-400 shrink-0" />
                            <div>
                                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">WhatsApp Support</p>
                                <p className="text-sm font-bold text-white group-hover:text-green-200 transition-colors">Chat with Support</p>
                            </div>
                        </a>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
