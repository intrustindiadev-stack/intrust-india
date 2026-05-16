'use client';

import { Mail, Phone, Camera, Loader2, Star } from 'lucide-react';
import GoldBadge from '@/components/ui/GoldBadge';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { displayName as authDisplayName, displayEmail, formatIndianPhone } from '@/lib/auth';

const supabase = createClient();

function AvatarUpload({ userId, avatarUrl, displayName, onUpload }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || 'U';

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { onUpload(null, 'Please select an image'); return; }
        if (file.size > 5 * 1024 * 1024) { onUpload(null, 'Image must be under 5MB'); return; }

        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${userId}/avatar.${ext}`;
            const { error } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            onUpload(`${data.publicUrl}?t=${Date.now()}`, null);
        } catch (err) {
            console.error('Avatar upload error:', err);
            onUpload(null, 'Upload failed. Is the avatars bucket created + public?');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div
            className="relative w-28 h-28 mx-auto mb-6 cursor-pointer group"
            onClick={() => !uploading && fileRef.current?.click()}
        >
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-white/10 group-hover:ring-amber-500/50 transition-all duration-500"
                />
            ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center text-white text-4xl font-black shadow-2xl ring-4 ring-white/10 group-hover:ring-amber-500/50 transition-all duration-500">
                    {initial}
                </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                {uploading
                    ? <Loader2 size={24} className="text-white animate-spin" />
                    : <Camera size={24} className="text-white" />
                }
            </div>
            <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg border-2 border-black pointer-events-none">
                <Camera size={14} className="text-black" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
    );
}

export default function ProfileHero({ user, profile, onAvatarUpload }) {
    const name = authDisplayName(profile, user);
    const joinYear = new Date(profile?.created_at || user.created_at).getFullYear();
    const isGold = !!profile?.is_gold_verified;
    const kycStatus = profile?.kyc_status || 'not_started';

    return (
        <div
            className={`
                relative overflow-hidden rounded-[2.5rem] border p-8 transition-all duration-700
                ${isGold
                    ? 'bg-white dark:bg-[#0a0f1d] border-amber-500/20 shadow-[0_20px_50px_rgba(212,175,55,0.1)]'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-xl'
                }
            `}
        >
            {isGold && (
                <>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] dark:opacity-[0.05]" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-yellow-500/3 blur-[100px] rounded-full" />
                </>
            )}

            <AvatarUpload
                userId={user.id}
                avatarUrl={profile?.avatar_url}
                displayName={name}
                onUpload={onAvatarUpload}
            />

            <div className={`text-center mb-8 pb-8 border-b ${isGold ? 'border-amber-500/10' : 'border-gray-50 dark:border-gray-800'}`}>
                <h2 className={`text-3xl font-black tracking-tight flex items-center justify-center gap-3 mb-2 ${isGold ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-500 to-amber-700 dark:from-amber-200 dark:to-amber-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {name}
                    {isGold && <GoldBadge size="md" />}
                </h2>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isGold ? 'text-amber-600 dark:text-amber-500/40' : 'text-gray-400 dark:text-gray-500'}`}>
                    Premium Member since {joinYear}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    <span className={`inline-block text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-sm border ${kycStatus === 'verified' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                        kycStatus === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-gray-500/10 border-gray-500/20 text-gray-500'
                        }`}>
                        {kycStatus === 'verified' ? '✓ Identity Verified' :
                            kycStatus === 'pending' ? 'Verification Pending' : 'Identity Unverified'}
                    </span>
                    {isGold && (
                        <span className="inline-block text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 text-black shadow-lg shadow-amber-500/20 border border-white/20">
                            Elite Status
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="group flex items-center gap-5 p-5 rounded-3xl transition-all hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent hover:border-blue-500/10 dark:hover:border-white/10 shadow-sm hover:shadow-md cursor-default transition-all duration-300">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 ${isGold ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                        <Mail size={20} className={isGold ? 'text-amber-500' : 'text-blue-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mb-1">Primary Email</p>
                        <p className={`text-sm font-bold truncate ${isGold ? 'text-amber-900 dark:text-amber-100/90' : 'text-gray-900 dark:text-gray-100'}`}>
                            {displayEmail(user.email) || profile?.email || 'Not Linked'}
                        </p>
                    </div>
                </div>

                <div className="group flex items-center gap-5 p-5 rounded-3xl transition-all hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent hover:border-blue-500/10 dark:hover:border-white/10 shadow-sm hover:shadow-md cursor-default transition-all duration-300">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 ${isGold ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                        <Phone size={20} className={isGold ? 'text-amber-500' : 'text-blue-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mb-1">Contact Number</p>
                        <p className={`text-sm font-bold truncate ${isGold ? 'text-amber-900 dark:text-amber-100/90' : 'text-gray-900 dark:text-gray-100'}`}>
                            {formatIndianPhone(profile?.phone || user.phone) || 'Not Linked'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
