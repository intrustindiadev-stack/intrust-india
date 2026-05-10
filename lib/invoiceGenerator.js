import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PLATFORM_CONFIG } from '@/lib/config/platform';

/**
 * Converts a number to Indian currency words
 */
const numberToWords = (num) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';

    return str.trim() + ' Rupees Only';
};

/**
 * Helper: Format Currency
 */
const fmt = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Color Palette (Premium & Modern) ─────────────────────────
const NAVY_BLUE = { r: 15, g: 23, b: 42 };     // Slate 900
const BRAND_BLUE = { r: 37, g: 99, b: 235 };   // Blue 600
const DARK_BLUE = { r: 30, g: 58, b: 138 };    // Blue 900
const LIGHT_BLUE = { r: 239, g: 246, b: 255 }; // Blue 50
const SLATE_500 = { r: 100, g: 116, b: 139 };
const BORDER = { r: 226, g: 232, b: 240 };     // Slate 200

/**
 * Helper: Draw a linear blue gradient header
 */
const drawGradientHeader = (doc, width, height) => {
    const steps = 40;
    for (let i = 0; i < steps; i++) {
        const r = 37 + ((30 - 37) * (i / steps));
        const g = 99 + ((58 - 99) * (i / steps));
        const b = 235 + ((138 - 235) * (i / steps));
        doc.setFillColor(r, g, b);
        doc.rect(0, (height / steps) * i, width, height / steps + 0.1, 'F');
    }
};

/**
 * Generates a professional invoice PDF from manually entered data.
 * Compact & Brand focused (Inspired by DMart/Blinkit).
 */
