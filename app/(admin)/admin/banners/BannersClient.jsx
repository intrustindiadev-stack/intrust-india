'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Link as LinkIcon, Image as ImageIcon, GripVertical, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function BannersClient({ initialBanners }) {
    const [banners, setBanners] = useState(initialBanners || []);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Form state
    const [newBanner, setNewBanner] = useState({
        title: '',
        target_url: '',
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('Image size must be less than 5MB');
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleUploadAndSave = async (e) => {
        e.preventDefault();
        
        if (!selectedFile) {
            toast.error('Please select an image for the banner');
            return;
        }
        if (!newBanner.title.trim()) {
            toast.error('Please enter a descriptive title');
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Uploading banner image...');

        try {
            // 1. Upload to Supabase Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`; // root of banners bucket

            const { error: uploadError, data } = await supabase.storage
                .from('banners')
                .upload(filePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(filePath);

            toast.loading('Saving banner details...', { id: toastId });

            // 3. Save to database table
            const newSortOrder = banners.length > 0 ? Math.max(...banners.map(b => b.sort_order || 0)) + 1 : 0;
            
            const { data: dbData, error: dbError } = await supabase
                .from('platform_banners')
                .insert([{
                    title: newBanner.title.trim(),
                    image_url: publicUrl,
                    target_url: newBanner.target_url.trim() || null,
                    is_active: true,
                    sort_order: newSortOrder
                }])
                .select()
                .single();

            if (dbError) throw dbError;

            // Update UI list
            setBanners(prev => [...prev, dbData]);
            
            toast.success('Banner added successfully!', { id: toastId });
            
            // Reset form
            setNewBanner({ title: '', target_url: '' });
            setSelectedFile(null);
            setPreviewUrl(null);
            setShowAddForm(false);
            
        } catch (error) {
            console.error('Banner upload error:', error);
            toast.error(error.message || 'Failed to upload banner', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    const toggleStatus = async (bannerId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('platform_banners')
                .update({ is_active: !currentStatus })
                .eq('id', bannerId);

            if (error) throw error;

            setBanners(banners.map(b => b.id === bannerId ? { ...b, is_active: !currentStatus } : b));
            toast.success(`Banner ${!currentStatus ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (bannerId, imageUrl) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;

        try {
            // Delete from DB first
            const { error: dbError } = await supabase
                .from('platform_banners')
                .delete()
                .eq('id', bannerId);

            if (dbError) throw dbError;

            // Update UI immediately for snappiness
            setBanners(banners.filter(b => b.id !== bannerId));
            toast.success('Banner deleted');

            // Optionally clean up storage
            if (imageUrl) {
                try {
                    // Extract filename from the public URL ending
                    const urlParts = imageUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    if (fileName) {
                        await supabase.storage.from('banners').remove([fileName]);
                    }
                } catch (storageError) {
                    console.error('Failed to delete image from storage. It may be orphaned:', storageError);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete banner');
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <ImageIcon className="text-blue-600" size={32} />
                        Dynamic Banners
                    </h1>
                    <p className="text-slate-500 mt-1">Manage promotional banners on the customer dashboard</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                    {showAddForm ? <XCircle size={18} /> : <Plus size={18} />}
                    {showAddForm ? 'Cancel' : 'Upload New Banner'}
                </button>
            </div>

            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form onSubmit={handleUploadAndSave} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Upload Banner Image</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left: Image Upload */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Banner Graphic (Recommended: 16:9 or roughly 1200x600px)
                                    </label>
                                    
                                    <div className="relative group rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center h-48 sm:h-64 overflow-hidden cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            disabled={isUploading}
                                        />
                                        
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <p className="text-sm font-medium text-slate-700">Click or drag image here</p>
                                                <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP up to 5MB</p>
                                            </div>
                                        )}
                                        
                                        {/* Overlay for re-upload when image exists */}
                                        {previewUrl && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-white font-medium bg-black/50 px-3 py-1.5 rounded-lg text-sm">
                                                    Change Image
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Form Details */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Internal Title / Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newBanner.title}
                                            onChange={(e) => setNewBanner({...newBanner, title: e.target.value})}
                                            placeholder="e.g., Diwali Mega Sale 2026"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            required
                                            disabled={isUploading}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">For your reference only, not shown to customers.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Target Destination URL (Optional)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <LinkIcon size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                value={newBanner.target_url}
                                                onChange={(e) => setNewBanner({...newBanner, target_url: e.target.value})}
                                                placeholder="e.g., /gift-cards or https://..."
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                disabled={isUploading}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Where the user navigates upon clicking the banner.</p>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <button
                                            type="submit"
                                            disabled={isUploading || !selectedFile}
                                            className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                            {isUploading ? 'Uploading & Saving...' : 'Save Banner'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 font-bold text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-100">
                    <div className="col-span-1 text-center">Order</div>
                    <div className="col-span-4">Preview</div>
                    <div className="col-span-3">Details</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-2 text-right pr-2">Actions</div>
                </div>

                <div className="divide-y divide-slate-100 min-h-[200px]">
                    {banners.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="font-medium text-slate-900 mb-1">No custom banners yet</p>
                            <p className="text-sm">Upload an image to get started. The dashboard will show default banners until you add active ones here.</p>
                        </div>
                    ) : (
                        banners.sort((a, b) => a.sort_order - b.sort_order).map((banner, index) => (
                            <div key={banner.id} className="grid grid-cols-12 gap-4 p-4 items-center group hover:bg-slate-50/50 transition-colors">
                                {/* Sort Order */}
                                <div className="col-span-1 flex flex-col items-center justify-center gap-1 text-slate-400">
                                    <span className="font-mono text-sm font-bold">{index + 1}</span>
                                </div>

                                {/* Preview */}
                                <div className="col-span-4 flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 h-[80px]">
                                    {banner.image_url ? (
                                        <div className="w-full h-full relative">
                                            <img 
                                                src={banner.image_url} 
                                                alt={banner.title}
                                                className={`w-full h-full object-cover ${!banner.is_active ? 'opacity-50 grayscale' : ''}`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <ImageIcon size={20} />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="col-span-3 min-w-0 pr-4">
                                    <h4 className="font-bold text-slate-900 text-sm truncate">{banner.title}</h4>
                                    {banner.target_url && (
                                        <div className="flex items-center gap-1 text-xs text-blue-600 mt-1 truncate">
                                            <LinkIcon size={12} className="flex-shrink-0" />
                                            <span className="truncate">{banner.target_url}</span>
                                        </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                                        ID: {banner.id.split('-')[0]}...
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="col-span-2 text-center">
                                    <button
                                        onClick={() => toggleStatus(banner.id, banner.is_active)}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                                            banner.is_active 
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                    >
                                        {banner.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                        {banner.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex items-center justify-end gap-2 pr-2">
                                    {/* Sort up/down could be added here later, for now just relying on simple sort order */}
                                    <button
                                        onClick={() => handleDelete(banner.id, banner.image_url)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Banner"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
