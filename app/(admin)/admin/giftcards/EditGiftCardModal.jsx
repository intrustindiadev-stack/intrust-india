'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { updateGiftCard } from './actions';
import { uploadGiftCardImage } from './upload-image';

const CATEGORIES = [
    'Shopping', 'Electronics', 'Entertainment', 'Food', 'Travel', 'Gaming', 'Fashion'
];

export default function EditGiftCardModal({ isOpen, onClose, giftCard, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (giftCard) {
            setImageUrl(giftCard.image_url || '');
            setImagePreview(giftCard.image_url || null);
        }
    }, [giftCard]);

    if (!isOpen || !giftCard) return null;

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setError(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadGiftCardImage(formData);

        if (result.success) {
            setImageUrl(result.url);
            setError(null);
        } else {
            setError(`Image upload failed: ${result.error}`);
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

        try {
            const formData = new FormData(e.target);

            if (imageUrl) {
                formData.set('imageUrl', imageUrl);
            }

            const result = await updateGiftCard(giftCard.id, formData);

            if (result.success) {
                onUpdate(result.data);
                onClose();
            } else {
                throw new Error(result.error || 'Failed to update gift card');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const faceValue = (giftCard.face_value_paise / 100).toFixed(2);
    const sellingPrice = (giftCard.selling_price_paise / 100).toFixed(2);
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                    <h3 className="text-lg font-bold text-gray-900">Edit Gift Card</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-1">
                    <form id="edit-gift-card-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Brand Name <span className="text-red-500">*</span></label>
                                    <input type="text" name="brand" required defaultValue={giftCard.brand} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                                    <select name="category" required defaultValue={giftCard.category} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                        <option value="">Select category</option>
                                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                                    <input type="text" name="title" required defaultValue={giftCard.title} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                                    <textarea name="description" required rows="3" defaultValue={giftCard.description} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Face Value (₹) <span className="text-red-500">*</span></label>
                                    <input type="number" name="faceValue" required min="0" step="0.01" defaultValue={faceValue} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Selling Price (₹) <span className="text-red-500">*</span></label>
                                    <input type="number" name="sellingPrice" required min="0" step="0.01" defaultValue={sellingPrice} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Coupon Code */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Coupon Code</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Encrypted Code <span className="text-red-500">*</span></label>
                                    <input type="text" name="encryptedCode" required defaultValue={giftCard.encrypted_code} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Masked Code <span className="text-red-500">*</span></label>
                                    <input type="text" name="maskedCode" required defaultValue={giftCard.masked_code} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Validity */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Validity Period</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid From</label>
                                    <input type="date" name="validFrom" defaultValue={validFrom} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Until <span className="text-red-500">*</span></label>
                                    <input type="date" name="validUntil" required defaultValue={validUntil} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Terms & Details */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Terms & Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Terms & Conditions <span className="text-red-500">*</span></label>
                                    <textarea name="terms" required rows="4" defaultValue={giftCard.terms_and_conditions} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Instructions</label>
                                    <textarea name="usageInstructions" rows="3" defaultValue={giftCard.usage_instructions} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gift Card Image</label>
                                    {!imagePreview ? (
                                        <div className="relative">
                                            <input type="file" id="imageUploadModal" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                                            <label htmlFor="imageUploadModal" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                {uploadingImage ? (
                                                    <><Loader2 size={24} className="text-purple-500 animate-spin mb-2" /><p className="text-sm">Uploading...</p></>
                                                ) : (
                                                    <><Upload size={24} className="text-gray-400 mb-2" /><p className="text-sm">Click to upload image</p></>
                                                )}
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative w-full h-40 bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                            </div>
                                            <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma separated)</label>
                                    <input type="text" name="tags" defaultValue={giftCard.tags ? giftCard.tags.join(', ') : ''} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                    <select name="status" defaultValue={giftCard.status} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none">
                                        <option value="available">Available</option>
                                        <option value="sold">Sold</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="edit-gift-card-form" disabled={loading} className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
