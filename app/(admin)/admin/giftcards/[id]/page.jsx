'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGiftCardById, updateGiftCard } from '../actions';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
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

export default function EditGiftCardPage({ params }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [giftCard, setGiftCard] = useState(null);

    // Live Discount State
    const [faceValue, setFaceValue] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    useEffect(() => {
        loadGiftCard();
    }, []);

    useEffect(() => {
        if (giftCard) {
            setFaceValue(giftCard.face_value_paise ? (giftCard.face_value_paise / 100).toFixed(2) : '');
            setSellingPrice(giftCard.selling_price_paise ? (giftCard.selling_price_paise / 100).toFixed(2) : '');
        }
    }, [giftCard]);

    // Live calculations
    const faceValNum = parseFloat(faceValue) || 0;
    const sellPriceNum = parseFloat(sellingPrice) || 0;
    const discount = faceValNum > 0 ? (((faceValNum - sellPriceNum) / faceValNum) * 100).toFixed(1) : 0;
    const isLoss = sellPriceNum > faceValNum;

    async function loadGiftCard() {
        const result = await getGiftCardById(params.id);

        if (result.success) {
            setGiftCard(result.data);
        } else {
            setError('Failed to load gift card: ' + result.error);
        }

        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const formData = new FormData(e.target);

        const result = await updateGiftCard(params.id, formData);

        if (result.success) {
            router.push('/admin/giftcards');
        } else {
            setError(result.error);
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-white rounded-xl"></div>
                    <div className="h-96 bg-white rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!giftCard) {
        return (
            <div className="max-w-4xl">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <p className="text-red-800 font-medium">{error || 'Gift card not found'}</p>
                    <Link href="/admin/giftcards" className="text-red-600 underline mt-2 inline-block">
                        Back to Gift Cards
                    </Link>
                </div>
            </div>
        );
    }

    // Convert dates for display
    const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        const date = new Date(dateValue);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const validFrom = formatDateForInput(giftCard.valid_from);
    const validUntil = formatDateForInput(giftCard.valid_until);

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
                    <h1 className="text-3xl font-bold text-gray-900">Edit Gift Card</h1>
                    <p className="text-gray-600 mt-1">{giftCard.brand} - {giftCard.title}</p>
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
                                defaultValue={giftCard.brand}
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
                                defaultValue={giftCard.category}
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
                                defaultValue={giftCard.title}
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
                                defaultValue={giftCard.description}
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
                                value={faceValue}
                                onChange={(e) => setFaceValue(e.target.value)}
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
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                placeholder="450"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Discounted price to sell at</p>
                        </div>
                    </div>
                </div>

                {/* Live Discount Calculator Strip */}
                {faceValNum > 0 && sellPriceNum > 0 && (
                    <div className={`p-4 rounded-xl flex items-center justify-between border sticky top-4 z-10 shadow-sm ${isLoss ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                        <div className="flex items-center gap-4">
                            <span className="font-medium text-slate-700">💲 Face Value: <span className="font-bold">₹{faceValNum}</span></span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-slate-700">Sell at: <span className="font-bold text-blue-600">₹{sellPriceNum}</span></span>
                        </div>
                        <div className={`px-3 py-1 rounded-lg font-bold text-sm ${isLoss ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isLoss ? '⚠️ Selling Above Face Value' : `💚 Discount: ${discount}% OFF`}
                        </div>
                    </div>
                )}

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
                                defaultValue={giftCard.encrypted_code}
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
                                defaultValue={giftCard.masked_code}
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
                                defaultValue={validFrom}
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
                                defaultValue={validUntil}
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
                                defaultValue={giftCard.terms_and_conditions}
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
                                defaultValue={giftCard.usage_instructions || ''}
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
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Image URL
                            </label>
                            <input
                                type="url"
                                name="imageUrl"
                                defaultValue={giftCard.image_url || ''}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Tags (comma separated)
                            </label>
                            <input
                                type="text"
                                name="tags"
                                defaultValue={giftCard.tags ? giftCard.tags.join(', ') : ''}
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
                                defaultValue={giftCard.status}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                            >
                                <option value="available">Available</option>
                                <option value="sold">Sold</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
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
