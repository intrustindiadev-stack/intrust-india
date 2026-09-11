"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, Download, FileText, Search, Package, IndianRupee } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { generateProcurementInvoice } from "@/lib/invoiceGenerator";

export default function SalesToIntrustClient({ initialOrders, merchant }) {
    const [orders, setOrders] = useState(initialOrders || []);
    const [search, setSearch] = useState("");

    const filtered = orders.filter(order => {
        const matchesSearch = !search ||
            (order.invoice_number || "").toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    const stats = useMemo(() => {
        let totalUnits = 0;
        let totalEarningsPaise = 0;
        orders.forEach(o => {
            totalEarningsPaise += o.total_amount_paise || 0;
            o.platform_procurement_items?.forEach(item => {
                totalUnits += item.quantity || 0;
            });
        });
        return { totalOrders: orders.length, totalUnits, totalEarningsPaise };
    }, [orders]);

    const handleDownloadInvoice = async (order) => {
        try {
            await generateProcurementInvoice({
                procurementOrder: order,
                items: order.platform_procurement_items || [],
                merchant: merchant
            });
            toast.success("Invoice generated successfully");
        } catch (error) {
            console.error("Invoice generation failed:", error);
            toast.error("Failed to generate invoice");
        }
    };

    const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Consistent Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                            <FileText size={11} className="text-blue-600 dark:text-blue-400" />
                            Procurement Ledger
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                        Sales to InTrust
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        View orders procured by the platform from your wholesale inventory and download tax invoices.
                    </p>
                </div>
            </div>

            {/* Consistent Segmented Tab Bar */}
            <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80 max-w-full overflow-x-auto no-scrollbar gap-1">
                <Link
                    href="/merchant/shopping/wholesale"
                    className="px-3.5 sm:px-4 py-1.5 rounded-lg font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all whitespace-nowrap"
                >
                    Buy Stock
                </Link>
                <Link
                    href="/merchant/shopping/wholesale/history"
                    className="px-3.5 sm:px-4 py-1.5 rounded-lg font-medium text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all whitespace-nowrap"
                >
                    Purchase History
                </Link>
                <span className="px-3.5 sm:px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs whitespace-nowrap">
                    Sales to InTrust
                </span>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40 shrink-0">
                        <FileText size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Sales</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.totalOrders}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40 shrink-0">
                        <Package size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Units Sold</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.totalUnits}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/40 shrink-0">
                        <IndianRupee size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total Earnings</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{fmt(stats.totalEarningsPaise)}</p>
                    </div>
                </div>
            </div>

            {/* Search toolbar */}
            <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search size={16} />
                </div>
                <input
                    type="text"
                    placeholder="Search by invoice number..."
                    aria-label="Search by invoice number"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                            {search ? 'No orders match your search' : 'No sales recorded yet'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-normal max-w-sm mx-auto">
                            {search ? `No sales history found for "${search}".` : 'Procurement orders from InTrust will appear here once placed.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                                    <th className="text-left px-4 sm:px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Invoice</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Value</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filtered.map(order => {
                                    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    });

                                    const itemCount = order.platform_procurement_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 sm:px-5 py-3.5">
                                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white tracking-tight">{dateStr}</p>
                                                <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-0.5">{order.invoice_number || 'N/A'}</p>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                                                    {itemCount} {itemCount !== 1 ? 'units' : 'unit'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{fmt(order.total_amount_paise)}</p>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button
                                                    onClick={() => handleDownloadInvoice(order)}
                                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 font-bold text-xs rounded-lg transition-all border border-blue-200/60 dark:border-blue-900/50"
                                                    title="Download Invoice"
                                                >
                                                    <Download size={13} />
                                                    Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
