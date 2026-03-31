'use client';

import Link from 'next/link';
import { Package, ShoppingCart, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function WholesaleHistoryClient({ orders = [], merchant }) {
    const totalUnits = orders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    const totalSpentPaise = orders.reduce((sum, o) => sum + (o.total_price_paise || 0), 0);

    return (
        <div className="space-y-10">
            {/* Tab Bar */}
            <div className="flex items-center gap-3">
                <Link
                    href="/merchant/shopping/wholesale"
                    className="whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all"
                >
                    Buy Stock
                </Link>
                <span className="whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white shadow-xl shadow-slate-900/20">
                    Purchase History
                </span>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50">
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Purchases</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{orders.length}</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <Package size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Units Bought</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{totalUnits.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                        <TrendingDown size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Spent</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                            ₹{(totalSpentPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                    <Package className="mx-auto text-slate-200 mb-6" size={64} />
                    <h3 className="text-xl font-black text-slate-900 mb-2">No wholesale purchases yet.</h3>
                    <p className="text-slate-500 font-medium mb-8">Head to Buy Stock to restock your inventory.</p>
                    <Link
                        href="/merchant/shopping/wholesale"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                    >
                        <ShoppingCart size={16} />
                        Go to Buy Stock
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => {
                        const product = order.shopping_products;
                        return (
                            <div
                                key={order.id}
                                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 p-6 flex items-center gap-6"
                            >
                                {/* Product Image */}
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {product?.product_images?.[0] ? (
                                        <img
                                            src={product.product_images[0]}
                                            alt={product?.title || 'Product'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package size={28} className="text-slate-300" />
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-slate-900 text-base truncate mb-1">
                                        {product?.title || 'Unknown Product'}
                                    </h3>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                            {product?.category || 'Uncategorised'}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <Calendar size={10} />
                                            {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                                        </span>
                                    </div>
                                </div>

                                {/* Qty + Pricing */}
                                <div className="hidden sm:flex items-center gap-8 text-right flex-shrink-0">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Qty</p>
                                        <p className="text-lg font-black text-slate-900">{order.quantity}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Unit Price</p>
                                        <p className="text-lg font-black text-slate-700">
                                            ₹{((order.unit_price_paise || 0) / 100).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Paid</p>
                                        <p className="text-xl font-black text-blue-600">
                                            ₹{((order.total_price_paise || 0) / 100).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>

                                {/* Mobile pricing */}
                                <div className="sm:hidden text-right flex-shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Paid</p>
                                    <p className="text-lg font-black text-blue-600">
                                        ₹{((order.total_price_paise || 0) / 100).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold">Qty: {order.quantity}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
