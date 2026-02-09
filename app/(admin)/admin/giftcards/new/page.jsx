'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGiftCard } from '../actions';
import { uploadGiftCardImage } from '../upload-image';
import { ArrowLeft, Save, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
    'Shopping',
    'Electronics',
    'Entertainment',
    'Food',
    'Travel',
    'Gaming',
    'Fashion'
];

export default function NewGiftCardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState(null);


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

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.target);

        // Add the uploaded image URL to form data
        if (imageUrl) {
            formData.set('imageUrl', imageUrl);
        }

        const result = await createGiftCard(formData);

        if (result.success) {
            router.push('/admin/giftcards');
        } else {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/giftcards"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-700" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add New Gift Card</h1>
                    <p className="text-gray-600 mt-1">Create a new gift card in your inventory</p>
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="category"
                                required
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Discounted price to sell at</p>
                        </div>
                    </div>
                </div>

                {/* Coupon Code */}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Coupon Code</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Encrypted Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="encryptedCode"
                                required
                                placeholder="SAVE2024XYZ"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Actual coupon code (will be encrypted)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Masked Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="maskedCode"
                                required
                                placeholder="SAVE****XYZ"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Preview code to show users</p>
                        </div>
                    </div>
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
                                        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 size={32} className="text-purple-500 animate-spin mb-2" />
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
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                name="status"
                                defaultValue="available"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            >
                                <option value="available">Available</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Create Gift Card
                            </>
                        )}
                    </button>
                    <Link
                        href="/admin/giftcards"
                        className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
