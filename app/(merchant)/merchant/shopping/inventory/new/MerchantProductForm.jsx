'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Loader2, Save, X, Upload, Package, Tag, DollarSign, Box, Info } from 'lucide-react';

export default function MerchantProductForm({ merchantId }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [fullCategories, setFullCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        retail_price_paise: '',
        mrp_paise: '',
        gst_percentage: '0',
        hsn_code: '',
        stock_quantity: '0',
        image_url: '',
    });

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('shopping_categories')
                .select('id, name')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            if (!error && data) {
                setFullCategories(data);
                setCategories(data.map(c => c.name));
            }
        };
        fetchCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const retailPricePaise = Math.round(parseFloat(formData.retail_price_paise) * 100);
            const mrpPaise = formData.mrp_paise ? Math.round(parseFloat(formData.mrp_paise) * 100) : retailPricePaise;

            // Find the category object to get its ID
            const selectedCategory = fullCategories.find(c => c.name === formData.category);

            // 1. Create product in shopping_products
            const { data: product, error: productError } = await supabase
                .from('shopping_products')
                .insert([{
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    category_id: selectedCategory ? selectedCategory.id : null,
                    image_url: formData.image_url,
                    wholesale_price_paise: 0, // Not applicable for custom products
                    suggested_retail_price_paise: retailPricePaise,
                    mrp_paise: mrpPaise,
                    admin_stock: 0, // Not applicable
                    gst_percentage: parseInt(formData.gst_percentage || 0),
                    hsn_code: formData.hsn_code || null,

                }])
                .select()
                .single();

            if (productError) throw productError;

            // 2. Create entry in merchant_inventory
            const { error: invError } = await supabase
                .from('merchant_inventory')
                .insert([{
                    merchant_id: merchantId,
                    product_id: product.id,
                    custom_title: formData.title,
                    custom_description: formData.description,
                    retail_price_paise: retailPricePaise,
                    stock_quantity: parseInt(formData.stock_quantity),
                    is_platform_product: false,
                    is_active: true
                }]);

            if (invError) throw invError;

            toast.success('Product added to your shop!');
            router.push('/merchant/shopping/inventory');
            router.refresh();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error(error.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Product Basics */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Info size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Product Details</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Product Name</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Local Organic Honey"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-300"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold appearance-none"
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Tell your customers about this product..."
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing & Media */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <DollarSign size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Inventory & Price</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Selling Price (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                                    <input
                                        type="number"
                                        name="retail_price_paise"
                                        value={formData.retail_price_paise}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-slate-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">MRP (Max Retail Price)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                                    <input
                                        type="number"
                                        name="mrp_paise"
                                        value={formData.mrp_paise}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-10 pr-5 py-3.5 rounded-2xl bg-blue-50/30 border border-blue-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-blue-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">GST Percentage (%)</label>
                                <select
                                    name="gst_percentage"
                                    value={formData.gst_percentage}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-slate-900 appearance-none"
                                >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">HSN/SAC Code (Optional)</label>
                                <input
                                    type="text"
                                    name="hsn_code"
                                    value={formData.hsn_code}
                                    onChange={handleChange}
                                    placeholder="e.g. 123456"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-slate-900 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 mt-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Initial Stock</label>
                                <input
                                    type="number"
                                    name="stock_quantity"
                                    value={formData.stock_quantity}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-slate-900"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Upload size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Product Image</h3>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleChange}
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm text-blue-600 truncate"
                                />
                            </div>
                            <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 shadow-inner">
                                {formData.image_url ? (
                                    <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Box className="text-slate-300" size={32} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-100">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                    Discard
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-12 py-4 rounded-2xl font-black transition-all disabled:opacity-50 shadow-xl shadow-blue-900/20"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    <span>List Product</span>
                </button>
            </div>
        </form>
    );
}
