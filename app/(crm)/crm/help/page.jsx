'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle, BookOpen, ChevronDown, ChevronRight, Mail, Phone,
    MessageCircle, Users, Briefcase, Target, BarChart2, FileText,
    CheckSquare, Shield, Zap, Star, ArrowRight, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

const MODULES = [
    {
        icon: Target,
        title: 'Leads',
        path: '/crm/leads',
        color: 'bg-blue-100 text-blue-700',
        description: 'Manage all your prospective clients.',
        steps: [
            'Click "Leads" in the sidebar to view all leads in a searchable table.',
            'Use "+ New Lead" button to add a prospect with name, phone, email, deal value.',
            'Set the status: New → Contacted → Qualified → Proposal → Won/Lost.',
            'Assign leads to executives (managers only) via the "Assign" dropdown.',
            'Click a lead row to open its detail page for notes and activity history.',
        ],
    },
    {
        icon: Briefcase,
        title: 'Pipeline',
        path: '/crm/pipeline',
        color: 'bg-indigo-100 text-indigo-700',
        description: 'Visualize all leads in a Kanban board.',
        steps: [
            'Each column represents a pipeline stage (New, Contacted, Qualified, Proposal, Won, Lost).',
            'Drag a lead card from one column to another to update its status instantly.',
            'Cards show the lead name, deal value, and temperature indicator.',
            'Use the filter bar to narrow by assigned user or source.',
        ],
    },
    {
        icon: CheckSquare,
        title: 'Tasks',
        path: '/crm/tasks',
        color: 'bg-amber-100 text-amber-700',
        description: 'Track follow-ups and to-dos.',
        steps: [
            'Create tasks with a title, due date, and link them to a specific lead.',
            'Pending tasks appear on the dashboard reminder widget.',
            'Mark tasks complete using the checkbox — they move to the Done section.',
            'Managers can view all team tasks; executives only see their own.',
        ],
    },
    {
        icon: Users,
        title: 'Teams',
        path: '/crm/teams',
        color: 'bg-emerald-100 text-emerald-700',
        description: 'View your CRM team members.',
        steps: [
            'Shows all Relationship Executives and their assigned lead counts.',
            'Managers can reassign leads from this view.',
            'Click a team member to see their individual pipeline.',
        ],
    },
    {
        icon: BarChart2,
        title: 'Performance & Reports',
        path: '/crm/analytics',
        color: 'bg-purple-100 text-purple-700',
        description: 'Analytics and team performance. (Managers only)',
        steps: [
            'View conversion rates, win rates, and revenue forecasts.',
            'Bar and area charts show lead flow trends over time.',
            'Export reports as CSV from the Reports page.',
            'Only visible to Sales Manager, Admin, Super Admin roles.',
        ],
    },
    {
        icon: FileText,
        title: 'Invoice',
        path: '/crm/invoice',
        color: 'bg-violet-100 text-violet-700',
        description: 'Create and share invoices with clients.',
        steps: [
            'Open Invoice from the sidebar or Quick Actions on dashboard.',
            'Fill in Seller (auto-populated), Customer details, and line items.',
            'The Summary panel shows live GST breakdown and Grand Total.',
            'Click "Generate & Download" to get a PDF.',
            'Use WhatsApp or Email buttons to send the invoice directly to the client.',
        ],
    },
    {
        icon: Shield,
        title: 'Settings',
        path: '/crm/settings',
        color: 'bg-gray-100 text-gray-700',
        description: 'Manage your CRM profile and preferences.',
        steps: [
            'Update your display name, phone, and profile photo.',
            'Change your password from Settings.',
            'View your assigned role and permissions.',
        ],
    },
];

const FAQS = [
    { q: 'Who can assign leads to executives?', a: 'Only users with the Sales Manager, Admin, or Super Admin role can assign leads. Relationship Executives can only view leads assigned to them.' },
    { q: 'Can I reassign a lead?', a: 'Only Managers and Admins can reassign leads. If a lead needs to be moved, please contact your manager.' },
    { q: 'How does lead distribution work?', a: 'Admins assign leads via the CRM Admin Panel to balance the workload across the team based on capacity and territory.' },
    { q: 'Why don\'t I see the Performance/Reports menu?', a: 'Performance and Reports are only visible to Sales Manager, Admin, and Super Admin roles. If you\'re a Relationship Executive, these sections are hidden.' },
    { q: 'Can I see another executive\'s leads?', a: 'No. Relationship Executives only see leads assigned to them. Managers see all leads across the team.' },
    { q: 'How do I share an invoice via WhatsApp?', a: 'Fill in the customer\'s phone number in the Customer Details section, then click the green "WhatsApp" button on the Summary card. It opens a pre-filled WhatsApp message.' },
];

function AccordionItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/80 transition-colors gap-4">
                <span className="font-bold text-gray-800 text-sm">{q}</span>
                {open ? <ChevronDown size={16} className="text-[#1e3a5f] shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
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
                    <p className="font-black text-gray-900 text-sm group-hover:text-[#1e3a5f] transition-colors">{mod.title}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 relative z-10">
                    <Link href={mod.path} onClick={(e) => e.stopPropagation()} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e3a5f]/10 text-[10px] font-bold text-[#1e3a5f] hover:bg-[#1e3a5f]/20 transition-colors">
                        Open <ExternalLink size={12} />
                    </Link>
                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center shadow-sm group-hover:bg-white transition-colors">
                        {open ? <ChevronDown size={16} className="text-[#1e3a5f]" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                </div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-white/40 bg-white/30">
                            <p className="text-[11px] font-black text-[#1e3a5f] uppercase tracking-widest mt-4 mb-3">Step-by-Step Guide</p>
                            <ol className="space-y-3">
                                {mod.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#0f2447] shadow-md shadow-[#1e3a5f]/20 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
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

export default function CRMHelpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)] relative overflow-hidden">
            {/* Ambient Background Blur */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="max-w-4xl mx-auto space-y-10 pb-16 relative z-10">

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-br from-[#1e3a5f] via-[#162d4c] to-[#0f2447] rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-2xl shadow-[#1e3a5f]/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20 shadow-inner">
                            <HelpCircle size={12} className="text-blue-300" /> Help Center
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">CRM Panel Guide</h1>
                        <p className="text-blue-100/90 text-sm sm:text-base font-medium leading-relaxed max-w-xl mb-8">
                            Everything you need to know about the InTrust CRM Panel — from managing leads to generating invoices. If you still need help, contact us at the bottom.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {['Leads', 'Pipeline', 'Tasks', 'Invoice', 'Reports'].map((tag, i) => (
                                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + (i * 0.05) }} key={tag} className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-sm">
                                    {tag}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Role Permissions */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2447] flex items-center justify-center shadow-lg shadow-[#1e3a5f]/20">
                            <Shield size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Role Permissions</h2>
                            <p className="text-xs text-gray-500 font-medium">What you can do based on your role</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-2 text-xs font-black text-gray-400 uppercase tracking-widest">Feature</th>
                                    <th className="text-center py-3 px-2 text-xs font-black text-[#1e3a5f] uppercase tracking-widest">Sales Exec</th>
                                    <th className="text-center py-3 px-2 text-xs font-black text-emerald-600 uppercase tracking-widest">Manager</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[
                                    ['View own leads', true, true],
                                    ['View all team leads', false, true],
                                    ['Assign leads to executives', false, true],
                                    ['Create tasks', true, true],
                                    ['View team tasks', false, true],
                                    ['Generate invoices', true, true],
                                    ['View Performance Analytics', false, true],
                                    ['Export Reports', false, true],
                                ].map(([feat, exec, mgr]) => (
                                    <tr key={feat} className="hover:bg-gray-50/50">
                                        <td className="py-3 px-2 text-gray-700 font-medium">{feat}</td>
                                        <td className="py-3 px-2 text-center">{exec ? '✅' : '—'}</td>
                                        <td className="py-3 px-2 text-center">{mgr ? '✅' : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Module Guides */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-[#1e3a5f]" /> Module Guides
                    </h2>
                    <p className="text-sm text-gray-500 mb-5">Click any module to expand step-by-step instructions.</p>
                    <div className="space-y-3">
                        {MODULES.map(mod => <ModuleCard key={mod.title} mod={mod} />)}
                    </div>
                </motion.div>

                {/* FAQs */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
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
                            <Mail size={18} className="text-blue-300 shrink-0" />
                            <div>
                                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Email Support</p>
                                <p className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">intrustindiadev@gmail.com</p>
                            </div>
                        </a>
                    </div>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
