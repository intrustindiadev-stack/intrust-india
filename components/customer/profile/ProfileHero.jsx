'use client';

import { Camera, Loader2, Edit2 } from 'lucide-react';
import GoldBadge from '@/components/ui/GoldBadge';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseClient';
import { displayName as authDisplayName } from '@/lib/auth';

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
            className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex-shrink-0 cursor-pointer group"
            onClick={() => !uploading && fileRef.current?.click()}
        >
            {avatarUrl ? (
                <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
                    className="rounded-full object-cover shadow-xl ring-4 ring-white/10 group-hover:ring-amber-500/50 transition-all duration-500"
                />
            ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-xl ring-4 ring-white/10 group-hover:ring-amber-500/50 transition-all duration-500">
                    {initial}
                </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                {uploading
                    ? <Loader2 size={24} className="text-white animate-spin" />
                    : <Camera size={24} className="text-white" />
                }
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900 pointer-events-none">
                <Camera size={12} className="text-black" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
    );
}

export default function ProfileHero({ user, profile, onAvatarUpload, onEditClick }) {
    const name = authDisplayName(profile, user);
    const joinYear = new Date(profile?.created_at || user.created_at).getFullYear();
    const isGold = !!profile?.is_gold_verified;
    const kycStatus = profile?.kyc_status || 'not_started';

    return (
        <section
            className={`
                relative flex flex-col items-center text-center space-y-4 mb-8 w-full
                ${isGold
                    ? 'p-8 rounded-2xl bg-white dark:bg-[#0a0f1d] border border-amber-500/20 shadow-[0_20px_50px_rgba(212,175,55,0.05)] overflow-hidden'
                    : ''
                }
            `}
        >
            {isGold && (
                <>
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] dark:opacity-[0.05]" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-yellow-500/3 blur-[100px] rounded-full pointer-events-none" />
                </>
            )}

            <div className="relative inline-block z-10">
                <AvatarUpload
                    userId={user.id}
                    avatarUrl={profile?.avatar_url}
                    displayName={name}
                    onUpload={onAvatarUpload}
                />
            </div>

            <div className="flex flex-col items-center z-10 w-full mt-2">
                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight flex items-center justify-center gap-2 mb-1 ${isGold ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-500 to-amber-700 dark:from-amber-200 dark:to-amber-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    <span className="truncate">{name}</span>
                    {isGold ? (
                        <GoldBadge size="sm" className="flex-shrink-0" />
                    ) : (
                        kycStatus === 'verified' && <VerifiedBadge size="sm" className="flex-shrink-0" />
                    )}
                </h2>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isGold ? 'text-amber-600 dark:text-amber-500/50' : 'text-gray-500 dark:text-gray-400'}`}>
                    Member since {joinYear}
                </p>

                {isGold && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                        <span className="inline-block text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 text-black shadow-sm border border-white/20">
                            Elite
                        </span>
                    </div>
                )}

                <button
                    onClick={onEditClick}
                    className={`mt-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all active:scale-95 border flex items-center justify-center gap-2 min-h-[44px] shadow-sm ${isGold ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                >
                    <Edit2 size={14} />
                    <span>Edit Profile</span>
                </button>
            </div>
        </section>
    );
}
