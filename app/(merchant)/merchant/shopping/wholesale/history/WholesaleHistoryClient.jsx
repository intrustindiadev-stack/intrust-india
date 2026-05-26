'use client';

import Link from 'next/link';
import { Package, ShoppingCart, TrendingDown, Calendar, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { generateOrderInvoice } from '@/lib/invoiceGenerator';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import { toast } from 'react-hot-toast';

/**
 * Groups a flat array of shopping_orders rows by purchase_batch_id.
 * Rows with a NULL purchase_batch_id each get their own synthetic batch
 * keyed by the row's id (legacy behaviour).
 */
function groupByBatch(orders) {
    const map = new Map();

    orders.forEach((order) => {
        const key = order.purchase_batch_id || `__legacy__${order.id}`;
        if (!map.has(key)) {
            map.set(key, {
                batchId: order.purchase_batch_id || null,
                syntheticKey: key,
                createdAt: order.created_at,
                items: [],
                totalPaise: 0,
            });
        }
        const batch = map.get(key);
        batch.items.push(order);
        batch.totalPaise += order.total_price_paise || 0;
        // Keep the earliest date as the batch date
        if (new Date(order.created_at) < new Date(batch.createdAt)) {
            batch.createdAt = order.created_at;
        }
    });

    return Array.from(map.values());
}

async function downloadBatchInvoice({ batch, merchant }) {
    const invoiceItems = batch.items.map((order) => ({
        shopping_products: {
            title: order.shopping_products?.title || 'Product',
            hsn_code: order.shopping_products?.hsn_code || '-',
            gst_percentage: order.shopping_products?.gst_percentage || 0,
        },
        quantity: order.quantity,
        unit_price_paise: order.unit_price_paise || order.shopping_products?.wholesale_price_paise || 0,
        total_price_paise: order.total_price_paise || 0,
    }));

    await generateOrderInvoice({
        order: {
            id: batch.batchId || batch.syntheticKey.replace('__legacy__', ''),
            created_at: batch.createdAt,
            delivery_fee_paise: 0,
        },
        items: invoiceItems,
        seller: PLATFORM_CONFIG.business,
        customer: {
            name: merchant.business_name,
            address: merchant.business_address,
            phone: merchant.business_phone,
            gstin: merchant.gst_number,
        },
        type: 'shopping',
    });
}

function BatchCard({ batch, merchant }) {
    const [expanded, setExpanded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            await downloadBatchInvoice({ batch, merchant });
        } catch (err) {
            console.error('[Invoice Error]', err);
            toast.error('Invoice generation failed. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const totalQty = batch.items.reduce((s, o) => s + (o.quantity || 0), 0);
    const thumbnails = batch.items
        .filter((o) => o.shopping_products?.product_images?.[0])
        .slice(0, 4)
        .map((o) => o.shopping_products.product_images[0]);

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 overflow-hidden">
            {/* Batch Header */}
            <div className="p-6 flex items-center gap-4">
                {/* Thumbnails */}
                <div className="flex -space-x-3 flex-shrink-0">
                    {thumbnails.length > 0 ? (
                        thumbnails.map((src, idx) => (
                            <div
                                key={idx}
                                className="w-12 h-12 rounded-xl border-2 border-white shadow-md overflow-hidden bg-slate-100 flex-shrink-0"
                                style={{ zIndex: thumbnails.length - idx }}
                            >
                                <img src={src} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Package size={22} className="text-slate-300" />
                        </div>
                    )}
                    {batch.items.length > 4 && (
                        <div className="w-12 h-12 rounded-xl border-2 border-white shadow-md bg-slate-800 flex items-center justify-center flex-shrink-0 text-white text-xs font-black">
                            +{batch.items.length - 4}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black text-slate-900 text-base">
                            {batch.items.length} {batch.items.length === 1 ? 'product' : 'products'} · {totalQty} units
                        </h3>
                        {!batch.batchId && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Legacy</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Calendar size={10} />
                        {format(new Date(batch.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </div>
                </div>

                {/* Total + Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Paid</p>
                        <p className="text-xl font-black text-blue-600">
                            ₹{(batch.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Download size={13} />
                        {isDownloading ? 'Generating…' : 'Invoice'}
                    </button>

                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors border border-slate-100"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Mobile total */}
            <div className="sm:hidden px-6 pb-4 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid</p>
                <p className="text-lg font-black text-blue-600">
                    ₹{(batch.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Expanded item rows */}
            {expanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {batch.items.map((order) => {
                        const product = order.shopping_products;
                        return (
                            <div key={order.id} className="px-6 py-4 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {product?.product_images?.[0] ? (
                                        <img src={product.product_images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package size={18} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 text-sm truncate">{product?.title || 'Unknown Product'}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{product?.category || 'Uncategorised'}</p>
                                </div>
                                <div className="text-right flex-shrink-0 hidden sm:block">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty × Unit</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {order.quantity} × ₹{((order.unit_price_paise || 0) / 100).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                                    <p className="text-base font-black text-slate-900">
                                        ₹{((order.total_price_paise || 0) / 100).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function WholesaleHistoryClient({ orders = [], merchant }) {
    const batches = groupByBatch(orders);

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
                        <p className="text-2xl font-black text-slate-900 tracking-tight">{batches.length}</p>
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

            {/* Batches List */}
            {batches.length === 0 ? (
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
                    {batches.map((batch) => (
                        <BatchCard key={batch.syntheticKey} batch={batch} merchant={merchant} />
                    ))}
                </div>
            )}
        </div>
    );
}
