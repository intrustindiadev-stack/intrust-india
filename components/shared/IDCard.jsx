'use client';

import { motion } from 'framer-motion';
import { Camera, Activity } from 'lucide-react';
import { useState } from 'react';

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

export default function IDCard({ profile, onOpenAvatarModal }) {
    const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
    
    const userRole = profile?.role || 'employee';

    return (
        <div className="flex-shrink-0 mx-auto w-[320px] sm:w-[340px] relative font-[family-name:var(--font-outfit)]">
            {/* ID Card Container */}
            <div className="bg-[#f0f7ff] rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(14,165,233,0.15)] border border-sky-100 flex flex-col relative group">
                
                {/* Corporate Header Banner */}
                <div className="h-32 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 w-full relative flex flex-col items-center justify-start pt-6 overflow-hidden">
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform -translate-x-1/2 translate-y-1/2"></div>
                    
                    <div className="flex items-center gap-2 relative z-10">
                        <img src="/logo.png" alt="InTrust Logo" className="h-6 object-contain brightness-0 invert opacity-90" />
                        <span className="text-sm font-black text-white tracking-[0.2em] mt-0.5 opacity-90">INTRUST</span>
                    </div>
                </div>

                {/* Avatar / Photo Section */}
                <div className="flex justify-center -mt-16 relative z-10 px-6">
                    <div 
                        className="relative"
                        onMouseEnter={() => setIsHoveringAvatar(true)}
                        onMouseLeave={() => setIsHoveringAvatar(false)}
                    >
                        <div className="w-32 h-32 rounded-[2rem] bg-white p-1.5 shadow-xl shadow-sky-900/10 flex items-center justify-center overflow-hidden ring-4 ring-[#f0f7ff] transform group-hover:scale-[1.02] transition-transform duration-300">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-[1.5rem] object-cover" />
                            ) : (
                                <div className="w-full h-full rounded-[1.5rem] bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center text-4xl font-black text-blue-300">
                                    {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            )}
                            
                            {/* Hover Edit Overlay */}
                            {isHoveringAvatar && onOpenAvatarModal && (
                                <div 
                                    onClick={onOpenAvatarModal}
                                    className="absolute inset-1.5 bg-black/40 rounded-[1.5rem] backdrop-blur-md flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Camera size={24} className="text-white" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Employee Details */}
                <div className="px-8 pt-5 pb-10 text-center relative z-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile?.full_name || 'Not Provided'}</h2>
                    <p className="text-xs font-bold text-sky-600 mt-1 uppercase tracking-[0.15em]">{ROLE_LABELS[userRole] || 'Team Member'}</p>
                    
                    <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white space-y-3 shadow-sm">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Employee ID</span>
                            <span className="font-mono font-black text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">{profile?.employee_id || (profile?.id ? `INT-${profile.id.substring(0, 6).toUpperCase()}` : 'N/A')}</span>
                        </div>
                        {profile?.blood_group && (
                            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50">
                                <span className="font-bold text-slate-400 uppercase tracking-wider">Blood Group</span>
                                <span className="font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">{profile.blood_group}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/50">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">Issued</span>
                            <span className="font-black text-slate-700">{profile?.identity_issued_at ? new Date(profile.identity_issued_at).getFullYear() : new Date().getFullYear()}</span>
                        </div>
                    </div>
                </div>

                {/* Bottom tech stripe */}
                <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 absolute bottom-0 left-0" />
            </div>
        </div>
    );
}
