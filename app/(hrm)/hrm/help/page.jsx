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
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4 mb-3">Step-by-Step</p>
                            <ol className="space-y-2">
                                {mod.steps.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
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

export default function HRMHelpPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 font-[family-name:var(--font-outfit)]">
            <div className="max-w-4xl mx-auto space-y-10 pb-16">

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 sm:p-12 text-white overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-black uppercase tracking-widest mb-4 border border-white/20">
                            <HelpCircle size={12} /> Help Center
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black mb-3">HRM Panel Guide</h1>
                        <p className="text-emerald-100/80 text-sm font-medium leading-relaxed max-w-xl">
                            A complete reference for HR Managers. Learn how to use every module — from managing employees to processing payroll.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            {['Employees', 'Attendance', 'Leaves', 'Salary', 'Recruitment', 'Audit'].map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">{tag}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Quick Workflows */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-600" /> Common HR Workflows
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { title: 'Process Monthly Salary', steps: ['Go to Salary', 'Click Process on employee', 'Enter salary components', 'Save → Download PDF'], color: 'border-emerald-200 bg-emerald-50' },
                            { title: 'Approve a Leave Request', steps: ['Go to Leaves', 'Find pending request', 'Click Approve / Reject', 'Employee notified automatically'], color: 'border-violet-200 bg-violet-50' },
                            { title: 'Add a Job Posting', steps: ['Go to Jobs', 'Click "+ New Job"', 'Fill title, description, requirements', 'Publish → appears on Careers page'], color: 'border-rose-200 bg-rose-50' },
                            { title: 'Mark Attendance Manually', steps: ['Go to Attendance', 'Select date', 'Click employee name', 'Update status (Present/Absent/Late)'], color: 'border-amber-200 bg-amber-50' },
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
                            <h2 className="text-lg font-black">Need More Help?</h2>
                            <p className="text-gray-400 text-xs">Our support team is ready to assist</p>
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                        For technical issues, payroll queries, or feature requests, contact InTrust support.
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
