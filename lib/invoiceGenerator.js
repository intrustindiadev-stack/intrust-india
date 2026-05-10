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

// ─── Color Palette (Compact & Brand Focused) ───────────────────
const DARK_BLUE = { r: 0, g: 31, b: 63 };     // Brand Deep Blue
const BLUE = { r: 0, g: 123, b: 255 };        // Original Vibrant Blue
const LIGHT_BLUE = { r: 235, g: 245, b: 255 }; // Original Light Blue
const SLATE_900 = { r: 15, g: 23, b: 42 };
const SLATE_500 = { r: 100, g: 116, b: 139 };
const BORDER = { r: 220, g: 227, b: 235 };

/**
 * Generates a professional invoice PDF from manually entered data.
 * Compact & Brand focused.
 */
export const generateManualInvoice = (data) => {
    const { seller, customer, items, totals, meta } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15; // Compact margins
    const contentWidth = pageWidth - margin * 2;

    // ─── BRAND HEADER ──────────────────────────────────────────
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.rect(0, 0, pageWidth, 12, 'F'); // Thin Brand Top Bar

    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', margin, 22);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('Financial Services (India) Pvt. Ltd.', margin, 26);

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 22, { align: 'right' });

    // ─── META INFO (COMPACT) ──────────────────────────────────
    let currentY = 35;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    currentY += 6;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.text(`Invoice: ${meta.invoice_number || 'N/A'}`, margin, currentY);

    const dateStr = meta.invoice_date
        ? new Date(meta.invoice_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    doc.text(`Date: ${dateStr}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 4;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // ─── ADDRESSES (SIDE-BY-SIDE COMPACT) ─────────────────────
    currentY += 10;
    const colWidth = contentWidth / 2 - 5;

    // Seller Info
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text('ISSUED BY', margin, currentY);
    
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.text(seller.company_name || 'InTrust', margin, currentY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    const sellerAddr = doc.splitTextToSize(seller.company_address || '', colWidth);
    doc.text(sellerAddr, margin, currentY + 9);
    
    let addrEndY = currentY + 9 + (sellerAddr.length * 3.5);
    const gstin = seller.gst_number || PLATFORM_CONFIG.business.gstin;
    if (gstin) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
        doc.text(`GSTIN: ${gstin}`, margin, addrEndY + 1);
    }

    // Customer Info
    const custX = margin + colWidth + 10;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text('BILL TO', custX, currentY);
    
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.text(customer.name || 'Customer', custX, currentY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    if (customer.address) {
        const custAddr = doc.splitTextToSize(customer.address, colWidth);
        doc.text(custAddr, custX, currentY + 9);
    }
    if (customer.phone) {
        doc.text(`Ph: ${customer.phone}`, custX, currentY + 18);
    }

    // ─── TABLE (DENSE) ────────────────────────────────────────
    const tableBody = items.map((item, idx) => {
        const sgstPct = (item.gst_percent || 0) / 2;
        const cgstPct = (item.gst_percent || 0) / 2;
        const sgstAmt = (item.gst || 0) / 2;
        const cgstAmt = (item.gst || 0) / 2;

        return [
            (idx + 1).toString(),
            item.name || 'Service',
            item.hsn_sac || '-',
            item.quantity.toString(),
            fmt(item.unit_price),
            `${sgstPct}%`,
            fmt(sgstAmt),
            `${cgstPct}%`,
            fmt(cgstAmt),
            fmt(item.total),
        ];
    });

    autoTable(doc, {
        startY: currentY + 28,
        head: [['#', 'DESCRIPTION', 'HSN', 'QTY', 'PRICE', 'SGST %', 'SGST', 'CGST %', 'CGST', 'TOTAL']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, textColor: SLATE_900, lineColor: BORDER },
        headStyles: { fillColor: LIGHT_BLUE, textColor: DARK_BLUE, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 10, halign: 'center' },
            6: { cellWidth: 15, halign: 'right' },
            7: { cellWidth: 10, halign: 'center' },
            8: { cellWidth: 15, halign: 'right' },
            9: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
    });

    // ─── TOTALS & SUMMARY (COMPACT) ───────────────────────────
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY + 60 > 280) { doc.addPage(); finalY = 20; }

    const totalsX = pageWidth - margin - 65;
    const addRow = (label, val, bold = false, accent = false) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(accent ? BLUE.r : (bold ? DARK_BLUE.r : SLATE_500.r), accent ? BLUE.g : (bold ? DARK_BLUE.g : SLATE_500.g), accent ? BLUE.b : (bold ? DARK_BLUE.b : SLATE_500.b));
        doc.text(label, totalsX, finalY);
        doc.text(`Rs. ${val}`, pageWidth - margin, finalY, { align: 'right' });
        finalY += 5;
    };

    addRow('Subtotal', fmt(totals.subtotal));
    addRow('SGST', fmt(totals.totalGst / 2));
    addRow('CGST', fmt(totals.totalGst / 2));
    doc.line(totalsX, finalY - 2, pageWidth - margin, finalY - 2);
    finalY += 3;
    addRow('GRAND TOTAL', fmt(totals.grandTotal), true, true);

    // Summary Info
    finalY += 5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('AMOUNT IN WORDS', margin, finalY);
    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(7.5);
    doc.text(numberToWords(Math.round(totals.grandTotal)), margin, finalY + 4);

    finalY += 15;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.text('TERMS & CONDITIONS', margin, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    const disclaimer = meta.disclaimer || '1. Goods once sold will not be taken back. 2. This is a computer generated invoice.';
    doc.text(doc.splitTextToSize(disclaimer, contentWidth), margin, finalY + 4);

    // ─── FOOTER ──────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
        doc.rect(0, 285, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        doc.text('System Generated Invoice - Powered by Intrust Finance India Pvt. Ltd.', pageWidth / 2, 292, { align: 'center' });
    }

    doc.save(`${meta.invoice_number || 'Invoice'}.pdf`);
};

/**
 * Generates an invoice PDF from order data (e-commerce or gift card orders).
 * Compact & Brand focused.
 */
export const generateOrderInvoice = (params) => {
    const { order, items = [], seller, customer: customerOverride, type = 'shopping' } = params;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const invoiceNumber = `INV-${new Date(order.created_at).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const custName = customerOverride?.name || order.customer_name || 'Customer';
    const custAddress = customerOverride?.address || order.delivery_address || '';
    const custPhone = customerOverride?.phone || order.customer_phone || '';

    // ─── BRAND HEADER ──────────────────────────────────────────
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.rect(0, 0, pageWidth, 12, 'F');

    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', margin, 22);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('Financial Services (India) Pvt. Ltd.', margin, 26);

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 22, { align: 'right' });

    // ─── META INFO (COMPACT) ──────────────────────────────────
    let currentY = 35;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    currentY += 6;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.text(`Invoice: ${invoiceNumber}`, margin, currentY);
    doc.text(`Date: ${invoiceDate}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 4;
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // ─── ADDRESSES (SIDE-BY-SIDE COMPACT) ─────────────────────
    currentY += 10;
    const colWidth = contentWidth / 2 - 5;

    // Seller Info
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text('ISSUED BY', margin, currentY);
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.text(seller?.name || 'InTrust', margin, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    if (seller?.address) {
        const addr = doc.splitTextToSize(seller.address, colWidth);
        doc.text(addr, margin, currentY + 9);
    }
    const gstin = seller?.gstin || PLATFORM_CONFIG.business.gstin;
    if (gstin) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
        doc.text(`GSTIN: ${gstin}`, margin, currentY + 18);
    }

    // Customer Info
    const custX = margin + colWidth + 10;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text('BILL TO', custX, currentY);
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.text(custName, custX, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    if (custAddress) {
        const addr = doc.splitTextToSize(custAddress, colWidth);
        doc.text(addr, custX, currentY + 9);
    }
    if (custPhone) {
        doc.text(`Ph: ${custPhone}`, custX, currentY + 18);
    }

    // ─── ITEMS PROCESSING ─────────────────────────────────────
    let processedItems = [];
    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;

    if (type === 'giftcard') {
        const paidAmount = order.paidAmount || (order.amount || 0) / 100;
        processedItems = [['1', order.brand || 'Gift Card', '9971', '1', fmt(paidAmount), '0%', '0.00', '0%', '0.00', fmt(paidAmount)]];
        subtotal = paidAmount; grandTotal = paidAmount;
    } else if (type === 'nfc') {
        const salePrice = (order.sale_price_paise || 0) / 100;
        const DELIVERY_FEE = 50; 
        const cardTotal = salePrice - DELIVERY_FEE;
        const gstAmt = Math.round(cardTotal * 0.18 * 100) / 100;
        processedItems.push(['1', 'InTrust Premium NFC Card', '9971', '1', fmt(cardTotal), '9%', fmt(gstAmt/2), '9%', fmt(gstAmt/2), fmt(cardTotal + gstAmt)]);
        processedItems.push(['2', 'Delivery & Handling', '9971', '1', fmt(DELIVERY_FEE), '0%', '0.00', '0%', '0.00', fmt(DELIVERY_FEE)]);
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
                item.shopping_products?.title || item.product_title || 'Product',
                item.shopping_products?.hsn_code || item.hsn_code || '-',
                qty.toString(), fmt(totalPaise / qty / 100),
                `${gstRate / 2}%`, fmt(gstAmt / 2 / 100),
                `${gstRate / 2}%`, fmt(gstAmt / 2 / 100),
                fmt(itemTotal)
            ]);
        });
        const deliveryFee = (order.delivery_fee_paise || 0) / 100;
        if (deliveryFee > 0) {
            processedItems.push([(processedItems.length + 1).toString(), 'Delivery Charges', '9971', '1', fmt(deliveryFee), '0%', '0.00', '0%', '0.00', fmt(deliveryFee)]);
            grandTotal += deliveryFee;
        }
    }

    // ─── TABLE ────────────────────────────────────────────────
    autoTable(doc, {
        startY: currentY + 28,
        head: [['#', 'DESCRIPTION', 'HSN', 'QTY', 'PRICE', 'SGST %', 'SGST', 'CGST %', 'CGST', 'TOTAL']],
        body: processedItems,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, textColor: SLATE_900, lineColor: BORDER },
        headStyles: { fillColor: LIGHT_BLUE, textColor: DARK_BLUE, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 10, halign: 'center' },
            6: { cellWidth: 15, halign: 'right' },
            7: { cellWidth: 10, halign: 'center' },
            8: { cellWidth: 15, halign: 'right' },
            9: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        }
    });

    // ─── TOTALS & FOOTER ──────────────────────────────────────
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY + 60 > 280) { doc.addPage(); finalY = 20; }
    const totalsX = pageWidth - margin - 65;
    const addRow = (label, val, bold = false, accent = false) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(accent ? BLUE.r : (bold ? DARK_BLUE.r : SLATE_500.r), accent ? BLUE.g : (bold ? DARK_BLUE.g : SLATE_500.g), accent ? BLUE.b : (bold ? DARK_BLUE.b : SLATE_500.b));
        doc.text(label, totalsX, finalY);
        doc.text(`Rs. ${val}`, pageWidth - margin, finalY, { align: 'right' });
        finalY += 5;
    };

    addRow('Subtotal', fmt(subtotal));
    if (totalGst > 0) { addRow('SGST', fmt(totalGst / 2)); addRow('CGST', fmt(totalGst / 2)); }
    doc.line(totalsX, finalY - 2, pageWidth - margin, finalY - 2);
    finalY += 3;
    addRow('GRAND TOTAL', fmt(grandTotal), true, true);

    finalY += 5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('AMOUNT IN WORDS', margin, finalY);
    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(7.5);
    doc.text(numberToWords(Math.round(grandTotal)), margin, finalY + 4);

    const pageCount2 = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount2; i++) {
        doc.setPage(i);
        doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
        doc.rect(0, 285, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        doc.text('System Generated Invoice - Powered by Intrust Finance India Pvt. Ltd.', pageWidth / 2, 292, { align: 'center' });
    }

    doc.save(`${invoiceNumber}.pdf`);
};
