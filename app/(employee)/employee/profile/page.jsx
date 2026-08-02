'use client';

import { useState } from 'react';
import { User, Mail, Phone, MapPin, Building2, Shield, Edit3, Camera, Clock, CheckCircle2, ChevronRight, Activity, Award, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { displayEmail } from '@/lib/auth';
import { motion } from 'framer-motion';
import { EditProfileModal } from '@/components/employee/ProfileModals';
import AvatarCropUploadModal from '@/components/shared/AvatarCropUploadModal';
import IDCard from '@/components/shared/IDCard';
import { createClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

const ROLE_LABELS = {
    employee: 'Employee',
    relationship_exec: 'Relationship Executive',
    relationship_manager: 'Relationship Manager',
    hr_manager: 'HR Manager',
    admin: 'Admin',
    super_admin: 'Super Admin',
    freelancer: 'Freelancer',
    video_editor: 'Video Editor',
    social_media_manager: 'Social Media Manager',
    seo_specialist: 'SEO Specialist',
    advertiser: 'Advertiser',
    support_agent: 'Support Agent',
};

const COLOR_MAP = {
    employee: 'from-sky-500 to-blue-600 shadow-blue-500/20',
    relationship_exec: 'from-blue-500 to-indigo-600 shadow-indigo-500/20',
    relationship_manager: 'from-cyan-500 to-blue-600 shadow-cyan-500/20',
    hr_manager: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
    admin: 'from-violet-500 to-purple-600 shadow-violet-500/20',
    super_admin: 'from-slate-700 to-slate-900 shadow-slate-900/20',
    freelancer: 'from-orange-400 to-amber-500 shadow-amber-500/20',
    video_editor: 'from-pink-500 to-rose-600 shadow-rose-500/20',
    social_media_manager: 'from-rose-500 to-pink-600 shadow-pink-500/20',
    seo_specialist: 'from-amber-500 to-yellow-600 shadow-amber-500/20',
    advertiser: 'from-cyan-500 to-sky-600 shadow-sky-500/20',
    support_agent: 'from-indigo-500 to-violet-600 shadow-violet-500/20',
};

export default function EmployeeProfilePage() {
    const { user, profile, fetchProfile } = useAuth();
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    const userRole = profile?.role || 'employee';
    const bgGradient = COLOR_MAP[userRole] || COLOR_MAP.employee;

    const handleAvatarUpload = async (blob) => {
        const supabase = createClient();
        const fileName = `avatars/${profile.id}-${Date.now()}.jpg`;
        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);
            if (updateError) throw updateError;
            if (fetchProfile) await fetchProfile();
            toast.success('Profile photo updated!');
        } catch (err) {
            toast.error('Upload failed: ' + err.message);
            throw err;
        }
    };

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
                    <IDCard 
                        profile={profile} 
                        onOpenAvatarModal={() => setIsAvatarModalOpen(true)} 
                    />

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
            <AvatarCropUploadModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onUpload={handleAvatarUpload}
                title="Update Profile Photo"
                shape="circle"
            />
        </div>
    );
}
