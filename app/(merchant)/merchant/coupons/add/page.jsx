'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { ArrowLeft, Plus, Loader2, Gift } from 'lucide-react';
import Link from 'next/link';

export default function AddCouponPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        brand: '',
        category: 'shopping',
        faceValue: '',
        sellingPrice: '',
        wholesaleCost: '',
        stock: '',
        couponCode: '',
        expiryDate: '',
        description: '',
        terms: ''
    });

    const categories = [
        { id: 'shopping', name: 'Shopping' },
        { id: 'food', name: 'Food & Dining' },
        { id: 'entertainment', name: 'Entertainment' },
        { id: 'travel', name: 'Travel' },
        { id: 'other', name: 'Other' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Mock submission
        setTimeout(() => {
            router.push('/merchant/dashboard');
        }, 2000);
    };

    const discount = formData.faceValue && formData.sellingPrice
        ? (((formData.faceValue - formData.sellingPrice) / formData.faceValue) * 100).toFixed(1)
        : 0;

    // Calculate markup percentage (max 20% allowed)
    const markup = formData.wholesaleCost && formData.sellingPrice
        ? (((formData.sellingPrice - formData.wholesaleCost) / formData.wholesaleCost) * 100).toFixed(1)
        : 0;

    const isMarkupValid = markup <= 20;
    const maxAllowedPrice = formData.wholesaleCost ? (parseFloat(formData.wholesaleCost) * 1.2).toFixed(2) : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="pt-24 pb-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    {/* Back Button */}
                    <Link
                        href="/merchant/dashboard"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#92BCEA]/10 border border-[#92BCEA]/20 text-[#92BCEA] text-sm font-semibold mb-4">
                            <Gift size={16} />
                            <span>Add New Coupon</span>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-3 font-[family-name:var(--font-outfit)]">
                            List a New Coupon
                        </h1>
                        <p className="text-gray-600">Add coupon details to start selling</p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Info */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Brand Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="e.g., Flipkart, Amazon"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category *
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Face Value (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.faceValue}
                                            onChange={(e) => setFormData({ ...formData, faceValue: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Selling Price (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.sellingPrice}
                                            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="450"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Wholesale Cost (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.wholesaleCost}
                                            onChange={(e) => setFormData({ ...formData, wholesaleCost: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="400"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Markup Warning */}
                                {markup > 0 && !isMarkupValid && (
                                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <div className="text-sm text-red-800">
                                            <span className="font-semibold">⚠️ Markup too high: {markup}%</span>
                                            {' '} | Maximum allowed: 20% (₹{maxAllowedPrice})
                                        </div>
                                    </div>
                                )}

                                {/* Discount Preview */}
                                {discount > 0 && isMarkupValid && (
                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <div className="text-sm text-green-800">
                                            <span className="font-semibold">Markup: {markup}%</span>
                                            {' '} | Customer discount: {discount}% (saves ₹{formData.faceValue - formData.sellingPrice})
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Coupon Details */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Coupon Details</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Coupon Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.couponCode}
                                            onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all font-mono"
                                            placeholder="ABC123XYZ"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">This will be encrypted and hidden</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Stock Quantity *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="100"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Expiry Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="Describe the coupon and how to use it"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Terms & Conditions
                                        </label>
                                        <textarea
                                            value={formData.terms}
                                            onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#92BCEA] focus:border-transparent transition-all"
                                            placeholder="Enter terms and conditions (one per line)"
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !isMarkupValid}
                                className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Adding Coupon...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Add Coupon
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
