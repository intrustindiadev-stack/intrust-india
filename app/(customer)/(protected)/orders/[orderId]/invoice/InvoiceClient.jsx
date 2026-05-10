"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { generateOrderInvoice } from "@/lib/invoiceGenerator";
import { Download, FileText } from "lucide-react";

const InvoiceClient = ({ order, items, sellerDetails }) => {
    const [downloading, setDownloading] = useState(false);
    const [ready, setReady] = useState(false);

    const safeCreatedAt = order?.created_at ? new Date(order.created_at) : new Date();
    const invoiceNumber = `INV-${safeCreatedAt.getFullYear()}-${(order?.id || "unknown").slice(0, 8).toUpperCase()}`;
    const invoiceDate = format(safeCreatedAt, "dd MMM, yyyy");

    useEffect(() => {
        setReady(true);
    }, []);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            generateOrderInvoice({
                order,
                items,
                seller: sellerDetails,
                type: "shopping",
            });
        } catch (err) {
            console.error("Invoice generation failed:", err);
        } finally {
            setDownloading(false);
        }
    };

    // Helper for currency formatting
    const formatCurrency = (paise) =>
        (paise / 100).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // Process items for the preview table
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let grandTotal = 0;

    const processedItems = items.map((item, index) => {
        const gstRate = item.shopping_products?.gst_percentage || 0;
        const hsnCode = item.shopping_products?.hsn_code || "-";
        const quantity = item.quantity || 1;
        const taxableAmount = (item.unit_price_paise || 0) * quantity;
        const totalTaxAmount = Math.round(taxableAmount * gstRate / 100);
        const cgstAmount = totalTaxAmount / 2;
        const sgstAmount = totalTaxAmount / 2;
        const totalAmount = taxableAmount + totalTaxAmount;

        totalTaxableValue += taxableAmount;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        grandTotal += totalAmount;

        return {
            sNo: index + 1,
            description: item.shopping_products?.title || "Item",
            hsnCode,
            qty: quantity,
            taxableAmount,
            gstRate,
            cgstAmount,
            sgstAmount,
            totalAmount,
        };
    });

    const deliveryFee = order.delivery_fee_paise ?? 0;
    grandTotal += deliveryFee;

    return (
        <div className="min-h-screen bg-slate-100 py-8 text-slate-900 font-sans">
            {/* Download bar */}
            <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between bg-white rounded-2xl px-5 py-3 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl">
                        <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">{invoiceNumber}</p>
                        <p className="text-xs text-slate-500">{invoiceDate}</p>
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={downloading || !ready}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                >
                    <Download className="h-4 w-4" />
                    {downloading ? "Generating..." : "Download PDF"}
                </button>
            </div>

            {/* Preview Invoice (same blue & white design for screen reading) */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-lg rounded-2xl overflow-hidden">
                {/* Header — Dark blue band */}
                <div className="bg-[#1e3a8a] px-10 py-5 flex justify-between items-center">
                    <div>
                        <p className="text-2xl font-black text-white tracking-tight leading-none">INTRUST</p>
                        <p className="text-xs text-blue-200 mt-0.5">Financial Services (India) Pvt. Ltd.</p>
                    </div>
                    <p className="text-lg font-black text-white tracking-widest">TAX INVOICE</p>
                </div>

                {/* Meta strip — Light blue */}
                <div className="bg-[#eff6ff] px-10 py-2.5 flex justify-between items-center border-b border-blue-100">
                    <p className="text-sm font-bold text-[#1e3a8a]">Invoice No: {invoiceNumber}</p>
                    <p className="text-sm font-bold text-[#1e3a8a]">Date: {invoiceDate}</p>
                </div>

                <div className="px-10 py-6">
                    {/* From / Bill To */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* FROM */}
                        <div className="bg-[#eff6ff] rounded-xl p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">From</p>
                            <div className="w-6 h-0.5 bg-blue-500 mb-2" />
                            <p className="font-bold text-sm text-slate-900 mb-1">{sellerDetails?.name}</p>
                            <p className="text-xs text-slate-600 mb-1 leading-relaxed">{sellerDetails?.address}</p>
                            {sellerDetails?.gstin && (
                                <p className="text-xs font-bold text-slate-700">GSTIN: {sellerDetails.gstin}</p>
                            )}
                            {sellerDetails?.phone && (
                                <p className="text-xs text-slate-600">Ph: {sellerDetails.phone}</p>
                            )}
                        </div>
                        {/* BILL TO */}
                        <div className="bg-[#eff6ff] rounded-xl p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Bill To</p>
                            <div className="w-6 h-0.5 bg-blue-500 mb-2" />
                            <p className="font-bold text-sm text-slate-900 mb-1">{order.customer_name}</p>
                            <p className="text-xs text-slate-600 mb-1 leading-relaxed">{order.delivery_address}</p>
                            {order.customer_phone && (
                                <p className="text-xs text-slate-600">Ph: {order.customer_phone}</p>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-6 rounded-xl overflow-hidden border border-slate-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1e3a8a] text-white">
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider">#</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider">Description</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider">HSN/SAC</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider text-right">Qty</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider text-right">Unit Price</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider text-right">GST%</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider text-right">GST Amt</th>
                                    <th className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider text-right">Total (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-slate-700">
                                {processedItems.map((row, idx) => (
                                    <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-[#eff6ff]"}`}>
                                        <td className="py-3 px-3 font-bold text-center">{row.sNo}</td>
                                        <td className="py-3 px-3">
                                            <p className="font-bold text-slate-900">{row.description}</p>
                                            <p className="text-[9px] text-slate-400">GST: {row.gstRate}%</p>
                                        </td>
                                        <td className="py-3 px-3 text-center">{row.hsnCode}</td>
                                        <td className="py-3 px-3 text-right">{row.qty}</td>
                                        <td className="py-3 px-3 text-right font-bold">Rs. {formatCurrency((row.taxableAmount) / row.qty)}</td>
                                        <td className="py-3 px-3 text-center">{row.gstRate}%</td>
                                        <td className="py-3 px-3 text-right">Rs. {formatCurrency(row.cgstAmount + row.sgstAmount)}</td>
                                        <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. {formatCurrency(row.totalAmount)}</td>
                                    </tr>
                                ))}
                                {deliveryFee > 0 && (
                                    <tr className="border-b border-slate-100 bg-[#eff6ff]">
                                        <td className="py-3 px-3 font-bold text-center">{processedItems.length + 1}</td>
                                        <td className="py-3 px-3 font-bold text-slate-900">Delivery Charges</td>
                                        <td className="py-3 px-3 text-center">9971</td>
                                        <td className="py-3 px-3 text-right">1</td>
                                        <td className="py-3 px-3 text-right font-bold">Rs. {formatCurrency(deliveryFee)}</td>
                                        <td className="py-3 px-3 text-center">0%</td>
                                        <td className="py-3 px-3 text-right">Rs. 0.00</td>
                                        <td className="py-3 px-3 text-right font-bold text-slate-900">Rs. {formatCurrency(deliveryFee)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-6">
                        <div className="w-1/2 bg-[#eff6ff] rounded-xl overflow-hidden">
                            <div className="px-4 py-2.5 flex justify-between border-b border-blue-100">
                                <span className="text-xs text-slate-500 font-medium">Subtotal</span>
                                <span className="text-xs font-bold text-slate-800">Rs. {formatCurrency(totalTaxableValue)}</span>
                            </div>
                            <div className="px-4 py-2.5 flex justify-between border-b border-blue-100">
                                <span className="text-xs text-slate-500 font-medium">Total GST</span>
                                <span className="text-xs font-bold text-slate-800">Rs. {formatCurrency(totalCgst + totalSgst)}</span>
                            </div>
                            {deliveryFee > 0 && (
                                <div className="px-4 py-2.5 flex justify-between border-b border-blue-100">
                                    <span className="text-xs text-slate-500 font-medium">Delivery Fee</span>
                                    <span className="text-xs font-bold text-slate-800">Rs. {formatCurrency(deliveryFee)}</span>
                                </div>
                            )}
                            <div className="bg-[#1e3a8a] px-4 py-3 flex justify-between items-center rounded-b-xl">
                                <span className="text-sm font-black text-white">Grand Total</span>
                                <span className="text-base font-black text-white">Rs. {formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Amount in words */}
                    <div className="bg-[#eff6ff] rounded-xl px-4 py-3 mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Amount in words: </span>
                        <span className="text-xs font-bold text-slate-800">
                            {/* Simple representation for preview */}
                            Rs. {formatCurrency(grandTotal)} Only
                        </span>
                    </div>

                    {/* Terms & Footer */}
                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#1e3a8a] mb-1">Terms & Conditions</p>
                        <div className="w-10 h-0.5 bg-blue-500 mb-2" />
                        <p className="text-[9px] text-slate-500">This is a computer-generated invoice. No signature is required.</p>
                    </div>
                </div>

                {/* Footer bar */}
                <div className="bg-[#1e3a8a] px-10 py-3 text-center">
                    <p className="text-[10px] text-blue-200">This is a system-generated document. No signature is required.</p>
                    <p className="text-[9px] text-blue-300 mt-0.5">Powered by InTrust Platform</p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceClient;
