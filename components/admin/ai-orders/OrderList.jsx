'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
    CheckCircle2, 
    MoreHorizontal, 
    Eye, 
    Loader2, 
    Clock, 
    CreditCard, 
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Package,
    Plus,
    Store,
    ArrowUpRight
} from 'lucide-react';
import ProductThumbnail from '@/components/ai-orders/ProductThumbnail';
import toast from 'react-hot-toast';

export default function OrderList({ 
    orders = [], 
    onOrderCompleted, 
    activeTab = 'ALL',
    viewMode = 'table',
    onCreateOrderClick
}) {
    const [completingId, setCompletingId] = useState(null);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [activeActionMenu, setActiveActionMenu] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter();

    const pageSize = 10;
    const totalOrders = orders.length;
    const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return orders.slice(start, start + pageSize);
    }, [orders, currentPage, pageSize]);

    const toggleSelectAll = () => {
        if (selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(paginatedOrders.map(o => o.id));
        }
    };

    const toggleSelectOrder = (id) => {
        setSelectedOrders(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleComplete = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to complete this order and release escrow funds to the merchant vault?')) return;

        setCompletingId(id);
        try {
            const res = await fetch(`/api/admin/ai-orders/${id}/complete`, {
                method: 'POST'
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to complete order');

            toast.success('Order completed and funds released to Vault!');
            if (onOrderCompleted) onOrderCompleted(id);
        } catch (error) {
            toast.error(error.message || 'Failed to complete order');
        } finally {
            setCompletingId(null);
            setActiveActionMenu(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACCEPTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70">
                        <Check size={11} strokeWidth={3} /> Accepted
                    </span>
                );
            case 'PAYMENT_PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/70">
                        <CreditCard size={11} /> Payment Pending
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                    </span>
                );
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300">
                        <CheckCircle2 size={12} /> Completed
                    </span>
                );
            case 'CANCELLED':
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/70">
                        • Cancelled
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {status}
                    </span>
                );
        }
    };

    if (orders.length === 0) {
        return (
            <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Package size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No AI orders found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {activeTab === 'ALL'
                        ? 'There are currently no AI orders in the system. Feed a new order to distribute to a merchant partner.'
                        : `No orders currently match the "${activeTab.replace('_', ' ')}" filter tab.`}
                </p>
                {onCreateOrderClick && (
                    <button
                        onClick={onCreateOrderClick}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                    >
                        <Plus size={14} /> Feed New AI Order
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {viewMode === 'grid' ? (
                /* Grid Cards View */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                    {paginatedOrders.map((order) => {
                        const wholesale = order.wholesale_price_paise ? order.wholesale_price_paise / 100 : 0;
                        const retail = order.retail_price_paise ? order.retail_price_paise / 100 : (wholesale * 1.1);
                        const profit = order.profit_margin_paise ? order.profit_margin_paise / 100 : (retail - wholesale);
                        const isSelected = selectedOrders.includes(order.id);

                        return (
                            <div
                                key={order.id}
                                onClick={() => router.push(`/admin/ai-orders/${order.id}`)}
                                className={`group bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer p-4 flex flex-col justify-between hover:shadow-md ${
                                    isSelected 
                                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20' 
                                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                                <div>
                                    {/* Top Bar: Checkbox, Order Code, Status */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOrder(order.id)}
                                                aria-label={`Select order ${order.order_code || order.id}`}
                                                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {order.order_code || `AI-${order.id.slice(0, 4)}`}
                                            </span>
                                        </div>
                                        <div>{getStatusBadge(order.status)}</div>
                                    </div>

                                    {/* Product Thumbnail & Details */}
                                    <div className="flex items-center gap-3.5 mb-3.5">
                                        <ProductThumbnail
                                            src={order.product_image_url}
                                            alt={order.product_name}
                                            category={order.category}
                                            className="w-14 h-14 rounded-2xl group-hover:scale-105 transition-transform shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-blue-600 transition-colors">
                                                {order.product_name}
                                            </h4>
                                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                                {order.category || 'General'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Merchant Details */}
                                    <div className="flex items-center gap-2 py-2 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-3 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                            {(order.merchant?.contact_name || order.merchant?.business_name || 'M')[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0 truncate">
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                                {order.merchant?.contact_name || 'Assigned Merchant'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Financial Metrics */}
                                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 text-left mb-3">
                                        <div>
                                            <span className="text-[9px] uppercase font-bold text-slate-400">Wholesale</span>
                                            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                                                ₹{wholesale.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div className="border-l border-slate-200 dark:border-slate-700 pl-2">
                                            <span className="text-[9px] uppercase font-bold text-slate-400">Retail</span>
                                            <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                                                ₹{retail.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div className="border-l border-slate-200 dark:border-slate-700 pl-2">
                                            <span className="text-[9px] uppercase font-bold text-emerald-500">Profit</span>
                                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                +₹{profit.toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => router.push(`/admin/ai-orders/${order.id}`)}
                                        className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Eye size={12} /> Details
                                    </button>
                                    {order.status === 'ACCEPTED' && (
                                        <button
                                            onClick={(e) => handleComplete(e, order.id)}
                                            disabled={completingId === order.id}
                                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                        >
                                            {completingId === order.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                            Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table Container */
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/70 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3.5 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                                        onChange={toggleSelectAll}
                                        aria-label="Select all orders"
                                        className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Order ID</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Product</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Merchant</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Wholesale</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Retail</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Profit</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3.5 whitespace-nowrap">Created At</th>
                                <th className="px-4 py-3.5 text-center whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {paginatedOrders.map((order) => {
                                const wholesale = order.wholesale_price_paise ? order.wholesale_price_paise / 100 : 0;
                                const retail = order.retail_price_paise ? order.retail_price_paise / 100 : (wholesale * 1.1);
                                const profit = order.profit_margin_paise ? order.profit_margin_paise / 100 : (retail - wholesale);
                                const profitPct = wholesale > 0 ? Math.round((profit / wholesale) * 100) : 10;
                                const dateObj = new Date(order.created_at);
                                const isSelected = selectedOrders.includes(order.id);

                                return (
                                    <tr 
                                        key={order.id}
                                        onClick={() => router.push(`/admin/ai-orders/${order.id}`)}
                                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                                            isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOrder(order.id)}
                                                aria-label={`Select order ${order.order_code || order.id}`}
                                                className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>

                                        {/* Order ID */}
                                        <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                            {order.order_code || `AI-${order.id.slice(0, 4)}`}
                                        </td>

                                        {/* Product */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3 min-w-[180px]">
                                                <ProductThumbnail
                                                    src={order.product_image_url}
                                                    alt={order.product_name}
                                                    category={order.category}
                                                    className="w-10 h-10 rounded-xl"
                                                />
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                                        {order.product_name}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        {order.category || 'General'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Merchant */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5 min-w-[150px]">
                                                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                                    {(order.merchant?.contact_name || order.merchant?.business_name || 'M')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white leading-tight">
                                                        {order.merchant?.contact_name || 'Assigned Merchant'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {order.merchant?.business_name || 'Retail Partner'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Wholesale */}
                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                            ₹{wholesale.toLocaleString('en-IN')}
                                        </td>

                                        {/* Retail */}
                                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                            ₹{retail.toLocaleString('en-IN')}
                                        </td>

                                        {/* Profit */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                ₹{profit.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {profitPct}% margin
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {getStatusBadge(order.status)}
                                        </td>

                                        {/* Created At */}
                                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                            <div>{dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                                            <div className="text-[10px]">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={() => setActiveActionMenu(activeActionMenu === order.id ? null : order.id)}
                                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                                                    aria-label="Order actions"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>

                                                {activeActionMenu === order.id && (
                                                    <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-30">
                                                        <button
                                                            onClick={() => router.push(`/admin/ai-orders/${order.id}`)}
                                                            className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                                        >
                                                            <Eye size={13} /> View Details
                                                        </button>
                                                        {order.status === 'ACCEPTED' && (
                                                            <button
                                                                onClick={(e) => handleComplete(e, order.id)}
                                                                className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2"
                                                            >
                                                                <CheckCircle2 size={13} /> Complete & Release
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Real Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-medium">
                    Showing {Math.min(1, totalOrders)} to {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
                </span>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                    currentPage === pageNum
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {pageNum}
                            </button>
                        ))}

                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
