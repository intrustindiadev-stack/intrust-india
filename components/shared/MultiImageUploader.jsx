'use client';

import { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, X, ImagePlus, Star } from 'lucide-react';
import { deleteProductImage } from '@/app/(admin)/admin/shopping/upload-product-image';

/**
 * MultiImageUploader
 *
 * Props:
 *   images       {string[]}  - ordered array of current image URLs
 *   onChange     {(urls: string[]) => void}
 *   uploadAction {(formData: FormData, role: string) => Promise<{ success, url, fileName, error }>}
 *   maxImages    {number}    - default 5
 *   role         {'admin' | 'merchant'}
 */
export default function MultiImageUploader({
    images = [],
    onChange,
    uploadAction,
    maxImages = 5,
    role = 'admin',
}) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleAddClick = () => {
        if (images.length >= maxImages) {
            toast.error(`Maximum ${maxImages} images allowed`);
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input so same file can be re-selected if needed
        e.target.value = '';

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadAction(formData, role);

            if (!result.success) {
                toast.error(result.error || 'Upload failed');
                return;
            }

            onChange([...images, result.url]);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async (index) => {
        const urlToRemove = images[index];

        // Extract the fileName (storage path) from the public URL
        // Public URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<filePath>
        let fileName = null;
        try {
            const url = new URL(urlToRemove);
            // pathname: /storage/v1/object/public/product-images/<filePath>
            const parts = url.pathname.split('/storage/v1/object/public/product-images/');
            if (parts.length === 2) {
                fileName = decodeURIComponent(parts[1]);
            }
        } catch {
            // Not a valid URL — just remove from list without deleting from storage
        }

        // Optimistically update the UI first
        const newImages = images.filter((_, i) => i !== index);
        onChange(newImages);

        // Best-effort delete from storage
        if (fileName) {
            try {
                await deleteProductImage(fileName);
            } catch (err) {
                console.warn('Storage delete failed (image already removed from list):', err);
            }
        }
    };

    return (
        <div className="space-y-3">
            {/* Grid of thumbnails + add tile */}
            <div className="flex flex-wrap gap-3">
                {images.map((url, index) => (
                    <div
                        key={url + index}
                        className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm group"
                    >
                        <img
                            src={url}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-full object-cover"
                        />

                        {/* Cover badge on first image */}
                        {index === 0 && (
                            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow">
                                <Star size={7} fill="white" />
                                <span>Cover</span>
                            </div>
                        )}

                        {/* Remove button */}
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                            title="Remove image"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                ))}

                {/* Uploading spinner tile */}
                {uploading && (
                    <div className="w-24 h-24 rounded-2xl border border-dashed border-blue-300 bg-blue-50 flex items-center justify-center">
                        <Loader2 size={24} className="animate-spin text-blue-400" />
                    </div>
                )}

                {/* Add image tile */}
                {!uploading && images.length < maxImages && (
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500 transition-all group"
                        title="Add image"
                    >
                        <ImagePlus size={22} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
                    </button>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Helper text */}
            <p className="text-[10px] text-slate-400 italic font-medium">
                Upload up to {maxImages} images (JPEG, PNG, WEBP · max 5 MB each). First image is the cover.
            </p>
        </div>
    );
}
