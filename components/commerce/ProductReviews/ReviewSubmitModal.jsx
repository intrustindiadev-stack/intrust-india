'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Upload, Trash2, Loader2, Sparkles, AlertCircle, BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

const RATING_LABELS = {
    1: '1 Star — Poor',
    2: '2 Stars — Fair',
    3: '3 Stars — Average',
    4: '4 Stars — Good',
    5: '5 Stars — Excellent',
};

export default function ReviewSubmitModal({
    isOpen,
    onClose,
    productId,
    productTitle,
    currentUser,
    existingReview = null,
    onSubmitSuccess
}) {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [mediaUrls, setMediaUrls] = useState([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Initialize or reset form state
    useEffect(() => {
        if (existingReview) {
            setRating(existingReview.rating || 5);
            setTitle(existingReview.title || '');
            setComment(existingReview.comment || '');
            setMediaUrls(existingReview.media_urls || []);
        } else {
            setRating(5);
            setTitle('');
            setComment('');
            setMediaUrls([]);
        }
        setHoverRating(0);
    }, [existingReview, isOpen]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !submitting && !uploadingFiles) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, submitting, uploadingFiles, onClose]);

    if (!isOpen) return null;

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const remainingSlots = 4 - mediaUrls.length;
        if (remainingSlots <= 0) {
            toast.error('You can upload a maximum of 4 photos.');
            return;
        }

        const validFiles = [];
        for (const file of files.slice(0, remainingSlots)) {
            // Check MIME
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
                toast.error(`${file.name} is not a supported format (JPEG, PNG, WEBP only).`);
                continue;
            }
            // Check size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} exceeds 5MB size limit.`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        setUploadingFiles(true);
        const supabase = createClient();
        const uploadedUrls = [];

        try {
            for (const file of validFiles) {
                const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
                const fileName = `${crypto.randomUUID()}.${ext}`;
                const filePath = `reviews/${productId}/${currentUser?.id || 'anon'}/${fileName}`;

                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('review-media')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadErr) {
                    console.error('[Upload Review Media Error]:', uploadErr);
                    toast.error(`Failed to upload ${file.name}`);
                    continue;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('review-media')
                    .getPublicUrl(uploadData.path);

                uploadedUrls.push(publicUrl);
            }

            setMediaUrls(prev => [...prev, ...uploadedUrls].slice(0, 4));
        } catch (uploadException) {
            console.error('[Upload Exception]:', uploadException);
            toast.error('Error uploading photos');
        } finally {
            setUploadingFiles(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = (indexToRemove) => {
        setMediaUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            toast.error('Please log in to submit a review');
            return;
        }

        if (!comment.trim()) {
            toast.error('Please write a comment describing your experience');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/shopping/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    rating,
                    title: title.trim() || null,
                    comment: comment.trim(),
                    mediaUrls
                })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Failed to submit review');
            }

            toast.success(existingReview ? 'Review updated successfully!' : 'Thank you! Your review has been posted.');
            onSubmitSuccess(result.data, result.summary);
            onClose();
        } catch (err) {
            console.error('[Submit Review Error]:', err);
            toast.error(err.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    const activeStar = hoverRating || rating;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10 my-auto"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10">
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                {existingReview ? 'Edit Your Review' : 'Rate & Review Product'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5">
                                {productTitle || 'Product'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting || uploadingFiles}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                        {/* Interactive Star Selection */}
                        <div className="space-y-2 text-center py-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Overall Rating
                            </label>
                            <div className="flex items-center justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        className="p-1 transition-transform hover:scale-125 active:scale-95 focus:outline-hidden"
                                    >
                                        <Star
                                            size={32}
                                            className={`transition-colors ${
                                                star <= activeStar
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-slate-200 dark:text-slate-700'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 h-4">
                                {RATING_LABELS[activeStar] || ''}
                            </div>
                        </div>

                        {/* Review Title */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <label htmlFor="review-title" className="font-bold text-slate-700 dark:text-slate-300">
                                    Review Title <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <span className="text-slate-400">{title.length}/120</span>
                            </div>
                            <input
                                id="review-title"
                                type="text"
                                maxLength={120}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Exceptional quality, fits perfectly!"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-400"
                            />
                        </div>

                        {/* Review Body */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <label htmlFor="review-comment" className="font-bold text-slate-700 dark:text-slate-300">
                                    Detailed Feedback <span className="text-red-500">*</span>
                                </label>
                                <span className={`text-xs ${comment.length > 1900 ? 'text-amber-500 font-bold' : 'text-slate-400'}`}>
                                    {comment.length}/2000
                                </span>
                            </div>
                            <textarea
                                id="review-comment"
                                rows={4}
                                maxLength={2000}
                                required
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="What did you like or dislike? How was the fit, material, or delivery?"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 transition-all resize-none placeholder:text-slate-400 leading-relaxed"
                            />
                        </div>

                        {/* Photo Attachments (Max 4, 5MB) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <label className="font-bold text-slate-700 dark:text-slate-300">
                                    Customer Photos <span className="text-slate-400 font-normal">(up to 4, max 5MB each)</span>
                                </label>
                                <span className="text-slate-400">{mediaUrls.length}/4</span>
                            </div>

                            {/* Image Previews + Upload Button */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {mediaUrls.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group shadow-xs"
                                    >
                                        <Image
                                            src={url}
                                            alt={`Preview ${idx + 1}`}
                                            fill
                                            sizes="64px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}

                                {mediaUrls.length < 4 && (
                                    <button
                                        type="button"
                                        disabled={uploadingFiles}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-amber-500 dark:hover:border-amber-400 flex flex-col items-center justify-center text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                                    >
                                        {uploadingFiles ? (
                                            <Loader2 size={18} className="animate-spin text-amber-500" />
                                        ) : (
                                            <>
                                                <Upload size={16} />
                                                <span className="text-[10px] font-bold mt-1">Add</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Verified Purchase Hint */}
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-200">
                            <BadgeCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <span>
                                Reviews from verified delivered orders receive an official <strong>Verified Purchase</strong> trust badge.
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting || uploadingFiles}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || uploadingFiles}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>{existingReview ? 'Update Review' : 'Submit Review'}</span>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
