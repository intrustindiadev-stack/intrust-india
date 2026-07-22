'use client';

import { useState } from 'react';
import { User, Mail, Phone, MapPin, Building2, Shield, QrCode, Printer, Edit3, CheckCircle, CreditCard, HeartPulse, Sparkles, X, Save, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { displayEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const ROLE_LABELS = {
    employee: 'Employee', sales_exec: 'Sales Executive', sales_manager: 'Sales Manager',
    hr_manager: 'HR Manager', admin: 'Admin', super_admin: 'Super Admin',
};

export default function EmployeeProfilePage() {
    const { user, profile, refreshProfile } = useAuth();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [saving, setSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        phone: profile?.phone || '',
        city: profile?.city || '',
        address: profile?.address || '',
        emergency_contact: profile?.emergency_contact || '',
        emergency_phone: profile?.emergency_phone || '',
    });

    const empId = `EMP-${user?.id?.substring(0, 6)?.toUpperCase() || '1024'}`;
    const joiningDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '01 Jan 2024';

    const handleOpenEdit = () => {
        setEditForm({
            phone: profile?.phone || '',
            city: profile?.city || '',
            address: profile?.address || '',
            emergency_contact: profile?.emergency_contact || '',
            emergency_phone: profile?.emergency_phone || '',
        });
        setShowEditModal(true);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    phone: editForm.phone,
                    city: editForm.city,
                    address: editForm.address,
                    emergency_contact: editForm.emergency_contact,
                    emergency_phone: editForm.emergency_phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Profile details updated successfully!');
            if (refreshProfile) await refreshProfile();
            setShowEditModal(false);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handlePrintBadge = () => {
        window.print();
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen font-[family-name:var(--font-outfit)] bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Employee Digital Identity</h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Verified credential badge and official personnel file.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrintBadge}
                        className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-bold border border-gray-200 dark:border-gray-700 shadow-sm text-sm transition-all"
                    >
                        <Printer size={16} /> Export Badge
                    </button>
                    <button
                        onClick={handleOpenEdit}
                        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl font-black shadow-lg shadow-amber-500/20 text-sm transition-all gold-glow"
                    >
                        <Edit3 size={16} /> Edit Details
                    </button>
                </div>
            </div>

            {/* DIGITAL EMPLOYEE ID BADGE CARD */}
            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30 ring-1 ring-white/10"
                >
                    {/* Holographic Background Glow */}
                    <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

                    {/* Badge Top Header */}
                    <div className="flex justify-between items-center pb-6 border-b border-white/10 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md border border-white/20">
                                <Image src="/icon.png" alt="INTRUST" width={40} height={40} className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-yellow-200">INTRUST INDIA</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official Access Pass</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                                <CheckCircle size={14} /> ACTIVE VERIFIED
                            </span>
                        </div>
                    </div>

                    {/* Badge Content Area */}
                    <div className="py-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 shadow-xl shadow-amber-500/20">
                                <div className="w-full h-full rounded-[22px] bg-slate-900 flex items-center justify-center text-4xl font-black text-amber-400 overflow-hidden relative">
                                    {profile?.avatar_url ? (
                                        <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
                                    ) : (
                                        profile?.full_name?.charAt(0)?.toUpperCase() || 'E'
                                    )}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg border-2 border-slate-900">
                                <Sparkles size={16} />
                            </div>
                        </div>

                        {/* Info details */}
                        <div className="flex-1 text-center sm:text-left space-y-3">
                            <div>
                                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">{empId}</span>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5 text-white">{profile?.full_name || 'Employee Name'}</h2>
                                <p className="text-slate-300 text-sm font-semibold mt-1">{ROLE_LABELS[profile?.role] || profile?.role || 'Team Member'}</p>
                            </div>

                            <div className="pt-2 grid grid-cols-2 gap-3 text-xs border-t border-white/10">
                                <div>
                                    <p className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Department</p>
                                    <p className="font-bold text-slate-200 mt-0.5">{profile?.department || 'General'}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">Joined</p>
                                    <p className="font-bold text-slate-200 mt-0.5">{joiningDate}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick QR Code trigger */}
                        <button
                            onClick={() => setShowQrModal(true)}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-amber-400 transition-colors shrink-0 flex flex-col items-center gap-1 group"
                        >
                            <QrCode size={28} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Show QR</span>
                        </button>
                    </div>

                    {/* Security Barcode Footer */}
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400 font-mono relative z-10">
                        <span>SECURITY HASH: {user?.id?.substring(0, 16) || 'SEC-8492048204'}</span>
                        <span>INTRUST INDIA VERIFIED</span>
                    </div>
                </motion.div>
            </div>

            {/* DETAILS MULTI-CARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal & Contact Details */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">Contact Information</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Personal communication channels</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Mail size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{displayEmail(profile?.email) || displayEmail(user?.email) || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mobile Number</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{profile?.phone || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">City / Location</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{profile?.city || '—'}</p>
                            </div>
                        </div>
                        {profile?.address && (
                            <div className="flex items-start gap-3">
                                <Building2 size={16} className="text-gray-400 mt-1 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Address</p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{profile.address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Employment & Role Details */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">Employment Details</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Organization & designation</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Shield size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Access Role</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{ROLE_LABELS[profile?.role] || profile?.role || 'Employee'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Building2 size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Department</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{profile?.department || 'General Workforce'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Calendar size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date of Joining</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{joiningDate}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <User size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reporting Manager</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">HR Operations Department</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Emergency & Banking Info */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <HeartPulse size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">Emergency & Verification</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Emergency contact & compliance</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <HeartPulse size={16} className="text-rose-500 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency Contact</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                                    {profile?.emergency_contact ? `${profile.emergency_contact} (${profile.emergency_phone || '—'})` : 'Not configured'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CreditCard size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bank Account Status</p>
                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                    <CheckCircle size={14} /> Verified for Payroll
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Shield size={16} className="text-gray-400 mt-1 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">KYC Compliance</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 capitalize">
                                    {profile?.kyc_status || 'Verified'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* EDIT PROFILE DETAILS MODAL */}
            <AnimatePresence>
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-6"
                        >
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Edit3 size={20} className="text-amber-500" /> Edit Profile Details
                                </h3>
                                <button onClick={() => setShowEditModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold outline-none focus:border-amber-500"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City / Location</label>
                                        <input
                                            type="text"
                                            value={editForm.city}
                                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold outline-none focus:border-amber-500"
                                            placeholder="Mumbai"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emergency Contact Name</label>
                                        <input
                                            type="text"
                                            value={editForm.emergency_contact}
                                            onChange={e => setEditForm({ ...editForm, emergency_contact: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold outline-none focus:border-amber-500"
                                            placeholder="Relative Name"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emergency Phone Number</label>
                                    <input
                                        type="tel"
                                        value={editForm.emergency_phone}
                                        onChange={e => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold outline-none focus:border-amber-500"
                                        placeholder="+91 98765 00000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Residential Address</label>
                                    <textarea
                                        rows={3}
                                        value={editForm.address}
                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white font-semibold outline-none focus:border-amber-500 resize-none"
                                        placeholder="Full home address..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* QR CODE MODAL */}
            <AnimatePresence>
                {showQrModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 dark:text-white text-base">Digital Pass QR Code</h3>
                                <button onClick={() => setShowQrModal(false)} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 bg-slate-900 rounded-2xl border border-amber-500/30 inline-block mx-auto shadow-inner">
                                <QrCode size={160} className="text-amber-400 mx-auto" />
                            </div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 font-mono">{empId} · {profile?.full_name}</p>
                            <p className="text-[11px] text-gray-400">Scan at office turnstiles or check-in kiosks.</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
