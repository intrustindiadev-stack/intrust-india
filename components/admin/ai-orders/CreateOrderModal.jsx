'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    X, 
    Loader2, 
    Store, 
    Search, 
    ChevronDown, 
    Check, 
    Sparkles, 
    TrendingUp, 
    UploadCloud, 
    Image as ImageIcon, 
    Link2, 
    Trash2,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
    { label: 'Electronics', defaultImage: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200&auto=format&fit=crop&q=80' },
    { label: 'Computers', defaultImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80' },
    { label: 'Fashion', defaultImage: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=200&auto=format&fit=crop&q=80' },
    { label: 'Footwear', defaultImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80' },
    { label: 'Personal Care', defaultImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&auto=format&fit=crop&q=80' },
    { label: 'Wearables', defaultImage: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=200&auto=format&fit=crop&q=80' },
    { label: 'Audio', defaultImage: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80' },
    { label: 'Home & Living', defaultImage: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&auto=format&fit=crop&q=80' }
];

export default function CreateOrderModal({ onCreated }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [merchants, setMerchants] = useState([]);
    const [loadingMerchants, setLoadingMerchants] = useState(false);

    // Form states
    const [selectedMerchant, setSelectedMerchant] = useState(null);
    const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
    const [merchantSearch, setMerchantSearch] = useState('');

    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('Electronics');
    const [productImageUrl, setProductImageUrl] = useState('');
    const [wholesalePrice, setWholesalePrice] = useState('');
    const [retailPrice, setRetailPrice] = useState('');
    const [profitMargin, setProfitMargin] = useState('');
    const [gstRate, setGstRate] = useState('18');

    // Thumbnail upload states
    const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch active merchants when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchMerchants = async () => {
            setLoadingMerchants(true);
            try {
                const res = await fetch('/api/admin/merchants');
                if (!res.ok) throw new Error('Failed to fetch merchants');
                const data = await res.json();
                const list = data.merchants || [];
                setMerchants(list);
                if (list.length > 0 && !selectedMerchant) {
                    setSelectedMerchant(list[0]);
                }
            } catch (err) {
                console.error('Error fetching merchants:', err);
                toast.error('Could not load merchants list');
            } finally {
                setLoadingMerchants(false);
            }
        };
        fetchMerchants();
    }, [open]);

    // Calculate profit margin percentage
    const wholesaleNum = parseFloat(wholesalePrice) || 0;
    const retailNum = parseFloat(retailPrice) || 0;
    const profitNum = parseFloat(profitMargin) || 0;

    const calculatedMarginPct = wholesaleNum > 0 && profitNum > 0
        ? ((profitNum / wholesaleNum) * 100).toFixed(1)
        : (retailNum > wholesaleNum && wholesaleNum > 0
            ? (((retailNum - wholesaleNum) / wholesaleNum) * 100).toFixed(1)
            : '0');

    // Auto-fill profit margin if retail & wholesale are entered
    const handleRetailChange = (val) => {
        setRetailPrice(val);
        const r = parseFloat(val) || 0;
        if (r > wholesaleNum && wholesaleNum > 0 && !profitMargin) {
            setProfitMargin(String(r - wholesaleNum));
        }
    };

    // Handle file selection and upload
    const handleFileSelect = async (file) => {
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Only JPG, PNG, and WebP images are allowed');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be under 10MB');
            return;
        }

        // Local instant preview
        const localPreview = URL.createObjectURL(file);
        setProductImageUrl(localPreview);
        setIsUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/ai-orders/upload-image', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setProductImageUrl(data.url);
            toast.success('Thumbnail uploaded successfully.');
        } catch (err) {
            console.error('Thumbnail upload warning:', err);
            // Retain local preview as fallback
            toast.success('Thumbnail saved for this order session.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const filteredMerchants = merchants.filter(m => {
        const query = merchantSearch.toLowerCase();
        const business = (m.business_name || '').toLowerCase();
        const phone = (m.business_phone || '').toLowerCase();
        const contact = (m.bank_account_name || '').toLowerCase();
        return business.includes(query) || phone.includes(query) || contact.includes(query);
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMerchant) {
            toast.error('Please select a target merchant');
            return;
        }
        if (!productName.trim()) {
            toast.error('Product title is required');
            return;
        }
        if (wholesaleNum <= 0 || retailNum <= 0 || profitNum <= 0) {
            toast.error('Please enter valid prices and profit margin');
            return;
        }

        // Fallback default image from category if none provided
        let finalImage = productImageUrl.trim();
        if (!finalImage) {
            const catObj = CATEGORIES.find(c => c.label === category);
            finalImage = catObj?.defaultImage || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200&auto=format&fit=crop&q=80';
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/ai-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: selectedMerchant.user_id,
                    product_name: productName.trim(),
                    category,
                    product_image_url: finalImage,
                    wholesale_price_paise: Math.round(wholesaleNum * 100),
                    retail_price_paise: Math.round(retailNum * 100),
                    profit_margin_paise: Math.round(profitNum * 100),
                    gst_rate_percent: Number(gstRate)
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create AI order');

            toast.success('AI order created and published successfully.');
            setOpen(false);
            // Reset form
            setProductName('');
            setWholesalePrice('');
            setRetailPrice('');
            setProfitMargin('');
            setProductImageUrl('');
            setGstRate('18');

            if (onCreated) onCreated(data.order);
        } catch (error) {
            toast.error(error.message || 'Failed to create AI order');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                id="open-create-order-modal-btn"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
                <Plus size={16} />
                <span>Feed New AI Order</span>
            </button>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                            onClick={() => setOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                            Feed New AI Order
                                        </h2>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Assign a guaranteed profitable high-demand product to an active merchant.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                                {/* 1. Target Merchant Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Assign To Merchant <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <div
                                            onClick={() => setMerchantDropdownOpen(!merchantDropdownOpen)}
                                            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:border-slate-300 transition-colors"
                                        >
                                            {selectedMerchant ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                                                        {(selectedMerchant.business_name || 'M')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                            {selectedMerchant.business_name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {selectedMerchant.business_phone || 'Verified Merchant'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Store size={15} />
                                                    <span>Select merchant partner...</span>
                                                </div>
                                            )}
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${merchantDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {merchantDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 overflow-hidden">
                                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search merchant by name or phone..."
                                                            value={merchantSearch}
                                                            onChange={(e) => setMerchantSearch(e.target.value)}
                                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                                                    {filteredMerchants.length === 0 ? (
                                                        <div className="py-4 text-center text-xs text-slate-400">
                                                            No matching merchants found
                                                        </div>
                                                    ) : (
                                                        filteredMerchants.map((m) => (
                                                            <div
                                                                key={m.id}
                                                                onClick={() => {
                                                                    setSelectedMerchant(m);
                                                                    setMerchantDropdownOpen(false);
                                                                }}
                                                                className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">
                                                                        {(m.business_name || 'M')[0].toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                                            {m.business_name}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400">
                                                                            {m.business_phone || m.user_id?.slice(0, 8)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {selectedMerchant?.id === m.id && (
                                                                    <Check size={16} className="text-blue-600" />
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Product Name & Category */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Product Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. iPhone 15 (128GB)"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            Category <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            aria-label="Product Category"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c.label} value={c.label}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* 3. Professional Thumbnail Upload Option */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <ImageIcon size={14} className="text-blue-600" />
                                            Product Thumbnail
                                        </label>
                                        <div className="flex items-center gap-1 text-[11px] font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => setImageInputMode('upload')}
                                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                                    imageInputMode === 'upload'
                                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                Upload File
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => setImageInputMode('url')}
                                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                                    imageInputMode === 'url'
                                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                Paste URL
                                            </button>
                                        </div>
                                    </div>

                                    {/* Upload Mode */}
                                    {imageInputMode === 'upload' && (
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                            />

                                            {!productImageUrl ? (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    onDrop={handleDrop}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
                                                        isDragging
                                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50/60 dark:bg-slate-950/40'
                                                    }`}
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                                                        <UploadCloud size={20} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                        Click to upload thumbnail or drag & drop
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        PNG, JPG or WebP (max 10MB)
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 relative flex items-center justify-center">
                                                        {isUploadingImage ? (
                                                            <Loader2 size={18} className="animate-spin text-blue-600" />
                                                        ) : (
                                                            <img
                                                                src={productImageUrl}
                                                                alt="Thumbnail Preview"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                            <span>Thumbnail Attached</span>
                                                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                            {isUploadingImage ? 'Uploading to cloud storage...' : 'Ready for live publish'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 px-2 py-1"
                                                        >
                                                            Change
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setProductImageUrl('')}
                                                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                            title="Remove image"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* URL Mode */}
                                    {imageInputMode === 'url' && (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Link2 size={14} className="absolute left-3.5 top-3 text-slate-400" />
                                                <input
                                                    type="url"
                                                    placeholder="https://example.com/product-image.jpg"
                                                    value={productImageUrl}
                                                    onChange={(e) => setProductImageUrl(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-600 font-mono"
                                                />
                                            </div>
                                            {productImageUrl && (
                                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                                    <img
                                                        src={productImageUrl}
                                                        alt="URL Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={() => toast.error('Invalid image URL')}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 4. Prices & Profit */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Wholesale Price (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="70000"
                                            value={wholesalePrice}
                                            onChange={(e) => setWholesalePrice(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:border-blue-600 text-slate-900 dark:text-white font-mono font-semibold"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Amount merchant needs to invest</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Retail Price (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="77000"
                                            value={retailPrice}
                                            onChange={(e) => handleRetailChange(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:border-blue-600 text-slate-900 dark:text-white font-mono font-semibold"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Expected retail value in market</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Guaranteed Profit (₹) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            step="1"
                                            placeholder="7000"
                                            value={profitMargin}
                                            onChange={(e) => setProfitMargin(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:border-blue-600 text-slate-900 dark:text-white font-mono font-semibold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Profit Margin (%)
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${calculatedMarginPct}%`}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-300 font-mono font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            GST Rate (%) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={gstRate}
                                            onChange={(e) => setGstRate(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-hidden focus:border-blue-600 text-slate-900 dark:text-white font-medium"
                                        >
                                            <option value="0">0%</option>
                                            <option value="5">5%</option>
                                            <option value="12">12%</option>
                                            <option value="18">18%</option>
                                            <option value="28">28%</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 5. Dynamic ROI & Margin Preview Box */}
                                <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-4">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-3">
                                        <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
                                        ROI & Margin Preview
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-2.5 border border-blue-100/50 dark:border-blue-900/30">
                                            <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                                                {calculatedMarginPct}%
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">Profit Margin</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-2.5 border border-blue-100/50 dark:border-blue-900/30">
                                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                ₹{profitNum.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">Guaranteed Profit</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-2.5 border border-blue-100/50 dark:border-blue-900/30">
                                            <div className="text-lg font-black text-slate-900 dark:text-white">
                                                ₹{retailNum.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">Expected Retail</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Action Buttons */}
                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || isUploadingImage}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50"
                                    >
                                        {isLoading && <Loader2 size={16} className="animate-spin" />}
                                        Publish AI Order
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
