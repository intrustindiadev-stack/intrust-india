'use client';

import React, { useRef } from 'react';
import { 
    FileText, 
    Printer, 
    Download, 
    X, 
    CheckCircle2, 
    Building2, 
    ShieldCheck, 
    Calendar,
    Receipt
} from 'lucide-react';
import Image from 'next/image';

export default function SponsorshipGstInvoiceModal({ invoice, merchant, onClose }) {
    if (!invoice) return null;

    const baseFee = invoice.baseFeeRupees || 999;
    const cgst = invoice.cgstRupees || (baseFee * 0.09);
    const sgst = invoice.sgstRupees || (baseFee * 0.09);
    const total = invoice.totalRupees || (baseFee + cgst + sgst);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white text-slate-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                {/* Modal Controls Header (Hidden during Print) */}
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <Receipt size={18} className="text-amber-400" />
                        <span className="text-xs sm:text-sm font-bold tracking-tight">Official GST Tax Invoice</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            18% GST Paid
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
                        >
                            <Printer size={14} />
                            <span>Print / PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Document Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible">
                    {/* Header: Company & Invoice Info */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-sm">
                                    IN
                                </div>
                                <span className="text-lg font-black tracking-tight text-slate-950">InTrust India</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-600">InTrust Technologies Private Limited</p>
                            <p className="text-xs text-slate-500">Corporate Tower, Connaught Place, New Delhi 110001</p>
                            <p className="text-xs font-bold text-slate-700 mt-1">GSTIN: <span className="font-mono">07AAACI8492Q1Z8</span></p>
                            <p className="text-xs text-slate-500">State: Delhi (Code: 07)</p>
                        </div>

                        <div className="sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-mono">
                                TAX INVOICE
                            </span>
                            <h4 className="text-sm font-black text-slate-900 mt-2 font-mono">
                                {invoice.invoiceNumber || 'INV-MKT-202609-001'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Date: {(invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-500">
                                Service Date: {invoice.serviceDate || 'Upcoming Date'}
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 size={12} />
                                <span>PAID via {invoice.paymentMethod === 'wallet' ? 'Merchant Wallet' : 'SabPaisa PG'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bill To Merchant */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                            Billed To (Client / Merchant)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="font-bold text-slate-900 text-sm">{invoice.merchantName || merchant?.business_name || 'Verified Partner'}</p>
                                <p className="text-slate-600 mt-0.5">{merchant?.store_name || merchant?.business_name || 'InTrust Merchant Store'}</p>
                                <p className="text-slate-500">{merchant?.business_email || merchant?.business_phone || ''}</p>
                            </div>
                            <div className="sm:text-right">
                                <p className="text-slate-500">Place of Supply: <span className="font-bold text-slate-800">{merchant?.state || 'Delhi (07)'}</span></p>
                                <p className="text-slate-500 mt-0.5">GSTIN: <span className="font-mono text-slate-800">{merchant?.gstin || 'Unregistered / Exempt'}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Itemized Line Items Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Description of Services</th>
                                    <th className="p-3 text-center">SAC Code</th>
                                    <th className="p-3 text-right">Taxable Value</th>
                                    <th className="p-3 text-right">GST Rate</th>
                                    <th className="p-3 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                <tr>
                                    <td className="p-3 text-slate-900 font-semibold">
                                        {invoice.serviceDescription || 'Daily Trivia Challenge Prime Placement & Catalog Showcase (24 Hours)'}
                                        <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                                            Exclusively showcased to 10,000+ daily active challenge players.
                                        </div>
                                    </td>
                                    <td className="p-3 text-center font-mono text-slate-600">
                                        {invoice.sacCode || '998365'}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                                        ₹{baseFee.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right text-slate-600">
                                        18.00%
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                                        ₹{baseFee.toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Tax & Total Calculation */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="max-w-xs text-[11px] text-slate-500 space-y-1">
                            <p className="font-bold text-slate-700">Tax Note:</p>
                            <p>Services classified under SAC 998365 (Advertising, publicizing, and promotional marketing services).</p>
                            <p>GST calculated at 18% as per GST Council guidelines (CGST 9% + SGST 9%).</p>
                        </div>

                        <div className="w-full sm:w-72 bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Taxable Amount</span>
                                <span className="font-mono font-bold text-slate-900">₹{baseFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>CGST @ 9.0%</span>
                                <span className="font-mono font-bold text-slate-900">₹{cgst.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>SGST @ 9.0%</span>
                                <span className="font-mono font-bold text-slate-900">₹{sgst.toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                                <span className="font-black text-sm text-slate-950">Grand Total</span>
                                <span className="font-mono font-black text-base text-blue-600">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Disclaimer */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
                        <p>This is an authentic, digitally generated GST Tax Invoice. No physical signature required.</p>
                        <p className="font-bold text-slate-600">InTrust India — Empowering Local Businesses</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
