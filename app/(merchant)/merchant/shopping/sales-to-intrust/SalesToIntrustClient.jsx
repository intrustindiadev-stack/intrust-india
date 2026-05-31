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
        <div className="p-6 lg:p-10 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="space-y-2">
                    <Link href="/merchant/shopping" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors text-xs font-black uppercase tracking-widest mb-2">
                        <ChevronLeft size={14} /> Back to Shopping Hub
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                        <FileText size={12} />
                        B2B History
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none">
                        Sales to <span className="text-blue-600">InTrust</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-base max-w-md">
                        View orders procured by the platform from your wholesale inventory and download tax invoices.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">{stats.totalOrders}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                        <Package size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units Sold</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">{stats.totalUnits}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <IndianRupee size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Earnings</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">{fmt(stats.totalEarningsPaise)}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by invoice number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-24 text-center">
                        <FileText className="mx-auto text-slate-100 mb-4" size={56} />
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
                            No sales history found
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/70">
                                    <th className="text-left px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Invoice</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                                    <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Value</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(order => {
                                    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    });

                                    const itemCount = order.platform_procurement_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                                    return (
                                        <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-black text-slate-950 tracking-tight">{dateStr}</p>
                                                <p className="text-[10px] font-black text-blue-600 mt-0.5">{order.invoice_number || 'N/A'}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                                                    {itemCount} unit{itemCount !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-sm font-black text-blue-600">{fmt(order.total_amount_paise)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => handleDownloadInvoice(order)}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all mx-auto"
                                                    title="Download Invoice"
                                                >
                                                    <Download size={14} />
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
