'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle, BookOpen, ChevronDown, ChevronRight, Mail, Phone,
    MessageCircle, Users, Calendar, Clock, DollarSign, Shield,
    Briefcase, BookMarked, Zap, ExternalLink, UserCheck, TrendingUp
} from 'lucide-react';

const MODULES = [
    {
        icon: Users,
        title: 'Employees',
        path: '/hrm/employees',
        color: 'bg-blue-100 text-blue-700',
        description: 'View and manage all employee records.',
        steps: [
            'Go to Employees from the sidebar to see the full employee directory.',
            'Click any employee to view their profile, contact info, role, and department.',
            'Use the search bar to filter by name, role, or department.',
            'HR Managers can edit employee details and update roles.',
        ],
    },
    {
        icon: Clock,
        title: 'Attendance',
        path: '/hrm/attendance',
        color: 'bg-amber-100 text-amber-700',
        description: 'Track daily attendance across the team.',
        steps: [
            'View today\'s attendance table showing who is present, absent, or late.',
            'Filter by date to see historical attendance records.',
            'HR can manually mark attendance if an employee forgot to check in.',
            'Export attendance as CSV for payroll processing.',
        ],
    },
    {
        icon: Calendar,
        title: 'Leaves',
        path: '/hrm/leaves',
        color: 'bg-violet-100 text-violet-700',
        description: 'Manage leave requests from employees.',
        steps: [
            'The Leaves page shows all pending leave requests needing approval.',
            'Click "Approve" or "Reject" on any request — employees are notified instantly.',
            'View leave history for each employee from their profile.',
            'Leave balances are tracked automatically (casual, sick, earned).',
        ],
    },
    {
        icon: DollarSign,
        title: 'Salary / Payroll',
        path: '/hrm/salary',
        color: 'bg-emerald-100 text-emerald-700',
        description: 'Process salaries and generate payslips.',
        steps: [
            'The Salary page lists all employees with their current salary status.',
            'Click the Process icon on an employee row to set Basic, HRA, Allowances, and Deductions.',
            'The system calculates Net Pay automatically.',
            'After processing, download the payslip PDF with company letterhead.',
            'Payslip is also available to employees in their Employee Portal.',
        ],
    },
    {
        icon: Briefcase,
        title: 'Jobs & Recruitment',
        path: '/hrm/jobs',
        color: 'bg-rose-100 text-rose-700',
        description: 'Manage open positions and applications.',
        steps: [
            'Create job postings from the Jobs page — they appear on the careers page.',
            'View applications in Recruitment — filter by status (pending, interview, hired, rejected).',
            'Update application status and add interview notes.',
            'Archive a job posting to stop new applications.',
        ],
    },
    {
        icon: BookMarked,
        title: 'Training',
        path: '/hrm/training',
        color: 'bg-indigo-100 text-indigo-700',
        description: 'Manage employee training programs.',
        steps: [
            'Create training sessions with topic, trainer, and date.',
            'Assign sessions to specific employees or all staff.',
            'Employees can see their assigned training in the Employee Portal.',
            'Mark sessions as complete when done.',
        ],
    },
    {
        icon: Shield,
        title: 'Audit Logs',
        path: '/hrm/audit',
        color: 'bg-gray-100 text-gray-700',
        description: 'Track all sensitive HR actions.',
        steps: [
            'Audit Logs record every important action: salary processed, leaves approved, role changes.',
            'Filter by actor, action type, date range, or severity.',
            'Use audit logs for compliance and accountability reporting.',
        ],
    },
];

