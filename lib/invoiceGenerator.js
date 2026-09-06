import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

// ─── Number to Words ─────────────────────────────────────────────
const numberToWords = (num) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
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

const isUnregistered = (val) =>
    !val || ['unregistered', 'n/a', 'not provided', '-', 'null', 'undefined']
        .includes(val.toString().toLowerCase().trim());

const fmt = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Color Palette ────────────────────────────────────────────────
const NAVY   = { r: 10,  g: 20,  b: 50  };
const BLUE   = { r: 25,  g: 80,  b: 200 };
const DARK_B = { r: 15,  g: 40,  b: 120 };
const LIGHT_B= { r: 235, g: 243, b: 255 };
const SLATE  = { r: 90,  g: 105, b: 125 };
const BORDER = { r: 210, g: 220, b: 235 };
const WHITE  = { r: 255, g: 255, b: 255 };

// ─── Generate QR Code DataURL ─────────────────────────────────────
const generateQR = async (text) => {
    try {
        return await QRCode.toDataURL(text, {
            width: 120, margin: 1,
            color: { dark: '#0A1432', light: '#FFFFFF' }
        });
    } catch { return null; }
};

// ─── Generate Barcode DataURL ─────────────────────────────────────
const generateBarcode = (text) => {
    try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, text, {
            format: 'CODE128', width: 2, height: 50,
            displayValue: true, fontSize: 10,
            background: '#FFFFFF', lineColor: '#0A1432',
            margin: 4, fontOptions: 'bold'
        });
        return canvas.toDataURL('image/png');
    } catch { return null; }
};

