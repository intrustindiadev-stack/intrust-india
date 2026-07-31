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
            'Shows all Sales Executives and their assigned lead counts.',
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
    { q: 'Who can assign leads to executives?', a: 'Only users with the Sales Manager, Admin, or Super Admin role can assign leads. Sales Executives can only view leads assigned to them.' },
    { q: 'How do I move a lead to "Won"?', a: 'Open the lead detail page and change the Status dropdown to "Won". You can also drag the card to the "Won" column on the Pipeline (Kanban) view.' },
    { q: 'Can I generate an invoice for any amount?', a: 'Yes. The Invoice Generator lets you add custom line items, quantities, and GST rates. The system calculates SGST/CGST automatically.' },
    { q: 'Why don\'t I see the Performance/Reports menu?', a: 'Performance and Reports are only visible to Sales Manager, Admin, and Super Admin roles. If you\'re a Sales Executive, these sections are hidden.' },
    { q: 'Can I see another executive\'s leads?', a: 'No. Sales Executives only see leads assigned to them. Managers see all leads across the team.' },
    { q: 'How do I share an invoice via WhatsApp?', a: 'Fill in the customer\'s phone number in the Customer Details section, then click the green "WhatsApp" button on the Summary card. It opens a pre-filled WhatsApp message.' },
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
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${mod.color} shrink-0`}>
                    <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm">{mod.title}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">{mod.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link href={mod.path} onClick={(e) => e.stopPropagation()} className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-[#1e3a5f] hover:underline">
                        Open <ExternalLink size={10} />
                    </Link>
                    {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-gray-100">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4 mb-3">Step-by-Step Guide</p>
                            <ol className="space-y-2">
                                {mod.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                                        <span className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
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

export default function CRMHelpPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)]">
            <div className="max-w-4xl mx-auto space-y-10 pb-16">

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-r from-[#1e3a5f] to-[#0f2447] rounded-3xl p-8 sm:p-12 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-black uppercase tracking-widest mb-4 border border-white/20">
                            <HelpCircle size={12} /> Help Center
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black mb-3">CRM Panel Guide</h1>
                        <p className="text-blue-100/80 text-sm font-medium leading-relaxed max-w-xl">
                            Everything you need to know about the InTrust CRM Panel — from managing leads to generating invoices. If you still need help, contact us at the bottom.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            {['Leads', 'Pipeline', 'Tasks', 'Invoice', 'Reports'].map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">{tag}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Role Permissions */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                            <Shield size={20} className="text-[#1e3a5f]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Role Permissions</h2>
                            <p className="text-xs text-gray-400">What you can do based on your role</p>
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
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                        <Zap size={20} className="text-amber-500" /> Frequently Asked Questions
                    </h2>
                    <div className="space-y-3">
                        {FAQS.map(faq => <AccordionItem key={faq.q} q={faq.q} a={faq.a} />)}
                    </div>
                </motion.div>

                {/* Contact Support */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <MessageCircle size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">Still Need Help?</h2>
                            <p className="text-gray-400 text-xs">Our support team is here for you</p>
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        If your question isn't answered here, or you're experiencing a technical issue, reach out to the InTrust support team directly.
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