export const generateManualInvoice = (data) => {
    const { seller, customer, items, totals, meta } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12; // Even more compact
    const contentWidth = pageWidth - margin * 2;

    // ─── PREMIUM GRADIENT HEADER ───────────────────────────────
    drawGradientHeader(doc, pageWidth, 28);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', margin, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Financial Services (India) Pvt. Ltd.', margin, 23);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 19, { align: 'right' });

    // ─── META INFO (SUPER COMPACT) ────────────────────────────
    let currentY = 32;
    doc.setFontSize(9);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.text(`Invoice No: ${meta.invoice_number || 'N/A'}`, margin, currentY);

    const dateStr = meta.invoice_date
        ? new Date(meta.invoice_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    doc.setFont('helvetica', 'bold');
    doc.text(`Date: ${dateStr}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 4;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // ─── ADDRESSES (BLINKIT STYLE COMPACT) ────────────────────
    currentY += 8;
    const colWidth = contentWidth / 2 - 4;

    // Seller Info
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b);
    doc.text('SOLD BY', margin, currentY);

    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setFontSize(9.5);
    doc.text(seller.company_name || 'InTrust India', margin, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    const sellerAddr = doc.splitTextToSize(seller.company_address || '', colWidth);
    doc.text(sellerAddr, margin, currentY + 9);

    let addrEndY = currentY + 9 + (sellerAddr.length * 4);
    const gstin = seller.gst_number || PLATFORM_CONFIG.business.gstin;
    if (gstin) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
        doc.text(`GSTIN: ${gstin}`, margin, addrEndY + 2);
    }

    // Customer Info (Billed To)
    const custX = margin + colWidth + 8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b);
    doc.text('BILLED TO', custX, currentY);

    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setFontSize(9.5);
    doc.text(customer.name || 'Valued Customer', custX, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    if (customer.address) {
        const custAddr = doc.splitTextToSize(customer.address, colWidth);
        doc.text(custAddr, custX, currentY + 9);
    }
    if (customer.phone) {
        doc.text(`Mobile: +91 ${customer.phone}`, custX, currentY + 22);
    }

    // ─── TABLE (DENSE & MODERN) ───────────────────────────────
    const tableBody = items.map((item, idx) => {
        const gst = item.gst_percent || 0;
        const taxPerSide = (gst / 2).toFixed(1) + '%';
        const taxAmtSide = fmt((item.gst || 0) / 2);

        return [
            (idx + 1).toString(),
            item.name || 'Service Item',
            item.hsn_sac || '-',
            item.quantity.toString(),
            fmt(item.unit_price),
            taxPerSide, taxAmtSide,
            taxPerSide, taxAmtSide,
            fmt(item.total),
        ];
    });

    autoTable(doc, {
        startY: currentY + 32,
        head: [['#', 'ITEM DESCRIPTION', 'HSN', 'QTY', 'UNIT PRICE', 'SGST %', 'SGST', 'CGST %', 'CGST', 'AMOUNT']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, textColor: NAVY_BLUE, lineColor: BORDER },
        headStyles: { fillColor: LIGHT_BLUE, textColor: DARK_BLUE, fontStyle: 'bold', lineWidth: 0.1, lineColor: BORDER },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 12, halign: 'center' },
            6: { cellWidth: 15, halign: 'right' },
            7: { cellWidth: 12, halign: 'center' },
            8: { cellWidth: 15, halign: 'right' },
            9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: BRAND_BLUE },
        },
        margin: { left: margin, right: margin },
    });

    // ─── TOTALS & SUMMARY (DMART STYLE) ───────────────────────
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY + 65 > 280) { doc.addPage(); finalY = 20; }

    const totalsX = pageWidth - margin - 70;
    const addRow = (label, val, bold = false, isTotal = false) => {
        doc.setFontSize(isTotal ? 11 : 8.5);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(isTotal ? BRAND_BLUE.r : (bold ? NAVY_BLUE.r : SLATE_500.r), isTotal ? BRAND_BLUE.g : (bold ? NAVY_BLUE.g : SLATE_500.g), isTotal ? BRAND_BLUE.b : (bold ? NAVY_BLUE.b : SLATE_500.b));
        doc.text(label, totalsX, finalY);
        doc.text(`₹${val}`, pageWidth - margin, finalY, { align: 'right' });
        finalY += isTotal ? 8 : 5.5;
    };

    addRow('Items Subtotal', fmt(totals.subtotal));
    addRow('SGST Output', fmt(totals.totalGst / 2));
    addRow('CGST Output', fmt(totals.totalGst / 2));

    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.line(totalsX, finalY - 2, pageWidth - margin, finalY - 2);
    finalY += 4;
    addRow('GRAND TOTAL', fmt(totals.grandTotal), true, true);

    // Summary Info
    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('TOTAL AMOUNT IN WORDS', margin, finalY);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setFontSize(8.5);
    doc.text(numberToWords(Math.round(totals.grandTotal)), margin, finalY + 4.5);

    // Terms & Declaration
    finalY += 16;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.text('DECLARATION & TERMS', margin, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    const disclaimer = meta.disclaimer || '1. Goods/Services once sold are non-refundable. 2. This is a digital tax invoice and does not require a physical signature.';
    doc.text(doc.splitTextToSize(disclaimer, contentWidth), margin, finalY + 4);

    // ─── FOOTER (CLEAN) ──────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
        doc.rect(0, 287, pageWidth, 10, 'F');
        doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
        doc.setFontSize(7);
        doc.text(`Page ${i} of ${pageCount} | System Generated Invoice | Powered by InTrust India`, pageWidth / 2, 293.5, { align: 'center' });
    }

    doc.save(`${meta.invoice_number || 'Invoice'}.pdf`);
};

/**
 * Generates an invoice PDF from order data.
 * Optimized for E-commerce & Gift Cards (Blinkit style).
 */
export const generateOrderInvoice = (params) => {
    const { order, items = [], seller, customer: customerOverride, type = 'shopping' } = params;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    const invoiceNumber = `INV-${new Date(order.created_at).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const custName = customerOverride?.name || order.customer_name || 'Valued Customer';
    const custAddress = customerOverride?.address || order.delivery_address || '';
    const custPhone = customerOverride?.phone || order.customer_phone || '';

    // ─── PREMIUM GRADIENT HEADER ───────────────────────────────
    drawGradientHeader(doc, pageWidth, 28);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', margin, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Financial Services (India) Pvt. Ltd.', margin, 23);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 19, { align: 'right' });

    // ─── META INFO (SUPER COMPACT) ────────────────────────────
    let currentY = 32;
    doc.setFontSize(9);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.text(`Invoice No: ${invoiceNumber}`, margin, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`Date: ${invoiceDate}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 4;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // ─── ADDRESSES (SIDE-BY-SIDE COMPACT) ─────────────────────
    currentY += 8;
    const colWidth = contentWidth / 2 - 4;

    // Seller Info
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b);
    doc.text('SOLD BY', margin, currentY);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setFontSize(9.5);
    doc.text(seller?.name || 'InTrust India', margin, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    if (seller?.address) {
        const addr = doc.splitTextToSize(seller.address, colWidth);
        doc.text(addr, margin, currentY + 9);
    }
    const gstin = seller?.gstin || PLATFORM_CONFIG.business.gstin;
    if (gstin) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
        doc.text(`GSTIN: ${gstin}`, margin, currentY + 20);
    }

    // Customer Info
    const custX = margin + colWidth + 8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_BLUE.r, BRAND_BLUE.g, BRAND_BLUE.b);
    doc.text('SHIPPED TO', custX, currentY);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setFontSize(9.5);
    doc.text(custName, custX, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    if (custAddress) {
        const addr = doc.splitTextToSize(custAddress, colWidth);
        doc.text(addr, custX, currentY + 9);
    }
    if (custPhone) {
        doc.text(`Mobile: +91 ${custPhone}`, custX, currentY + 22);
    }

    // ─── ITEMS PROCESSING ─────────────────────────────────────
    let processedItems = [];
    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;

    if (type === 'giftcard') {
        const paidAmount = order.paidAmount || (order.amount || 0) / 100;
        processedItems = [['1', order.brand || 'Gift Card Subscription', '9971', '1', fmt(paidAmount), '0%', '0.00', '0%', '0.00', fmt(paidAmount)]];
        subtotal = paidAmount; grandTotal = paidAmount;
    } else if (type === 'nfc') {
        const salePrice = (order.sale_price_paise || 0) / 100;
        const DELIVERY_FEE = 50;
        const cardTotal = salePrice - DELIVERY_FEE;
        const gstAmt = Math.round(cardTotal * 0.18 * 100) / 100;
        processedItems.push(['1', 'InTrust Premium NFC Card', '9971', '1', fmt(cardTotal), '9%', fmt(gstAmt / 2), '9%', fmt(gstAmt / 2), fmt(cardTotal + gstAmt)]);
        processedItems.push(['2', 'Priority Shipping', '9971', '1', fmt(DELIVERY_FEE), '0%', '0.00', '0%', '0.00', fmt(DELIVERY_FEE)]);
        subtotal = cardTotal + DELIVERY_FEE; totalGst = gstAmt; grandTotal = subtotal + totalGst;
    } else {
        items.forEach((item, idx) => {
            const gstRate = item.shopping_products?.gst_percentage || item.gst_percentage || 0;
            const qty = item.quantity || 1;
            const totalPaise = item.total_price_paise || (item.unit_price_paise * qty) || 0;
            const gstAmt = Math.round(totalPaise * gstRate / 100);
            const itemTotal = (totalPaise + gstAmt) / 100;
            subtotal += totalPaise / 100; totalGst += gstAmt / 100; grandTotal += itemTotal;
            processedItems.push([
                (idx + 1).toString(),
                item.shopping_products?.title || item.product_title || 'Product Item',
                item.shopping_products?.hsn_code || item.hsn_code || '-',
                qty.toString(), fmt(totalPaise / qty / 100),
                `${gstRate / 2}%`, fmt(gstAmt / 2 / 100),
                `${gstRate / 2}%`, fmt(gstAmt / 2 / 100),
                fmt(itemTotal)
            ]);
        });
        const deliveryFee = (order.delivery_fee_paise || 0) / 100;
        if (deliveryFee > 0) {
            processedItems.push([(processedItems.length + 1).toString(), 'Shipping Charges', '9971', '1', fmt(deliveryFee), '0%', '0.00', '0%', '0.00', fmt(deliveryFee)]);
            grandTotal += deliveryFee;
        }
    }

    // ─── TABLE ────────────────────────────────────────────────
    autoTable(doc, {
        startY: currentY + 34,
        head: [['#', 'ITEM DESCRIPTION', 'HSN', 'QTY', 'UNIT PRICE', 'SGST %', 'SGST', 'CGST %', 'CGST', 'AMOUNT']],
        body: processedItems,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, textColor: NAVY_BLUE, lineColor: BORDER },
        headStyles: { fillColor: LIGHT_BLUE, textColor: DARK_BLUE, fontStyle: 'bold', lineWidth: 0.1, lineColor: BORDER },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 12, halign: 'center' },
            6: { cellWidth: 15, halign: 'right' },
            7: { cellWidth: 12, halign: 'center' },
            8: { cellWidth: 15, halign: 'right' },
            9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: BRAND_BLUE },
        }
    });

    // ─── TOTALS & FOOTER ──────────────────────────────────────
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY + 65 > 280) { doc.addPage(); finalY = 20; }
    const totalsX = pageWidth - margin - 70;
    const addRow = (label, val, bold = false, isTotal = false) => {
        doc.setFontSize(isTotal ? 11 : 8.5);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(isTotal ? BRAND_BLUE.r : (bold ? NAVY_BLUE.r : SLATE_500.r), isTotal ? BRAND_BLUE.g : (bold ? NAVY_BLUE.g : SLATE_500.g), isTotal ? BRAND_BLUE.b : (bold ? NAVY_BLUE.b : SLATE_500.b));
        doc.text(label, totalsX, finalY);
        doc.text(`₹${val}`, pageWidth - margin, finalY, { align: 'right' });
        finalY += isTotal ? 8 : 5.5;
    };

    addRow('Subtotal Amount', fmt(subtotal));
    if (totalGst > 0) {
        addRow('SGST (9%)', fmt(totalGst / 2));
        addRow('CGST (9%)', fmt(totalGst / 2));
    }
    doc.line(totalsX, finalY - 2, pageWidth - margin, finalY - 2);
    finalY += 4;
    addRow('NET PAYABLE AMOUNT', fmt(grandTotal), true, true);

    finalY += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('TOTAL AMOUNT IN WORDS', margin, finalY);
    doc.setTextColor(NAVY_BLUE.r, NAVY_BLUE.g, NAVY_BLUE.b);
    doc.setFontSize(8.5);
    doc.text(numberToWords(Math.round(grandTotal)), margin, finalY + 4.5);

    const pageCount2 = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount2; i++) {
        doc.setPage(i);
        doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
        doc.rect(0, 287, pageWidth, 10, 'F');
        doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
        doc.setFontSize(7);
        doc.text(`Page ${i} of ${pageCount2} | System Generated Invoice | Powered by InTrust India`, pageWidth / 2, 293.5, { align: 'center' });
    }

    doc.save(`${invoiceNumber}.pdf`);
};
