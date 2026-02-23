'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
        <div className="relative">
            {/* Background embellishments */}
            <div className="fixed top-[10%] left-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10 dark:opacity-20"></div>

            <div className="flex flex-col mb-8 mt-6">
                <Link
                    href="/merchant/dashboard"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-[#D4AF37] mb-6 transition-colors w-fit font-bold text-sm uppercase tracking-wider"
                >
                    <span className="material-icons-round text-lg text-[#D4AF37]">arrow_back</span>
                    <span>Back to Dashboard</span>
                </Link>

                <div className="flex flex-col">
                    <div className="inline-flex items-center w-fit gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest mb-4">
                        <span className="material-icons-round text-sm">redeem</span>
                        <span>Add New Coupon</span>
                    </div>
                    <h1 className="font-display text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        List a New Coupon
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Add coupon details to start selling on the marketplace</p>
                </div>
            </div>

            <div className="merchant-glass rounded-3xl border border-black/5 dark:border-white/5 p-8 max-w-4xl shadow-xl mb-12">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">info</span>
                            Basic Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Brand Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    placeholder="e.g., Flipkart, Amazon"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Category *
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-5 py-4 bg-black/5 dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all appearance-none"
                                        required
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">payments</span>
                            Pricing Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Face Value (₹) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.faceValue}
                                    onChange={(e) => setFormData({ ...formData, faceValue: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-bold transition-all"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Selling Price (₹) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.sellingPrice}
                                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-bold transition-all"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Wholesale Cost (₹) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.wholesaleCost}
                                    onChange={(e) => setFormData({ ...formData, wholesaleCost: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-bold transition-all"
                                    placeholder="0"
                                    required
                                />
                            </div>
                        </div>

                        {/* Markup Warning */}
                        {markup > 0 && !isMarkupValid && (
                            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 shadow-sm">
                                <span className="material-icons-round text-red-600 dark:text-red-400 mt-0.5">warning</span>
                                <div className="text-sm text-red-600 dark:text-red-400">
                                    <span className="font-bold block">Markup is too high ({markup}%)</span>
                                    <span className="opacity-80 font-medium">Maximum allowed markup is 20% (₹{maxAllowedPrice})</span>
                                </div>
                            </div>
                        )}

                        {/* Discount Preview */}
                        {discount > 0 && isMarkupValid && (
                            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="material-icons-round text-emerald-600 dark:text-emerald-400">local_offer</span>
                                    <div>
                                        <div className="text-emerald-700 dark:text-emerald-400 font-bold">{discount}% Customer Discount</div>
                                        <div className="text-emerald-600 dark:text-emerald-400/80 text-xs mt-1 uppercase tracking-wider font-bold">Customers save ₹{formData.faceValue - formData.sellingPrice}</div>
                                    </div>
                                </div>
                                <div className="text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 text-xs font-extrabold uppercase tracking-wider whitespace-nowrap">
                                    Markup: {markup}%
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Coupon Details */}
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <span className="material-icons-round text-[#D4AF37] mr-3">receipt_long</span>
                            Coupon Specifics
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Coupon Code *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D4AF37] material-icons-round text-lg transition-colors">password</span>
                                    <input
                                        type="text"
                                        value={formData.couponCode}
                                        onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                                        className="w-full pl-12 pr-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-mono tracking-wider transition-all"
                                        placeholder="ABC123XYZ"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider text-right">Encrypted & Hidden</p>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Stock Quantity *
                                </label>
                                <input
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-bold transition-all"
                                    placeholder="100"
                                    required
                                />
                            </div>

                            <div className="group md:col-span-2 lg:col-span-1">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Expiry Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all"
                                    style={{ colorScheme: 'auto' }}
                                    required
                                />
                            </div>

                            <div className="md:col-span-2 border-t border-black/5 dark:border-white/5 pt-6 mt-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all resize-y min-h-[100px]"
                                    placeholder="Describe the coupon and how to use it"
                                    rows={3}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 group-focus-within:text-[#D4AF37] transition-colors">
                                    Terms & Conditions
                                </label>
                                <textarea
                                    value={formData.terms}
                                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-slate-800 dark:text-slate-100 font-medium transition-all resize-y min-h-[120px]"
                                    placeholder="Enter terms and conditions (one per line)"
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-8 border-t border-black/5 dark:border-white/5">
                        <button
                            type="submit"
                            disabled={loading || !isMarkupValid}
                            className="w-full py-5 bg-[#D4AF37] text-[#020617] font-bold rounded-xl shadow-lg shadow-[#D4AF37]/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed gold-glow"
                        >
                            {loading ? (
                                <>
                                    <span className="material-icons-round animate-spin text-sm">autorenew</span>
                                    <span>Adding Coupon...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-sm">add</span>
                                    <span>List Coupon</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
