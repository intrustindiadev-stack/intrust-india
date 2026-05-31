"use client";

import React, { useState } from "react";
import { ChevronLeft, Download, FileText, Search, Store } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { generateProcurementInvoice } from "@/lib/invoiceGenerator";

export default function ProcurementHistoryClient({ initialOrders }) {
    const [orders, setOrders] = useState(initialOrders || []);
    const [search, setSearch] = useState("");

    const filtered = orders.filter(order => {
        const matchesSearch = !search ||
            (order.merchants?.business_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (order.invoice_number || "").toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    const handleDownloadInvoice = async (order) => {
        try {
            await generateProcurementInvoice({
                procurementOrder: order,
                items: order.platform_procurement_items || [],
                merchant: order.merchants || {}
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
                    <Link href="/admin/shopping/procurement" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors text-xs font-black uppercase tracking-widest mb-2">
                        <ChevronLeft size={14} /> Back to Procurement
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                        <FileText size={12} />
                        History
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none">
                        Procurement <span className="text-indigo-600">History</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-base max-w-md">
                        View past wholesale orders and download system-generated invoices.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by merchant or invoice number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-[1.2rem] bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-24 text-center">
                        <FileText className="mx-auto text-slate-100 mb-4" size={56} />
                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
                            No procurement history found
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/70">
                                    <th className="text-left px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Invoice</th>
                                    <th className="text-left px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Merchant</th>
                                    <th className="text-center px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                                    <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                                    <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">GST</th>
                                    <th className="text-right px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Credit</th>
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
                                        <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-black text-slate-950 tracking-tight">{dateStr}</p>
                                                <p className="text-[10px] font-black text-indigo-600 mt-0.5">{order.invoice_number || 'N/A'}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Store size={12} className="text-violet-500 shrink-0" />
                                                    <span className="text-xs font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100 uppercase tracking-wider truncate max-w-[150px]">
                                                        {order.merchants?.business_name || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                                                    {itemCount} unit{itemCount !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-sm font-black text-slate-600">{fmt(order.total_cost_paise)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-sm font-black text-slate-600">{fmt(order.total_gst_paise)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-sm font-black text-indigo-600">{fmt(order.total_amount_paise)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => handleDownloadInvoice(order)}
                                                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all mx-auto"
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
