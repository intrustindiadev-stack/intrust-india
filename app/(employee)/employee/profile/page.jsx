'use client';

import { useState } from 'react';
import { User, Mail, Phone, MapPin, Building2, Shield, Edit3, Camera, Clock, CheckCircle2, ChevronRight, Activity, Award, QrCode, X, UploadCloud, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { displayEmail } from '@/lib/auth';
import { motion } from 'framer-motion';
import { EditProfileModal, AvatarUploadModal } from '@/components/employee/ProfileModals';

const ROLE_LABELS = {
    employee: 'Employee', sales_exec: 'Sales Executive', sales_manager: 'Sales Manager',
    hr_manager: 'HR Manager', admin: 'Admin', super_admin: 'Super Admin',
};

const COLOR_MAP = {
    employee: 'from-sky-500 to-blue-600 shadow-blue-500/20',
    sales_exec: 'from-blue-500 to-indigo-600 shadow-indigo-500/20',
    sales_manager: 'from-cyan-500 to-blue-600 shadow-cyan-500/20',
    hr_manager: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
    admin: 'from-violet-500 to-purple-600 shadow-violet-500/20',
    super_admin: 'from-slate-700 to-slate-900 shadow-slate-900/20',
};

export default function EmployeeProfilePage() {
    const { user, profile, fetchProfile } = useAuth();
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    const userRole = profile?.role || 'employee';
    const bgGradient = COLOR_MAP[userRole] || COLOR_MAP.employee;

    const details = [
        { icon: Mail, label: 'Email Address', value: displayEmail(profile?.email) || displayEmail(user?.email) || 'Not Provided', color: 'text-blue-500', bg: 'bg-blue-50' },
        { icon: Phone, label: 'Phone Number', value: profile?.phone || 'Not Provided', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { icon: MapPin, label: 'Location', value: profile?.city || 'Gurugram HQ', color: 'text-rose-500', bg: 'bg-rose-50' },
        { icon: Building2, label: 'Department', value: profile?.department || 'Operations', color: 'text-sky-500', bg: 'bg-sky-50' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 min-h-screen font-[family-name:var(--font-outfit)] bg-[#F8FAFC] dark:bg-gray-900 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-sky-50/80 dark:from-sky-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-0 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-40 left-0 w-96 h-96 bg-sky-200/30 dark:bg-sky-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto space-y-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl border border-white/60 dark:border-gray-700 shadow-sm shadow-sky-500/5">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-xs font-bold w-fit border border-blue-200/50 backdrop-blur-sm mb-2">
                            <Shield size={14} /> Identity Management
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Your Digital Identity</h1>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">Manage your access card and personal details.</p>
                    </motion.div>
                    <motion.button 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95 text-sm"
                    >
                        <Edit3 size={16} />
                        Edit Details
                    </motion.button>
                </div>

                <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
                    {/* Left: Office ID Card Simulation */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                        className="flex-shrink-0 mx-auto lg:mx-0 relative w-[320px] sm:w-[340px]"
                    >
                        {/* Animated Mesh Background Behind Card */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 rounded-[2.5rem] blur-2xl opacity-40 animate-pulse pointer-events-none" />

                        {/* ID Card Container */}
                        <div className={`relative z-10 bg-gradient-to-br ${bgGradient} rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-900/20 dark:shadow-black/50 border border-white/20 backdrop-blur-xl flex flex-col items-center pb-12 overflow-hidden hover:-translate-y-2 transition-transform duration-500 cursor-default`}>
                            {/* Card Decorative Mesh */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

                            {/* Card Header Branding */}
                            <div className="w-full flex justify-between items-start mt-4 mb-8">
                                <div className="flex items-center gap-2">
                                    <img src="/logo.png" alt="InTrust Logo" className="h-5 object-contain brightness-0 invert" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-0.5">INTRUST</span>
                                </div>
                                <Activity size={18} className="opacity-80" />
                            </div>

                            {/* Avatar */}
                            <div 
                                className="relative mb-6"
                                onMouseEnter={() => setIsHoveringAvatar(true)}
                                onMouseLeave={() => setIsHoveringAvatar(false)}
                            >
                                <div className="w-36 h-36 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-6xl font-black border-[6px] border-white/40 shadow-2xl relative overflow-hidden transition-all duration-300">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        profile?.full_name?.charAt(0)?.toUpperCase() || '?'
                                    )}
                                    
                                    {/* Hover Edit Overlay */}
                                    {isHoveringAvatar && (
                                        <div 
                                            onClick={() => setIsAvatarModalOpen(true)}
                                            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all"
                                        >
                                            <Camera size={32} className="text-white opacity-90" />
                                        </div>
                                    )}
                                </div>
                                {/* Verification Badge */}
                                <div className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-xl border-4 border-transparent flex items-center justify-center text-blue-600 -mr-2">
                                    <CheckCircle2 size={24} fill="currentColor" className="text-white" />
                                </div>
                            </div>

                            {/* Details */}
                            <div className="text-center w-full">
                                <h2 className="text-2xl font-black tracking-tight leading-tight">{profile?.full_name || 'Your Name'}</h2>
                                <p className="text-sm font-bold text-white/80 mt-1 uppercase tracking-widest">{ROLE_LABELS[userRole] || 'Team Member'}</p>
                                
                                <div className="mt-6 w-full h-[1px] bg-white/20 rounded-full" />
                                
                                <div className="mt-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-xs font-bold font-mono text-white/90">
                                        <span className="opacity-60 uppercase">Emp ID</span>
                                        <span>INT-{profile?.id?.substring(0, 6).toUpperCase() || '000000'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold font-mono text-white/90">
                                        <span className="opacity-60 uppercase">Blood Grp</span>
                                        <span>{profile?.blood_group || 'O+'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold font-mono text-white/90">
                                        <span className="opacity-60 uppercase">Issued</span>
                                        <span>{new Date().getFullYear()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barcode Footer */}
                            <div className="absolute bottom-0 inset-x-0 h-16 bg-white flex items-center justify-center gap-2 rounded-b-[2rem]">
                                {[...Array(24)].map((_, i) => (
                                    <div key={i} className={`h-8 bg-black rounded-sm ${i % 3 === 0 ? 'w-2' : i % 2 === 0 ? 'w-1' : 'w-0.5'}`} />
                                ))}
                            </div>

                            {/* Glossy Overlay */}
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none rounded-[2rem]" />
                        </div>
                    </motion.div>

                    {/* Right: Floating Information Widgets */}
                    <div className="flex-1 space-y-6 w-full">
                        {/* Contact Information Grid */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden"
                        >
                            <div className="p-8 pb-4">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Contact Information</h3>
                                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Your primary details</p>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {details.map((detail, index) => (
                                    <div key={index} className="flex items-start gap-5 p-5 rounded-[1.5rem] bg-gray-50/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-none transition-all group border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${detail.bg} ${detail.color}`}>
                                            <detail.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{detail.label}</p>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 break-all">{detail.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Account Activity */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden"
                        >
                            <div className="p-8 pb-4">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Account Activity</h3>
                                <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Recent events</p>
                            </div>
                            <div className="p-8 pt-2">
                                <div className="space-y-6">
                                    {[
                                        { title: 'Clocked In', time: 'Today at 09:02 AM', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { title: 'Profile Updated', time: 'Yesterday at 14:30 PM', icon: Edit3, color: 'text-sky-500', bg: 'bg-sky-50' },
                                        { title: 'Security Check Passed', time: 'Last Week', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 group">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.bg} ${item.color}`}>
                                                <item.icon size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.title}</h4>
                                                <p className="text-xs font-semibold text-gray-400 mt-0.5">{item.time}</p>
                                            </div>
                                            <button className="w-8 h-8 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all">
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            <EditProfileModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                profile={profile} 
                fetchProfile={fetchProfile} 
            />
            <AvatarUploadModal 
                isOpen={isAvatarModalOpen} 
                onClose={() => setIsAvatarModalOpen(false)} 
                profile={profile} 
                fetchProfile={fetchProfile} 
            />
        </div>
    );
}
