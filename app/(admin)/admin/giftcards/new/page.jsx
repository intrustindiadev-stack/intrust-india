'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMultipleGiftCards } from '../actions';
import { uploadGiftCardImage } from '../upload-image';
import { ArrowLeft, Save, Loader2, Upload, X, Image as ImageIcon, Wand2, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

const CATEGORIES = [
    'Shopping',
    'Electronics',
    'Entertainment',
    'Food',
    'Travel',
    'Gaming',
    'Fashion',
    'HealthCare'
];

export default function NewGiftCardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    // Live Discount State
    const [faceValue, setFaceValue] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    // Code Entries State
    const [codeEntries, setCodeEntries] = useState([{ id: Date.now().toString(), encryptedCode: '', maskedCode: '' }]);

    // Inline validation state
    const [fieldErrors, setFieldErrors] = useState({});

    // Live calculations
    const faceValNum = parseFloat(faceValue) || 0;
    const sellPriceNum = parseFloat(sellingPrice) || 0;
    const discount = faceValNum > 0 ? (((faceValNum - sellPriceNum) / faceValNum) * 100).toFixed(1) : 0;
    const isLoss = sellPriceNum > faceValNum;


    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setError(null);

        // Create preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to Supabase
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadGiftCardImage(formData);

        if (result.success) {
            setImageUrl(result.url);
            setError(null);
        } else {
            // Show error but keep the preview
            setError(`Image upload failed: ${result.error}. You can still create the gift card without an image, or try uploading again.`);
            // Don't clear the preview - setImagePreview(null);
        }

        setUploadingImage(false);
    }

    function removeImage() {
        setImageUrl('');
        setImagePreview(null);
        setError(null);
    }

    function addCodeEntry() {
        setCodeEntries([...codeEntries, { id: Date.now().toString() + Math.random(), encryptedCode: '', maskedCode: '' }]);
    }

    function removeCodeEntry(id) {
        if (codeEntries.length > 1) {
            setCodeEntries(codeEntries.filter(entry => entry.id !== id));
        }
    }

    function updateCodeEntry(id, field, value) {
        setCodeEntries(codeEntries.map(entry =>
            entry.id === id ? { ...entry, [field]: value } : entry
        ));
    }

    function handleAutoGenerateMaskedCode(id, encryptedCode) {
        if (!encryptedCode) {
            toast.error('Please enter the actual coupon code first.');
            return;
        }

        const len = encryptedCode.length;
        let masked = '';
        if (len <= 4) {
            masked = encryptedCode.charAt(0) + '*'.repeat(len - 1);
        } else {
            const prefixLen = Math.floor(len / 3);
            const postfixLen = Math.floor(len / 3);
            const prefix = encryptedCode.substring(0, prefixLen);
            const postfix = encryptedCode.substring(len - postfixLen);
            const stars = '*'.repeat(len - prefixLen - postfixLen);
            masked = `${prefix}${stars}${postfix}`;
        }
        updateCodeEntry(id, 'maskedCode', masked);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});

        const formData = new FormData(e.target);

        // Client-side Validation
        let errors = {};
        const fv = parseFloat(formData.get('faceValue'));
        const sp = parseFloat(formData.get('sellingPrice'));
        const vu = new Date(formData.get('validUntil'));

        if (sp > fv) {
            errors.sellingPrice = 'Selling price should normally be less than or equal to face value.';
        }
        if (vu <= new Date()) {
            errors.validUntil = 'Valid until date must be in the future.';
        }

        // Validate code entries
        const invalidEntry = codeEntries.find(entry => !entry.encryptedCode || !entry.maskedCode);
        if (invalidEntry) {
            errors.codes = 'All code entries must have both encrypted code and masked code filled.';
        }

        const unmaskedEntry = codeEntries.find(entry => entry.maskedCode && !entry.maskedCode.includes('*'));
        if (unmaskedEntry) {
            errors.maskedCode = 'Masked code should typically contain * characters to hide the actual code.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            // We'll block on validUntil or codes, warn on others
            if (errors.validUntil || errors.codes) {
                toast.error(errors.codes || 'Please fix the errors before submitting.');
                setLoading(false);
                return;
            }
        }

        const tagsString = formData.get('tags');
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        const sharedData = {
            brand: formData.get('brand'),
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            face_value_paise: Math.round(fv * 100),
            selling_price_paise: Math.round(sp * 100),
            status: formData.get('status') || 'available',
            valid_from: formData.get('validFrom') || new Date().toISOString(),
            valid_until: formData.get('validUntil'),
            terms_and_conditions: formData.get('terms'),
            usage_instructions: formData.get('usageInstructions') || '',
            image_url: imageUrl || null,
            tags
        };

        const result = await createMultipleGiftCards(sharedData, codeEntries);

        if (result.success) {
            toast.success(`${result.count} gift card(s) created! Redirecting...`);
            router.push('/admin/giftcards');
        } else {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl space-y-6">
            <Toaster position="top-right" />
            {/* Header */}
            <div className="flex items-start sm:items-center gap-4">
                <Link
                    href="/admin/giftcards"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-700" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Add Gift Card to Platform Inventory
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Add gift cards for merchants to purchase in bulk.
                        Merchants will list them on the marketplace at their own prices.
                    </p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 font-medium">{error}</p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* Basic Information */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Brand Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="brand"
                                required
                                placeholder="e.g., Amazon, Apple, Netflix"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="category"
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            >
                                <option value="">Select category</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                required
                                placeholder="e.g., Amazon Gift Card ₹500"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="description"
                                required
                                rows="3"
                                placeholder="Brief description of the gift card"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Face Value (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="faceValue"
                                required
                                min="0"
                                step="0.01"
                                placeholder="500"
                                value={faceValue}
                                onChange={(e) => setFaceValue(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Original value of the gift card</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Selling Price (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="sellingPrice"
                                required
                                min="0"
                                step="0.01"
                                placeholder="450"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                className={`w-full px-4 py-2.5 border ${fieldErrors.sellingPrice ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`}
                            />
                            {fieldErrors.sellingPrice ? (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.sellingPrice}</p>
                            ) : (
                                <p className="text-xs text-gray-500 mt-1">Discounted price to sell at</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Live Discount Calculator Strip */}
                {faceValNum > 0 && sellPriceNum > 0 && (
                    <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border sticky top-4 z-10 shadow-sm ${isLoss ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <span className="font-medium text-slate-700">💲 Face Value: <span className="font-bold">₹{faceValNum}</span></span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-slate-700">Sell at: <span className="font-bold text-blue-600">₹{sellPriceNum}</span></span>
                        </div>
                        <div className={`px-3 py-1 rounded-lg font-bold text-sm w-full sm:w-auto text-center ${isLoss ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isLoss ? '⚠️ Selling Above Face Value' : `💚 Discount: ${discount}% OFF`}
                        </div>
                    </div>
                )}

                {/* Coupon Codes */}
                <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-900">Coupon Codes</h2>
                            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {codeEntries.length} {codeEntries.length === 1 ? 'code' : 'codes'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={addCodeEntry}
                            className="w-full sm:w-auto flex justify-center items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                            + Add Another Code
                        </button>
                    </div>

                    <div className="space-y-4">
                        {codeEntries.map((entry, index) => (
                            <div key={entry.id} className="p-4 border border-gray-200 rounded-xl relative bg-gray-50/50">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Entry #{index + 1}</span>
                                    {codeEntries.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeCodeEntry(entry.id)}
                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                            title="Remove entry"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Encrypted Code <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="SAVE2024XYZ"
                                            value={entry.encryptedCode}
                                            onChange={(e) => updateCodeEntry(entry.id, 'encryptedCode', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Actual coupon code</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                Masked Code <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => handleAutoGenerateMaskedCode(entry.id, entry.encryptedCode)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                                            >
                                                <Wand2 size={12} strokeWidth={2.5} /> Auto-generate
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            placeholder="SAVE****XYZ"
                                            value={entry.maskedCode}
                                            onChange={(e) => updateCodeEntry(entry.id, 'maskedCode', e.target.value)}
                                            className={`w-full px-4 py-2.5 border ${fieldErrors.maskedCode && index === 0 ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`}
                                        />
                                        {fieldErrors.maskedCode && index === 0 ? (
                                            <p className="text-xs text-red-500 mt-1">{fieldErrors.maskedCode}</p>
                                        ) : (
                                            <p className="text-xs text-gray-500 mt-1">Preview code to show users</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {fieldErrors.codes && (
                        <p className="text-sm font-medium text-red-500 mt-2">{fieldErrors.codes}</p>
                    )}
                </div>

                {/* Validity */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Validity Period</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Valid From
                            </label>
                            <input
                                type="date"
                                name="validFrom"
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Valid Until <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="validUntil"
                                required
                                className={`w-full px-4 py-2.5 border ${fieldErrors.validUntil ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10`}
                            />
                            {fieldErrors.validUntil && (
                                <p className="text-xs text-red-500 mt-1">{fieldErrors.validUntil}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Terms & Details */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Terms & Conditions <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="terms"
                                required
                                rows="4"
                                placeholder="Enter terms and conditions for this gift card"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Usage Instructions
                            </label>
                            <textarea
                                name="usageInstructions"
                                rows="3"
                                placeholder="How to redeem this gift card"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Gift Card Image
                            </label>

                            {!imagePreview ? (
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="imageUpload"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                    <label
                                        htmlFor="imageUpload"
                                        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 size={32} className="text-blue-500 animate-spin mb-2" />
                                                <p className="text-sm text-gray-600">Uploading...</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={32} className="text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600">Click to upload image</p>
                                                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP or GIF (max 5MB)</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative w-full h-48 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <ImageIcon size={14} />
                                        Image uploaded successfully
                                    </p>
                                </div>
                            )}

                            {/* Hidden input to store the URL */}
                            <input
                                type="hidden"
                                name="imageUrl"
                                value={imageUrl}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Tags (comma separated)
                            </label>
                            <input
                                type="text"
                                name="tags"
                                placeholder="discount50, electronics, popular"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                name="status"
                                defaultValue="available"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            >
                                <option value="available">Available</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Create {codeEntries.length > 1 ? `${codeEntries.length} Gift Cards` : 'Gift Card'}
                            </>
                        )}
                    </button>
                    <Link
                        href="/admin/giftcards"
                        className="flex justify-center px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
