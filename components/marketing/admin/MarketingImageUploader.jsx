'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Loader2, Image as ImageIcon, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MarketingImageUploader({
    value = '',
    onChange,
    label = 'Physical Gift Image',
    disabled = false
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [useManualUrl, setUseManualUrl] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (PNG, JPG, WebP)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10 MB');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Uploading prize image...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/marketing/upload-image', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to upload image');
            }

            onChange(data.url);
            toast.success('Image uploaded successfully!', { id: toastId });
        } catch (err) {
            console.error('Image upload failed:', err);
            toast.error(err.message || 'Image upload failed', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled && !isUploading) setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={() => setUseManualUrl(prev => !prev)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    <LinkIcon size={10} />
                    <span>{useManualUrl ? 'Switch to File Upload' : 'Paste Image URL instead'}</span>
                </button>
            </div>

            {useManualUrl ? (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="https://... or /marketing/prizes/..."
                        disabled={disabled}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    {value && (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950">
                            <Image src={value} alt="Preview" fill className="object-cover" />
                        </div>
                    )}
                </div>
            ) : value ? (
                /* Uploaded Image Preview Card */
                <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-3 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 bg-slate-950 shrink-0 shadow-xs">
                        <Image
                            src={value}
                            alt="Prize Preview"
                            fill
                            sizes="64px"
                            className="object-cover"
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                            <CheckCircle2 size={11} />
                            Image Ready
                        </span>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {value.split('/').pop()}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                            {value}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || isUploading}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                        >
                            Change
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            disabled={disabled || isUploading}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>
            ) : (
                /* Drag & Drop Upload Zone */
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                        isDragOver
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                        }}
                        className="hidden"
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                            <Loader2 size={24} className="animate-spin text-blue-600" />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                Uploading image...
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-1">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                                <UploadCloud size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Click or drag &amp; drop to upload gift photo
                            </span>
                            <span className="text-[10px] text-slate-400">
                                Supports JPG, PNG, WebP up to 10 MB
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
