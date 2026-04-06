"use client";

import React, { useEffect } from "react";
import { format } from "date-fns";
import { PLATFORM_CONFIG } from "@/lib/config/platform";

const InvoiceClient = ({ order, items, sellerDetails }) => {
    
    // Trigger print automatically when loaded
    useEffect(() => {
        // A short timeout to ensure fonts/styles load
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Helper for currency formatting
    // Use safe fallbacks for order data to prevent crashes
    const safeOrderId = order?.id || "unknown";
    const safeCreatedAt = order?.created_at ? new Date(order.created_at) : new Date();
    
    const invoiceNumber = `INV-${safeCreatedAt.getFullYear()}-${safeOrderId.slice(0, 8).toUpperCase()}`;
    const invoiceDate = format(safeCreatedAt, "dd MMM, yyyy");

    const formatCurrency = (paise) => {
        return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Perform tax calculations assuming prices are INCLUSIVE of GST
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let grandTotal = 0;

    const processedItems = items.map((item, index) => {
        if (item.shopping_products?.gst_percentage === undefined || item.shopping_products?.gst_percentage === null) {
            console.warn('GST percentage missing for item:', item);
        }
        const gstRate = item.shopping_products?.gst_percentage || 0;
        const hsnCode = item.shopping_products?.hsn_code || "-";
        const quantity = item.quantity || 1;
        const totalAmountInclusive = (item.unit_price_paise || 0) * quantity; // unit price * qty
        
        // Reverse calculate base price: Base = Total / (1 + (GST / 100))
        const divisor = 1 + (gstRate / 100);
        const taxableAmount = totalAmountInclusive / divisor;
        const totalTaxAmount = totalAmountInclusive - taxableAmount;
        
        // Split tax into CGST and SGST (assuming intra-state for simplicity)
        const cgstAmount = totalTaxAmount / 2;
        const sgstAmount = totalTaxAmount / 2;

        totalTaxableValue += taxableAmount;
        totalCgst += cgstAmount;
        totalSgst += sgstAmount;
        grandTotal += totalAmountInclusive;

        return {
            sNo: index + 1,
            description: item.shopping_products?.title || "Item",
            hsnCode: hsnCode,
            qty: quantity,
            grossAmount: totalAmountInclusive,
            taxableAmount: taxableAmount,
            gstRate: gstRate,
            cgstAmount: cgstAmount,
            sgstAmount: sgstAmount,
            totalAmount: totalAmountInclusive
        };
    });

    const deliveryFee = order.delivery_fee_paise ?? 0;
    grandTotal += deliveryFee;

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0 text-slate-900 font-sans">
            {/* INVOICE WRAPPER */}
            <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-10 shadow-lg print:shadow-none print:p-0">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-200">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-1">INVOICE</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Original for Recipient</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-emerald-600 mb-1">InTrust India</div>
                        <p className="text-xs text-slate-500 font-medium">{PLATFORM_CONFIG.business.website}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Seller Info */}
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sold By</h3>
                        <p className="font-bold text-sm text-slate-800 mb-1">{sellerDetails?.name}</p>
                        <p className="text-xs text-slate-600 mb-1">{sellerDetails?.address}</p>
                        {sellerDetails?.phone && <p className="text-xs text-slate-600">Ph: {sellerDetails.phone}</p>}
                        {sellerDetails?.gstin && <p className="text-xs font-bold text-slate-700 mt-2">GSTIN/UIN: {sellerDetails.gstin}</p>}
                        {sellerDetails?.pan && <p className="text-xs font-bold text-slate-700">PAN: {sellerDetails.pan}</p>}
                    </div>

                    {/* Buyer Info */}
                    <div className="text-right">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billing / Delivery Address</h3>
                        <p className="font-bold text-sm text-slate-800 mb-1">{order.customer_name}</p>
                        <p className="text-xs text-slate-600 ml-auto max-w-[250px]">{order.delivery_address}</p>
                        {order.customer_phone && <p className="text-xs text-slate-600 mt-1">Ph: {order.customer_phone}</p>}
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Invoice Number</p>
                        <p className="font-bold text-sm text-slate-800">{invoiceNumber}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Order Date</p>
                        <p className="font-bold text-sm text-slate-800">{invoiceDate}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Payment Status</p>
                        <p className="font-bold text-sm text-emerald-600 uppercase">Paid (Wallet)</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-white">
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-tl-lg">S.No</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">Description</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider">HSN/SAC</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-right">Qty</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-right">Taxable Value</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-right">CGST</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-right">SGST</th>
                                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-right rounded-tr-lg">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs text-slate-700 border-b border-slate-200">
                            {processedItems.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="py-3 px-3 font-medium">{row.sNo}</td>
                                    <td className="py-3 px-3 w-1/3">
                                        <p className="font-bold text-slate-900">{row.description}</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Includes {row.gstRate}% GST</p>
                                    </td>
                                    <td className="py-3 px-3 font-medium">{row.hsnCode}</td>
                                    <td className="py-3 px-3 text-right font-medium">{row.qty}</td>
                                    <td className="py-3 px-3 text-right font-medium">{formatCurrency(row.taxableAmount)}</td>
                                    <td className="py-3 px-3 text-right">
                                        {formatCurrency(row.cgstAmount)}
                                        <br /><span className="text-[8px] text-slate-400">({row.gstRate/2}%)</span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        {formatCurrency(row.sgstAmount)}
                                        <br /><span className="text-[8px] text-slate-400">({row.gstRate/2}%)</span>
                                    </td>
                                    <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(row.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2 border border-slate-200 rounded-xl p-0 overflow-hidden">
                        <table className="w-full text-xs">
                            <tbody>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <td className="py-2 px-4 font-bold text-slate-700">Total Taxable Value</td>
                                    <td className="py-2 px-4 text-right font-medium">{formatCurrency(totalTaxableValue)}</td>
                                </tr>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <td className="py-2 px-4 font-bold text-slate-700">Total CGST</td>
                                    <td className="py-2 px-4 text-right font-medium">{formatCurrency(totalCgst)}</td>
                                </tr>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <td className="py-2 px-4 font-bold text-slate-700">Total SGST</td>
                                    <td className="py-2 px-4 text-right font-medium">{formatCurrency(totalSgst)}</td>
                                </tr>
                                <tr className="border-b border-slate-200 bg-white">
                                    <td className="py-2 px-4 font-bold text-slate-700">Delivery Fee</td>
                                    <td className="py-2 px-4 text-right font-medium">{formatCurrency(deliveryFee)}</td>
                                </tr>
                                <tr className="bg-emerald-50">
                                    <td className="py-3 px-4 font-black text-emerald-800">Invoice Total</td>
                                    <td className="py-3 px-4 text-right font-black text-lg text-emerald-700 flex items-center justify-end gap-1">
                                        <span>₹</span> {formatCurrency(grandTotal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="border-t-2 border-slate-200 pt-6 flex justify-between items-end">
                    <div className="w-2/3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Terms & Conditions</h4>
                        <ol className="text-[9px] text-slate-500 list-decimal pl-4 space-y-1">
                            <li>All disputes are subject to local jurisdiction.</li>
                            <li>Items can be returned within 7 days of delivery as per our return policy.</li>
                            <li>This is a computer-generated invoice and does not require a signature.</li>
                        </ol>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold text-slate-800 mb-8 border-b border-slate-300 inline-block px-4 pb-1">Authorized Signatory</p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">For {sellerDetails?.name}</p>
                    </div>
                </div>
            </div>

            {/* Print Button Wrapper for non-print view */}
            <div className="max-w-[210mm] mx-auto mt-6 text-center print:hidden">
                <button 
                    onClick={() => window.print()} 
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                    Print / Save PDF
                </button>
                <p className="text-xs text-slate-500 mt-3 font-medium">Use Ctrl+P (or Cmd+P) to print the document. Select "Save as PDF" to download.</p>
            </div>
        </div>
    );
};

export default InvoiceClient;