// ─── Fetch logo as base64 ─────────────────────────────────────────
const getLogoBase64 = async () => {
    try {
        const res = await fetch('/logo.png');
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
};

// ─── Draw Premium Header ──────────────────────────────────────────
const drawHeader = async (doc, pageWidth, invoiceTitle, invoiceNumber, invoiceDate, paymentUrl = null, grandTotal = null, status = 'ISSUED', amountDue = null, dueDate = null) => {
    const H = 54; // Header height
    const QR_SIZE = 36;
    const QR_MARGIN = 4;

    // Dark navy-to-blue gradient header
    const steps = 80;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const r = Math.round(10 + (25 - 10) * t);
        const g = Math.round(20 + (80 - 20) * t);
        const bv = Math.round(50 + (200 - 50) * t);
        doc.setFillColor(r, g, bv);
        doc.rect(0, (H / steps) * i, pageWidth, H / steps + 0.2, 'F');
    }

    // ── Far right status or QR block ──
    const qrX = pageWidth - QR_SIZE - QR_MARGIN;
    const qrY = (H - QR_SIZE) / 2;

    if (status === 'PAID') {
        // Green PAID Stamp / Card
        doc.setFillColor(236, 253, 245);
        doc.roundedRect(qrX - 2, qrY - 2, QR_SIZE + 4, QR_SIZE + 4, 3, 3, 'F');
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1);
        doc.roundedRect(qrX - 2, qrY - 2, QR_SIZE + 4, QR_SIZE + 4, 3, 3, 'D');

        doc.setTextColor(5, 150, 105);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('STATUS', qrX + (QR_SIZE / 2), qrY + 8, { align: 'center' });
        doc.setFontSize(13);
        doc.text('PAID', qrX + (QR_SIZE / 2), qrY + 17, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text('IN FULL', qrX + (QR_SIZE / 2), qrY + 23, { align: 'center' });
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ Verified', qrX + (QR_SIZE / 2), qrY + 30, { align: 'center' });
    } else if (status === 'CANCELLED' || status === 'VOID') {
        // Red CANCELLED Stamp / Card
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(qrX - 2, qrY - 2, QR_SIZE + 4, QR_SIZE + 4, 3, 3, 'F');
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(1);
        doc.roundedRect(qrX - 2, qrY - 2, QR_SIZE + 4, QR_SIZE + 4, 3, 3, 'D');

        doc.setTextColor(220, 38, 38);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('STATUS', qrX + (QR_SIZE / 2), qrY + 10, { align: 'center' });
        doc.setFontSize(10.5);
        doc.text(status, qrX + (QR_SIZE / 2), qrY + 20, { align: 'center' });
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('Inactive', qrX + (QR_SIZE / 2), qrY + 27, { align: 'center' });
    } else {
        // Pending / Active Payment: Render SCAN TO PAY QR Code
        const qrText = paymentUrl || 'https://www.intrustindia.com';
        const qr = await generateQR(qrText);
        if (qr) {
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(qrX - 1, qrY - 1, QR_SIZE + 2, QR_SIZE + 2, 2, 2, 'F');
            doc.addImage(qr, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);

            if (paymentUrl) {
                const payableDisplay = amountDue !== null ? amountDue : grandTotal;
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.text('SCAN TO PAY', qrX + (QR_SIZE / 2), qrY - 2.5, { align: 'center' });
                
                if (payableDisplay !== null) {
                    doc.text(`Rs. ${payableDisplay}`, qrX + (QR_SIZE / 2), qrY + QR_SIZE + 3.5, { align: 'center' });
                }
                
                doc.setFontSize(5);
                doc.setFont('helvetica', 'normal');
                doc.text('Secure via SabPaisa', qrX + (QR_SIZE / 2), qrY + QR_SIZE + 7.5, { align: 'center' });
            }
        }
    }

    // ── Invoice Title block: right of center, left of QR ──
    const titleBlockRight = qrX - 8;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceTitle, titleBlockRight, 17, { align: 'right' });

    // Thin white divider under title
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.setGState(doc.GState({ opacity: 0.4 }));
    doc.line(titleBlockRight - 60, 20, titleBlockRight, 20);
    doc.setGState(doc.GState({ opacity: 1 }));

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 225, 255);
    doc.text(`No: ${invoiceNumber}`, titleBlockRight, 26, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, titleBlockRight, 31, { align: 'right' });
    if (dueDate) {
        doc.text(`Due: ${dueDate}`, titleBlockRight, 36, { align: 'right' });
    }

    // ── Logo + Brand block: left ──
    const logo = await getLogoBase64();
    let brandX = 12;
    if (logo) {
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 23, 16, 'F');
        doc.addImage(logo, 'PNG', 10, 8, 30, 30);
        brandX = 44;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST INDIA', brandX, 20);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 225, 255);
    doc.text('Powered by Intrust Financial Services Pvt. Ltd.', brandX, 27);
    doc.setFontSize(6.5);
    doc.text(`GSTIN: ${PLATFORM_CONFIG.business.gstin}`, brandX, 33);
    doc.text(`${PLATFORM_CONFIG.business.website}  |  ${PLATFORM_CONFIG.business.phone}`, brandX, 39);

    // ── Bottom accent line ──
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(1);
    doc.line(0, H, pageWidth, H);

    return H + 4;
};

// ─── Draw Barcode Footer ──────────────────────────────────────────
const drawBarcodeFooter = (doc, pageWidth, invoiceNumber) => {
    const barcodeData = generateBarcode(invoiceNumber);
    const footerY = 270;

    doc.setFillColor(LIGHT_B.r, LIGHT_B.g, LIGHT_B.b);
    doc.rect(0, footerY, pageWidth, 27, 'F');
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(0, footerY, pageWidth, footerY);

    if (barcodeData) {
        // Center barcode
        const bw = 70, bh = 16;
        const bx = (pageWidth - bw) / 2;
        doc.addImage(barcodeData, 'PNG', bx, footerY + 2, bw, bh);
    } else {
        // Text fallback
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
        doc.text(invoiceNumber, pageWidth / 2, footerY + 12, { align: 'center' });
    }

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('System Generated Invoice | Powered by InTrust India | intrustindia.com', pageWidth / 2, footerY + 24, { align: 'center' });
};

