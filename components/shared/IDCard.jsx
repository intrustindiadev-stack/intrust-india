'use client';

import { motion } from 'framer-motion';
import { Camera, CheckCircle2, Activity } from 'lucide-react';
import { useState } from 'react';

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

export default function IDCard({ profile, onOpenAvatarModal }) {
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    
    const userRole = profile?.role || 'employee';
    const bgGradient = COLOR_MAP[userRole] || COLOR_MAP.employee;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
            className="flex-shrink-0 mx-auto relative w-[320px] sm:w-[340px]"
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
                        {isHoveringAvatar && onOpenAvatarModal && (
                            <div 
                                onClick={onOpenAvatarModal}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all"
                            >
                                <Camera size={32} className="text-white opacity-90" />
                            </div>
                        )}
                    </div>
                    {/* Verification Badge */}
                    <div className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 rounded-full shadow-xl border-[3px] border-white flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-white" fill="white" />
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
    );
}