const FAQS = [
    { q: 'How do I approve a leave request?', a: 'Go to Leaves in the sidebar. Find the pending request and click the green "Approve" button. The employee receives an instant notification.' },
    { q: 'How is Net Salary calculated?', a: 'Net Salary = Basic Salary + HRA + Allowances − Deductions. The system calculates this automatically when you fill in the salary details.' },
    { q: 'Can employees see their salary?', a: 'Yes. After you process a salary, employees can view and download their payslip from the Employee Portal under "Payslips".' },
    { q: 'How do I add a new employee?', a: 'Employees are added by creating their account from the user management system (Admin panel or user signup). Once created, their profile appears in HRM Employees.' },
    { q: 'What is the difference between Jobs and Recruitment?', a: 'Jobs are the open positions you post. Recruitment shows applications received for those jobs. Create a job → candidates apply → manage via Recruitment.' },
    { q: 'Who can access the HRM panel?', a: 'Only users with the HR Manager, Admin, or Super Admin role can access the HRM panel.' },
];

function AccordionItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/80 transition-colors gap-4">
                <span className="font-bold text-gray-800 text-sm">{q}</span>
                {open ? <ChevronDown size={16} className="text-emerald-600 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
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
                    <p className="font-black text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">{mod.title}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{mod.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 relative z-10">
                    <Link href={mod.path} onClick={(e) => e.stopPropagation()} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/10 text-[10px] font-bold text-emerald-700 hover:bg-emerald-600/20 transition-colors">
                        Open <ExternalLink size={12} />
                    </Link>
                    <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center shadow-sm group-hover:bg-white transition-colors">
                        {open ? <ChevronDown size={16} className="text-emerald-600" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                </div>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 border-t border-white/40 bg-white/30">
                            <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mt-4 mb-3">Step-by-Step Guide</p>
                            <ol className="space-y-3">
                                {mod.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 shadow-md shadow-emerald-600/20 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
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

export default function HRMHelpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)] relative overflow-hidden">
            {/* Ambient Background Blur */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-teal-400/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-4xl mx-auto space-y-10 pb-16 relative z-10">

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 rounded-3xl p-8 sm:p-12 text-white overflow-hidden shadow-2xl shadow-emerald-900/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20 shadow-inner">
                            <HelpCircle size={12} className="text-emerald-300" /> HR Center
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">HRM Panel Guide</h1>
                        <p className="text-emerald-50/90 text-sm sm:text-base font-medium leading-relaxed max-w-xl mb-8">
                            Everything you need to know about the InTrust HRM Panel — from managing employee records to processing salaries.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {['Employees', 'Attendance', 'Leaves', 'Payroll', 'Jobs'].map((tag, i) => (
                                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + (i * 0.05) }} key={tag} className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-sm">
                                    {tag}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Quick Workflows */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-600" /> Common HR Workflows
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { title: 'Process Monthly Salary', steps: ['Go to Salary', 'Click Process on employee', 'Enter salary components', 'Save → Download PDF'], color: 'border-emerald-200 bg-emerald-50/50' },
                            { title: 'Approve a Leave Request', steps: ['Go to Leaves', 'Find pending request', 'Click Approve / Reject', 'Employee notified automatically'], color: 'border-violet-200 bg-violet-50/50' },
                            { title: 'Add a Job Posting', steps: ['Go to Jobs', 'Click "+ New Job"', 'Fill title, description, requirements', 'Publish → appears on Careers page'], color: 'border-rose-200 bg-rose-50/50' },
                            { title: 'Mark Attendance Manually', steps: ['Go to Attendance', 'Select date', 'Click employee name', 'Update status (Present/Absent/Late)'], color: 'border-amber-200 bg-amber-50/50' },
                        ].map(wf => (
                            <div key={wf.title} className={`p-4 rounded-2xl border ${wf.color}`}>
                                <p className="font-black text-gray-900 text-sm mb-3">{wf.title}</p>
                                <ol className="space-y-1.5">
                                    {wf.steps.map((s, i) => (
                                        <li key={i} className="flex gap-2 text-xs text-gray-600">
                                            <span className="w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">{i + 1}</span>
                                            {s}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Module Guides */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-emerald-600" /> Module Guides
                    </h2>
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <a href="mailto:intrustindiadev@gmail.com" className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 group">
                                <Mail size={18} className="text-emerald-300 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Email Support</p>
                                    <p className="text-sm font-bold text-white group-hover:text-emerald-200 transition-colors">intrustindiadev@gmail.com</p>
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
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