// ─── Section Header helper ────────────────────────────────────────
const sectionHeader = (doc, text, y, margin, contentWidth) => {
    doc.setFillColor(LIGHT_B.r, LIGHT_B.g, LIGHT_B.b);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
    doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    doc.rect(margin, y, 2.5, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_B.r, DARK_B.g, DARK_B.b);
    doc.text(text, margin + 6, y + 4.8);
    return y + 10;
};

// ─── Address Block helper ─────────────────────────────────────────
const drawAddressBlock = (doc, title, name, lines, x, y, colWidth) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text(title, x, y);
    doc.setFontSize(9);
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(name, x, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    lines.forEach((line, i) => doc.text(line, x, y + 10 + i * 4));
};

// ─── Totals block helper ──────────────────────────────────────────
const drawTotals = (doc, subtotal, sgst, cgst, grandTotal, margin, pageWidth, discount = 0, amountPaid = 0, amountDue = null) => {
    let y = doc.lastAutoTable.finalY + 6;
    if (y + 70 > 268) { doc.addPage(); y = 18; }

    const tx = pageWidth - margin - 72;

    const row = (label, val, bold = false, big = false, color = null) => {
        doc.setFontSize(big ? 10 : 8.5);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        if (color) doc.setTextColor(color.r, color.g, color.b);
        else if (big) doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
        else if (bold) doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
        else doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
        doc.text(label, tx, y);
        doc.text(`Rs. ${val}`, pageWidth - margin, y, { align: 'right' });
        y += big ? 7 : 5.5;
    };

    row('Items Subtotal', fmt(subtotal));
    if (discount > 0) {
        row('Discount', `-${fmt(discount)}`, false, false, { r: 5, g: 150, b: 105 });
    }
    if (sgst > 0) { row('SGST', fmt(sgst)); row('CGST', fmt(cgst)); }

    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.4);
    doc.line(tx, y - 1, pageWidth - margin, y - 1);
    y += 3;
    row('GRAND TOTAL', fmt(grandTotal), true, true);

    if (amountPaid > 0) {
        row('Amount Paid', `-${fmt(amountPaid)}`, true, false, { r: 5, g: 150, b: 105 });
    }
    if (amountDue !== null && amountDue >= 0) {
        doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
        doc.setLineWidth(0.4);
        doc.line(tx, y - 1, pageWidth - margin, y - 1);
        y += 3;
        row('BALANCE DUE', fmt(amountDue), true, true, { r: 25, g: 80, b: 200 });
    }

    return y;
};

