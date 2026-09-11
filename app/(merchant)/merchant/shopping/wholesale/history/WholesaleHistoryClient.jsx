'use client';

import Link from 'next/link';
import Image from 'next/image';
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
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden">
            {/* Batch Header */}
            <div className="p-4 sm:p-5 flex items-center gap-3.5">
                {/* Thumbnails */}
                <div className="flex -space-x-2.5 flex-shrink-0">
                    {thumbnails.length > 0 ? (
                        thumbnails.map((src, idx) => (
                            <div
                                key={idx}
                                className="relative w-10 h-10 rounded-lg border-2 border-white dark:border-slate-800 shadow-xs overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0"
                                style={{ zIndex: thumbnails.length - idx }}
                            >
                                <Image src={src} alt="" fill unoptimized sizes="40px" className="object-cover" />
                            </div>
                        ))
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Package size={18} className="text-slate-400 dark:text-slate-500" />
                        </div>
                    )}
                    {batch.items.length > 4 && (
                        <div className="w-10 h-10 rounded-lg border-2 border-white dark:border-slate-800 shadow-xs bg-slate-800 flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold">
                            +{batch.items.length - 4}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                            {batch.items.length} {batch.items.length === 1 ? 'product' : 'products'} · {totalQty} {totalQty === 1 ? 'unit' : 'units'}
                        </h3>
                        {!batch.batchId && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Legacy</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                        <Calendar size={12} />
                        {format(new Date(batch.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </div>
                </div>

                {/* Total + Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Paid</p>
                        <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            ₹{(batch.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Download size={13} />
                        {isDownloading ? 'Generating…' : 'Invoice'}
                    </button>

                    <button
                        onClick={() => setExpanded((v) => !v)}
                        aria-label={expanded ? "Collapse batch details" : "Expand batch details"}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                </div>
            </div>

            {/* Mobile total */}
            <div className="sm:hidden px-4 pb-3.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Paid</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ₹{(batch.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Expanded item rows */}
            {expanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                    {batch.items.map((order) => {
                        const product = order.shopping_products;
                        return (
                            <div key={order.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                                <div className="relative w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {product?.product_images?.[0] ? (
                                        <Image src={product.product_images[0]} alt="" fill unoptimized sizes="36px" className="object-cover" />
                                    ) : (
                                        <Package size={16} className="text-slate-400 dark:text-slate-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{product?.title || 'Unknown Product'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{product?.category || 'General'}</p>
                                </div>
                                <div className="text-right flex-shrink-0 hidden sm:block">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Qty × Unit</p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {order.quantity} × ₹{((order.unit_price_paise || 0) / 100).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</p>
                                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
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
        <div className="space-y-6">
            {/* Consistent Segmented Tab Bar */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 max-w-full overflow-x-auto no-scrollbar gap-1">
                <Link
                    href="/merchant/shopping/wholesale"
                    className="px-3.5 sm:px-4 py-1.5 rounded-lg font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all whitespace-nowrap"
                >
                    Buy Stock
                </Link>
                <span className="px-3.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs whitespace-nowrap">
                    Purchase History
                </span>
                <Link
                    href="/merchant/shopping/sales-to-intrust"
                    className="px-3.5 sm:px-4 py-1.5 rounded-lg font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all whitespace-nowrap"
                >
                    Sales to InTrust
                </Link>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40 shrink-0">
                        <ShoppingCart size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Purchases</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{batches.length}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 shrink-0">
                        <Package size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Units Bought</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{totalUnits.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/40 shrink-0">
                        <TrendingDown size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Spent</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            ₹{(totalSpentPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Batches List */}
            {batches.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                        <Package size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No wholesale purchases yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-normal mb-5 max-w-sm mx-auto">
                        Head to Buy Stock to source verified platform products for your shop.
                    </p>
                    <Link
                        href="/merchant/shopping/wholesale"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-xs"
                    >
                        <ShoppingCart size={15} />
                        Go to Buy Stock
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {batches.map((batch) => (
                        <BatchCard key={batch.syntheticKey} batch={batch} merchant={merchant} />
                    ))}
                </div>
            )}
        </div>
    );
}
