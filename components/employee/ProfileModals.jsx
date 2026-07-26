'use client';

import { useState } from 'react';
import { X, UploadCloud, Loader2, Save, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';

export function EditProfileModal({ isOpen, onClose, profile, fetchProfile }) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        city: profile?.city || '',
        department: profile?.department || '',
        blood_group: profile?.blood_group || '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const supabase = createClient();
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', profile.id);

            if (error) throw error;
            if (fetchProfile) await fetchProfile();
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-8 pb-4 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Edit Identity</h2>
                        <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Update your details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5 flex-1 overflow-y-auto max-h-[60vh]">
                    <div>
                        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                        <input 
                            type="text" 
                            required
                            value={formData.full_name} 
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                            <input 
                                type="tel" 
                                value={formData.phone} 
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Blood Group</label>
                            <select 
                                value={formData.blood_group} 
                                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm appearance-none"
                            >
                                <option value="">Select</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">City / Location</label>
                        <input 
                            type="text" 
                            value={formData.city} 
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Department</label>
                        <input 
                            type="text" 
                            value={formData.department} 
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 flex justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export function AvatarUploadModal({ isOpen, onClose, profile, fetchProfile }) {
    const [isLoading, setIsLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    if (!isOpen) return null;

    const handleFile = async (file) => {
        if (!file) return;
        setIsLoading(true);
        const supabase = createClient();
        
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase Storage (assuming bucket 'avatars' exists)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;
            
            if (fetchProfile) await fetchProfile();
            onClose();
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload avatar. Check storage permissions.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-sm shadow-2xl relative z-10 overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-8 pb-4 flex justify-between items-center text-center flex-col relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                    <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center mb-4">
                        <UploadCloud size={32} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Update Photo</h2>
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">PNG, JPG up to 5MB</p>
                </div>

                <div className="p-8 pt-0">
                    <label 
                        className={`
                            border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center
                            ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900/50'}
                            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                        `}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                            handleFile(e.dataTransfer.files[0]);
                        }}
                    >
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleFile(e.target.files[0])}
                        />
                        {isLoading ? (
                            <Loader2 size={32} className="animate-spin text-blue-500 mb-2" />
                        ) : (
                            <Camera size={32} className="text-gray-400 mb-2" />
                        )}
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Click or drag image here</p>
                    </label>
                </div>
            </div>
        </div>
    );
}