// ─── generateManualInvoice ────────────────────────────────────────
export const generateManualInvoice = async (data) => {
    const { seller, customer, items, totals, meta } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    const invoiceNumber = meta.invoice_number || 'N/A';
    const dateStr = meta.invoice_date
        ? new Date(meta.invoice_date + (meta.invoice_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueDateStr = meta.due_date
        ? new Date(meta.due_date + (meta.due_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;

    let y = await drawHeader(
        doc,
        pageWidth,
        'TAX INVOICE',
        invoiceNumber,
        dateStr,
        meta.paymentUrl,
        fmt(totals.grandTotal),
        meta.status || 'ISSUED',
        totals.amountDue !== undefined && totals.amountDue !== null ? fmt(totals.amountDue) : null,
        dueDateStr
    );

    // ── Party Details ──
    y = sectionHeader(doc, 'PARTY DETAILS', y, margin, contentWidth);

    const colWidth = contentWidth / 2 - 4;
    const sellerGst = seller?.gst_number || seller?.gstin;
    const gstVal = isUnregistered(sellerGst) ? PLATFORM_CONFIG.business.gstin : sellerGst;
    const gstLabel = isUnregistered(sellerGst) ? 'InTrust GST' : 'GSTIN';

    drawAddressBlock(doc, 'SOLD BY', seller?.company_name || 'InTrust India',
        [
            ...(doc.splitTextToSize(seller?.company_address || PLATFORM_CONFIG.business.address, colWidth - 4)),
            gstVal ? `${gstLabel}: ${gstVal}` : ''
        ], margin, y, colWidth);

    drawAddressBlock(doc, 'BILLED TO', customer?.name || 'Valued Customer',
        [
            ...(customer?.address ? doc.splitTextToSize(customer.address, colWidth - 4) : []),
            customer?.phone ? `Mobile: +91 ${customer.phone}` : '',
            customer?.email ? `Email: ${customer.email}` : ''
        ], margin + colWidth + 8, y, colWidth);

    y += 30;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // ── Items Table ──
    const tableBody = items.map((item, idx) => {
        const gst = item.gst_percent || 0;
        const taxPerSide = (gst / 2).toFixed(1) + '%';
        const taxAmtSide = fmt((item.gst || 0) / 2);
        return [(idx + 1).toString(), item.name || 'Service Item', item.hsn_sac || '-',
            item.quantity.toString(), fmt(item.unit_price),
            taxPerSide, taxAmtSide, taxPerSide, taxAmtSide, fmt(item.total)];
    });

    autoTable(doc, {
        startY: y,
        head: [['#', 'ITEM DESCRIPTION', 'HSN', 'QTY', 'UNIT PRICE', 'SGST%', 'SGST', 'CGST%', 'CGST', 'AMOUNT']],
        body: tableBody,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.2, textColor: NAVY, lineColor: BORDER },
        headStyles: { fillColor: [DARK_B.r, DARK_B.g, DARK_B.b], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0 },
        alternateRowStyles: { fillColor: [LIGHT_B.r, LIGHT_B.g, LIGHT_B.b] },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 11, halign: 'center' },
            6: { cellWidth: 14, halign: 'right' }, 7: { cellWidth: 11, halign: 'center' },
            8: { cellWidth: 14, halign: 'right' },
            9: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [BLUE.r, BLUE.g, BLUE.b] },
        },
        margin: { left: margin, right: margin },
    });

    const sgst = Math.floor((totals.totalGst || 0) / 2);
    const cgst = (totals.totalGst || 0) - sgst;
    const finalY = drawTotals(
        doc,
        totals.subtotal,
        sgst,
        cgst,
        totals.grandTotal,
        margin,
        pageWidth,
        totals.discount || 0,
        totals.amountPaid || 0,
        totals.amountDue !== undefined && totals.amountDue !== null ? totals.amountDue : null
    );

    // Amount in words
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('AMOUNT IN WORDS', margin, finalY + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(numberToWords(Math.round(totals.grandTotal)), margin, finalY + 9);

    // Terms & Conditions
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text('TERMS & CONDITIONS', margin, finalY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    const disc = meta.disclaimer || '1. Goods/Services once sold are non-refundable. 2. This is a system-generated tax invoice and does not require a physical signature.';
    doc.text(doc.splitTextToSize(disc, contentWidth), margin, finalY + 23);

    // Barcode footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawBarcodeFooter(doc, pageWidth, invoiceNumber);
    }

    doc.save(`${invoiceNumber}.pdf`);
};

// ─── generateInvoicePDF (Adapter for Database Invoice Record) ─────
export const generateInvoicePDF = async (invoiceRecord) => {
    if (!invoiceRecord) return;

    const grandTotal = (invoiceRecord.grand_total_paise || 0) / 100;
    const subtotal = (invoiceRecord.subtotal_paise || 0) / 100;
    const tax = (invoiceRecord.tax_paise || 0) / 100;
    const discount = (invoiceRecord.discount_paise || 0) / 100;
    const amountPaid = (invoiceRecord.amount_paid_paise || 0) / 100;
    const amountDue = Math.max(0, grandTotal - amountPaid);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://www.intrustindia.com');
    const paymentUrl = invoiceRecord.public_payment_token ? `${baseUrl}/pay/invoice/${invoiceRecord.public_payment_token}` : null;

    const seller = invoiceRecord.seller_snapshot || {
        company_name: PLATFORM_CONFIG.business.name,
        company_address: PLATFORM_CONFIG.business.address,
        company_phone: PLATFORM_CONFIG.business.phone,
        company_email: PLATFORM_CONFIG.business.email,
        gst_number: PLATFORM_CONFIG.business.gstin
    };

    const customer = invoiceRecord.customer_snapshot || {
        name: 'Valued Customer'
    };

    const rawItems = Array.isArray(invoiceRecord.items_snapshot) ? invoiceRecord.items_snapshot : [];
    const items = rawItems.map(itm => {
        const qty = Number(itm.quantity || itm.qty || 1);
        const rate = Number(itm.unit_price || itm.rate || itm.price || 0);
        const gstPercent = Number(itm.gst_percent || itm.gst_percentage || 0);
        const total = Number(itm.total || (qty * rate * (1 + gstPercent / 100))) || (qty * rate);
        return {
            name: itm.name || itm.description || 'Service Item',
            hsn_sac: itm.hsn_sac || itm.hsn || '-',
            quantity: qty,
            unit_price: rate,
            gst_percent: gstPercent,
            gst: total - (qty * rate),
            total: total
        };
    });

    const totals = {
        subtotal,
        discount,
        totalGst: tax,
        grandTotal,
        amountPaid,
        amountDue
    };

    const meta = {
        invoice_number: invoiceRecord.invoice_number,
        invoice_date: invoiceRecord.invoice_date,
        due_date: invoiceRecord.due_date,
        paymentUrl,
        status: invoiceRecord.status || 'ISSUED',
        paid_at: invoiceRecord.paid_at
    };

    await generateManualInvoice({ seller, customer, items, totals, meta });
};

// ─── generateOrderInvoice ─────────────────────────────────────────
export const generateOrderInvoice = async (params) => {
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
    const custGstin = customerOverride?.gstin || null;

    let y = await drawHeader(doc, pageWidth, 'TAX INVOICE', invoiceNumber, invoiceDate);

    // ── Party Details ──
    y = sectionHeader(doc, 'PARTY DETAILS', y, margin, contentWidth);

    const colWidth = contentWidth / 2 - 4;
    const sellerGst = seller?.gstin || seller?.gst_number;
    const gstVal = isUnregistered(sellerGst) ? PLATFORM_CONFIG.business.gstin : sellerGst;
    const gstLabel = isUnregistered(sellerGst) ? 'InTrust GST' : 'GSTIN';

    drawAddressBlock(doc, 'SOLD BY', seller?.name || 'InTrust India',
        [
            ...(seller?.address ? doc.splitTextToSize(seller.address, colWidth - 4) : [PLATFORM_CONFIG.business.address]),
            gstVal ? `${gstLabel}: ${gstVal}` : ''
        ], margin, y, colWidth);

    drawAddressBlock(doc, 'BILLED TO', custName,
        [
            ...(custAddress ? doc.splitTextToSize(custAddress, colWidth - 4) : []),
            custPhone ? `Mobile: +91 ${custPhone}` : '',
            custGstin ? `GSTIN: ${custGstin}` : ''
        ], margin + colWidth + 8, y, colWidth);

    y += 30;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // ── Items Processing ──
    let processedItems = [];
    let subtotal = 0, totalGst = 0, grandTotal = 0;

    if (type === 'giftcard') {
        const paidAmount = order.paidAmount || (order.amount || 0) / 100;
        processedItems = [['1', order.brand || 'Gift Card Subscription', '9971', '1',
            fmt(paidAmount), '0%', '0.00', '0%', '0.00', fmt(paidAmount)]];
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
            let itemTitle = item.shopping_products?.title || item.product_title || 'Product Item';
            if (item.variant_snapshot) {
                const parts = [item.variant_snapshot.color, item.variant_snapshot.size ? `Size: ${item.variant_snapshot.size}` : null].filter(Boolean);
                if (parts.length > 0) itemTitle += ` (${parts.join(', ')})`;
            }

            processedItems.push([
                (idx + 1).toString(),
                itemTitle,
                item.shopping_products?.hsn_code || item.hsn_code || '-',
                qty.toString(), fmt(totalPaise / qty / 100),
                `${gstRate / 2}%`, fmt(gstAmt / 2 / 100),
                `${gstRate / 2}%`, fmt(gstAmt / 2 / 100),
                fmt(itemTotal)
            ]);
        });
        const deliveryFee = (order.delivery_fee_paise || 0) / 100;
        if (deliveryFee > 0) {
            processedItems.push([(processedItems.length + 1).toString(), 'Shipping Charges', '9965', '1',
                fmt(deliveryFee), '0%', '0.00', '0%', '0.00', fmt(deliveryFee)]);
            grandTotal += deliveryFee;
        }
    }

    autoTable(doc, {
        startY: y,
        head: [['#', 'ITEM DESCRIPTION', 'HSN', 'QTY', 'UNIT PRICE', 'SGST%', 'SGST', 'CGST%', 'CGST', 'AMOUNT']],
        body: processedItems,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.2, textColor: NAVY, lineColor: BORDER },
        headStyles: { fillColor: [DARK_B.r, DARK_B.g, DARK_B.b], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0 },
        alternateRowStyles: { fillColor: [LIGHT_B.r, LIGHT_B.g, LIGHT_B.b] },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 'auto' },
            2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 10, halign: 'center' },
            4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 11, halign: 'center' },
            6: { cellWidth: 14, halign: 'right' }, 7: { cellWidth: 11, halign: 'center' },
            8: { cellWidth: 14, halign: 'right' },
            9: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [BLUE.r, BLUE.g, BLUE.b] },
        },
        margin: { left: margin, right: margin },
    });

    const sgst = Math.floor(totalGst / 2);
    const cgst = totalGst - sgst;
    const finalY = drawTotals(doc, subtotal, sgst, cgst, grandTotal, margin, pageWidth);

    // Amount in words
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('AMOUNT IN WORDS', margin, finalY + 4);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(numberToWords(Math.round(grandTotal)), margin, finalY + 9);

    // Terms & Conditions
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text('TERMS & CONDITIONS', margin, finalY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    const terms = '1. Goods/Services once sold are non-refundable. 2. This is a system-generated tax invoice and does not require a physical signature.';
    doc.text(doc.splitTextToSize(terms, contentWidth), margin, finalY + 23);

    // Barcode footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawBarcodeFooter(doc, pageWidth, invoiceNumber);
    }

    doc.save(`${invoiceNumber}.pdf`);
};

// ─── generateProcurementInvoice ───────────────────────────────────
export const generateProcurementInvoice = async (params) => {
    const { procurementOrder, items = [], merchant } = params;

    // seller -> merchant
    const seller = {
        company_name: merchant.business_name || 'Merchant',
        company_address: merchant.business_address || '',
        gst_number: merchant.gst_number || '',
    };

    // customer (buyer) -> InTrust
    const customer = {
        name: PLATFORM_CONFIG.business.name,
        address: PLATFORM_CONFIG.business.address,
        gstin: PLATFORM_CONFIG.business.gstin,
    };

    const invoiceItems = items.map((item) => {
        const p = item.shopping_products || item;
        return {
            name: p.title || 'Procured Item',
            hsn_sac: p.hsn_code || '-',
            quantity: item.quantity,
            unit_price: (item.unit_wholesale_paise || 0) / 100,
            gst_percent: p.gst_percentage || 0,
            gst: (item.gst_amount_paise || 0) / 100,
            total: (item.line_total_paise || 0) / 100,
        };
    });

    const totals = {
        subtotal: (procurementOrder.total_cost_paise || 0) / 100,
        totalGst: (procurementOrder.total_gst_paise || 0) / 100,
        grandTotal: (procurementOrder.total_amount_paise || 0) / 100,
    };

    const meta = {
        invoice_number: procurementOrder.invoice_number || 'N/A',
        invoice_date: procurementOrder.created_at,
        disclaimer: '1. This is a system-generated invoice for platform procurement. 2. Does not require a physical signature.',
    };

    await generateManualInvoice({ seller, customer, items: invoiceItems, totals, meta });
};
