import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 * Helper: Format Currency (Indian locale, no symbol — we use Rs. separately)
 */
const fmt = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Color Palette (Blue & White theme) ─────────────────────────
const BLUE = { r: 37, g: 99, b: 235 };       // Primary blue
const DARK_BLUE = { r: 30, g: 58, b: 138 };  // Dark blue for headers
const LIGHT_BLUE = { r: 239, g: 246, b: 255 }; // Very light blue bg
const WHITE = { r: 255, g: 255, b: 255 };
const SLATE_700 = { r: 51, g: 65, b: 85 };
const SLATE_500 = { r: 100, g: 116, b: 139 };
const SLATE_400 = { r: 148, g: 163, b: 184 };
const SLATE_900 = { r: 15, g: 23, b: 42 };

/**
 * Generates a professional invoice PDF from manually entered data.
 * Blue & white clean design with proper Rs. formatting.
 *
 * @param {Object} data
 * @param {Object} data.seller - { company_name, company_address, company_phone, company_email, gst_number }
 * @param {Object} data.customer - { name, address, phone, email }
 * @param {Array} data.items - [{ name, hsn_sac, quantity, unit_price, gst_percent, base, gst, total }]
 * @param {Object} data.totals - { subtotal, totalGst, grandTotal }
 * @param {Object} data.meta - { invoice_number, invoice_date, disclaimer }
 */
export const generateManualInvoice = (data) => {
    const { seller, customer, items, totals, meta } = data;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    // ═══════════════════════════════════════════════════════════
    // HEADER BAR — Full width blue band
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Brand Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', margin, 22);

    // Sub-brand
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 200, 255);
    doc.text('Financial Services (India) Pvt. Ltd.', margin, 30);

    // TAX INVOICE label (right side)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 22, { align: 'right' });

    // ═══════════════════════════════════════════════════════════
    // INVOICE META STRIP — Light blue bar
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.rect(0, 42, pageWidth, 18, 'F');

    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${meta.invoice_number}`, margin, 53);

    const dateStr = meta.invoice_date
        ? new Date(meta.invoice_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Date: ${dateStr}`, pageWidth - margin, 53, { align: 'right' });

    // ═══════════════════════════════════════════════════════════
    // FROM / BILL TO — Two-column layout
    // ═══════════════════════════════════════════════════════════
    const infoStartY = 70;
    const colWidth = contentWidth / 2 - 5;

    // FROM section
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(margin, infoStartY, colWidth, 44, 3, 3, 'F');

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', margin + 6, infoStartY + 8);

    // Blue underline
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.5);
    doc.line(margin + 6, infoStartY + 10, margin + 25, infoStartY + 10);

    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(seller.company_name || '', margin + 6, infoStartY + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_700.r, SLATE_700.g, SLATE_700.b);
    const sellerAddr = doc.splitTextToSize(seller.company_address || '', colWidth - 12);
    doc.text(sellerAddr, margin + 6, infoStartY + 23);
    const addrEndY = infoStartY + 23 + (sellerAddr.length * 3.5);
    if (seller.gst_number) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${seller.gst_number}`, margin + 6, addrEndY + 2);
    }
    if (seller.company_phone) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Ph: ${seller.company_phone}`, margin + 6, addrEndY + 6);
    }

    // BILL TO section
    const billToX = margin + colWidth + 10;
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(billToX, infoStartY, colWidth, 44, 3, 3, 'F');

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', billToX + 6, infoStartY + 8);

    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.line(billToX + 6, infoStartY + 10, billToX + 28, infoStartY + 10);

    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name || 'Customer', billToX + 6, infoStartY + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_700.r, SLATE_700.g, SLATE_700.b);
    if (customer.address) {
        const custAddr = doc.splitTextToSize(customer.address, colWidth - 12);
        doc.text(custAddr, billToX + 6, infoStartY + 23);
    }
    if (customer.phone) {
        doc.text(`Ph: ${customer.phone}`, billToX + 6, infoStartY + 32);
    }
    if (customer.email) {
        doc.text(`Email: ${customer.email}`, billToX + 6, infoStartY + 36);
    }

    // ═══════════════════════════════════════════════════════════
    // ITEMS TABLE — Blue-themed
    // ═══════════════════════════════════════════════════════════
    const tableBody = items.map((item, idx) => [
        (idx + 1).toString(),
        item.name || 'Service',
        item.hsn_sac || '-',
        item.quantity.toString(),
        `Rs. ${fmt(item.unit_price)}`,
        `${item.gst_percent}%`,
        `Rs. ${fmt(item.gst)}`,
        `Rs. ${fmt(item.total)}`,
    ]);

    autoTable(doc, {
        startY: infoStartY + 52,
        head: [['#', 'DESCRIPTION', 'HSN/SAC', 'QTY', 'UNIT PRICE', 'GST %', 'GST AMT', 'TOTAL']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: 'bold',
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            halign: 'left',
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
            textColor: [SLATE_900.r, SLATE_900.g, SLATE_900.b],
            lineColor: [226, 232, 240],
            lineWidth: 0.3,
        },
        alternateRowStyles: {
            fillColor: [LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b],
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 44 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
            5: { cellWidth: 14, halign: 'center' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
        tableLineColor: [DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b],
    });

    // ═══════════════════════════════════════════════════════════
    // TOTALS SECTION — Right-aligned blue box
    // ═══════════════════════════════════════════════════════════
    const tableEndY = doc.lastAutoTable.finalY + 8;
    const totalsBoxW = 92;
    const totalsBoxX = pageWidth - margin - totalsBoxW;

    // Totals background box
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(totalsBoxX, tableEndY, totalsBoxW, 48, 3, 3, 'F');

    // Subtotal row
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('Subtotal', totalsBoxX + 8, tableEndY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.text(`Rs. ${fmt(totals.subtotal)}`, totalsBoxX + totalsBoxW - 8, tableEndY + 10, { align: 'right' });

    // GST row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('Total GST', totalsBoxX + 8, tableEndY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.text(`Rs. ${fmt(totals.totalGst)}`, totalsBoxX + totalsBoxW - 8, tableEndY + 20, { align: 'right' });

    // Divider
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.5);
    doc.line(totalsBoxX + 6, tableEndY + 26, totalsBoxX + totalsBoxW - 6, tableEndY + 26);

    // Grand Total (highlighted)
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.roundedRect(totalsBoxX, tableEndY + 30, totalsBoxW, 18, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', totalsBoxX + 8, tableEndY + 41);
    doc.setFontSize(12);
    doc.text(`Rs. ${fmt(totals.grandTotal)}`, totalsBoxX + totalsBoxW - 8, tableEndY + 41, { align: 'right' });

    // ═══════════════════════════════════════════════════════════
    // AMOUNT IN WORDS — Left side
    // ═══════════════════════════════════════════════════════════
    const wordsY = tableEndY + 60;

    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(margin, wordsY, contentWidth, 14, 3, 3, 'F');

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT IN WORDS:', margin + 6, wordsY + 6);

    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const totalWords = numberToWords(Math.round(totals.grandTotal));
    doc.text(totalWords, margin + 6, wordsY + 11);

    // ═══════════════════════════════════════════════════════════
    // TERMS & CONDITIONS
    // ═══════════════════════════════════════════════════════════
    const termsY = wordsY + 22;

    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', margin, termsY);

    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.3);
    doc.line(margin, termsY + 2, margin + 40, termsY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    const disclaimerLines = doc.splitTextToSize(meta.disclaimer || 'Computer-generated invoice.', contentWidth);
    doc.text(disclaimerLines, margin, termsY + 7);

    // ═══════════════════════════════════════════════════════════
    // FOOTER BAR
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.rect(0, 280, pageWidth, 17, 'F');

    doc.setTextColor(180, 200, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a system-generated document. No signature is required.', pageWidth / 2, 288, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text('Powered by InTrust Platform', pageWidth / 2, 293, { align: 'center' });

    // ═══════════════════════════════════════════════════════════
    // SAVE
    // ═══════════════════════════════════════════════════════════
    doc.save(`${meta.invoice_number || 'Invoice'}.pdf`);
};


/**
 * Generates an invoice PDF from order data (e-commerce or gift card orders).
 * Same blue & white theme. Used across customer, merchant, and admin dashboards.
 *
 * @param {Object} params
 * @param {Object} params.order - { id, created_at, customer_name, delivery_address, customer_phone, delivery_fee_paise, is_platform_order }
 * @param {Array}  params.items - [{ shopping_products: { title, hsn_code, gst_percentage }, quantity, unit_price_paise, total_price_paise }]
 * @param {Object} params.seller - { name, address, phone, gstin }
 * @param {Object} [params.customer] - { name, address, phone } — override from order if needed
 * @param {string} [params.type] - 'shopping' | 'giftcard' — defaults to 'shopping'
 */
export const generateOrderInvoice = (params) => {
    const { order, items = [], seller, customer: customerOverride, type = 'shopping' } = params;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    const invoiceNumber = `INV-${new Date(order.created_at).getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const custName = customerOverride?.name || order.customer_name || 'Customer';
    const custAddress = customerOverride?.address || order.delivery_address || '';
    const custPhone = customerOverride?.phone || order.customer_phone || '';

    // ═══════════════ HEADER ═══════════════
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', margin, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 200, 255);
    doc.text('Financial Services (India) Pvt. Ltd.', margin, 30);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', pageWidth - margin, 22, { align: 'right' });

    // ═══════════════ META STRIP ═══════════════
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.rect(0, 42, pageWidth, 18, 'F');

    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No: ${invoiceNumber}`, margin, 53);
    doc.text(`Date: ${invoiceDate}`, pageWidth - margin, 53, { align: 'right' });

    // ═══════════════ FROM / BILL TO ═══════════════
    const infoStartY = 70;
    const colWidth = contentWidth / 2 - 5;

    // FROM
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(margin, infoStartY, colWidth, 44, 3, 3, 'F');

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', margin + 6, infoStartY + 8);
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.5);
    doc.line(margin + 6, infoStartY + 10, margin + 25, infoStartY + 10);

    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(seller?.name || 'InTrust', margin + 6, infoStartY + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_700.r, SLATE_700.g, SLATE_700.b);
    if (seller?.address) {
        const sellerAddr = doc.splitTextToSize(seller.address, colWidth - 12);
        doc.text(sellerAddr, margin + 6, infoStartY + 23);
    }
    if (seller?.gstin) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${seller.gstin}`, margin + 6, infoStartY + 35);
    }
    if (seller?.phone) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Ph: ${seller.phone}`, margin + 6, infoStartY + 39);
    }

    // BILL TO
    const billToX = margin + colWidth + 10;
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(billToX, infoStartY, colWidth, 44, 3, 3, 'F');

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', billToX + 6, infoStartY + 8);
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.line(billToX + 6, infoStartY + 10, billToX + 28, infoStartY + 10);

    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(custName, billToX + 6, infoStartY + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SLATE_700.r, SLATE_700.g, SLATE_700.b);
    if (custAddress) {
        const custAddr = doc.splitTextToSize(custAddress, colWidth - 12);
        doc.text(custAddr, billToX + 6, infoStartY + 23);
    }
    if (custPhone) {
        doc.text(`Ph: ${custPhone}`, billToX + 6, infoStartY + 35);
    }

    // ═══════════════ ITEMS TABLE ═══════════════
    let processedItems = [];
    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;

    if (type === 'giftcard') {
        // Gift card: single line item
        const faceValue = order.faceValue || 0;
        const paidAmount = order.paidAmount || (order.amount || 0) / 100;
        processedItems = [{
            sNo: '1',
            name: order.brand || order.giftcard_name || 'Gift Card',
            hsn: '9985',
            qty: '1',
            unitPrice: `Rs. ${fmt(paidAmount)}`,
            gstPct: '18%',
            gstAmt: `Rs. ${fmt(paidAmount * 18 / 118)}`,
            total: `Rs. ${fmt(paidAmount)}`,
        }];
        const base = paidAmount * 100 / 118;
        const gst = paidAmount - base;
        subtotal = base;
        totalGst = gst;
        grandTotal = paidAmount;
    } else {
        // Shopping order items
        items.forEach((item, idx) => {
            const gstRate = item.shopping_products?.gst_percentage || item.gst_percentage || 0;
            const hsnCode = item.shopping_products?.hsn_code || item.hsn_code || '-';
            const quantity = item.quantity || 1;
            const totalPaise = item.total_price_paise || (item.unit_price_paise * quantity) || 0;
            const baseAmount = totalPaise / (1 + gstRate / 100);
            const gstAmount = totalPaise - baseAmount;

            subtotal += baseAmount;
            totalGst += gstAmount;
            grandTotal += totalPaise;

            processedItems.push({
                sNo: (idx + 1).toString(),
                name: item.shopping_products?.title || item.product_title || 'Product',
                hsn: hsnCode,
                qty: quantity.toString(),
                unitPrice: `Rs. ${fmt(totalPaise / quantity / 100)}`,
                gstPct: `${gstRate}%`,
                gstAmt: `Rs. ${fmt(gstAmount / 100)}`,
                total: `Rs. ${fmt(totalPaise / 100)}`,
            });
        });
        // Convert paise to rupees
        subtotal /= 100;
        totalGst /= 100;
        grandTotal /= 100;
    }

    // Add delivery fee if applicable
    const deliveryFee = (order.delivery_fee_paise || 0) / 100;
    if (deliveryFee > 0) {
        processedItems.push({
            sNo: (processedItems.length + 1).toString(),
            name: 'Delivery Charges',
            hsn: '996812',
            qty: '1',
            unitPrice: `Rs. ${fmt(deliveryFee)}`,
            gstPct: '0%',
            gstAmt: 'Rs. 0.00',
            total: `Rs. ${fmt(deliveryFee)}`,
        });
        grandTotal += deliveryFee;
    }

    const tableBody = processedItems.map(item => [
        item.sNo, item.name, item.hsn, item.qty, item.unitPrice, item.gstPct, item.gstAmt, item.total,
    ]);

    autoTable(doc, {
        startY: infoStartY + 52,
        head: [['#', 'DESCRIPTION', 'HSN/SAC', 'QTY', 'UNIT PRICE', 'GST %', 'GST AMT', 'TOTAL']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b],
            textColor: [255, 255, 255],
            fontSize: 7.5,
            fontStyle: 'bold',
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            halign: 'left',
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
            textColor: [SLATE_900.r, SLATE_900.g, SLATE_900.b],
            lineColor: [226, 232, 240],
            lineWidth: 0.3,
        },
        alternateRowStyles: {
            fillColor: [LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b],
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 44 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
            5: { cellWidth: 14, halign: 'center' },
            6: { cellWidth: 25, halign: 'right' },
            7: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
        tableLineColor: [DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b],
    });

    // ═══════════════ TOTALS BOX ═══════════════
    const tableEndY = doc.lastAutoTable.finalY + 8;
    const totalsBoxW = 92;
    const totalsBoxX = pageWidth - margin - totalsBoxW;

    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(totalsBoxX, tableEndY, totalsBoxW, 48, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('Subtotal', totalsBoxX + 8, tableEndY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.text(`Rs. ${fmt(subtotal)}`, totalsBoxX + totalsBoxW - 8, tableEndY + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('Total GST', totalsBoxX + 8, tableEndY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.text(`Rs. ${fmt(totalGst)}`, totalsBoxX + totalsBoxW - 8, tableEndY + 20, { align: 'right' });

    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.5);
    doc.line(totalsBoxX + 6, tableEndY + 26, totalsBoxX + totalsBoxW - 6, tableEndY + 26);

    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.roundedRect(totalsBoxX, tableEndY + 30, totalsBoxW, 18, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL', totalsBoxX + 8, tableEndY + 41);
    doc.setFontSize(12);
    doc.text(`Rs. ${fmt(grandTotal)}`, totalsBoxX + totalsBoxW - 8, tableEndY + 41, { align: 'right' });

    // ═══════════════ AMOUNT IN WORDS ═══════════════
    const wordsY = tableEndY + 58;
    doc.setFillColor(LIGHT_BLUE.r, LIGHT_BLUE.g, LIGHT_BLUE.b);
    doc.roundedRect(margin, wordsY, contentWidth, 14, 3, 3, 'F');

    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('AMOUNT IN WORDS:', margin + 6, wordsY + 6);

    doc.setTextColor(SLATE_900.r, SLATE_900.g, SLATE_900.b);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(numberToWords(Math.round(grandTotal)), margin + 6, wordsY + 11);

    // ═══════════════ TERMS ═══════════════
    const termsY = wordsY + 22;
    doc.setTextColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', margin, termsY);
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.3);
    doc.line(margin, termsY + 2, margin + 40, termsY + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(SLATE_500.r, SLATE_500.g, SLATE_500.b);
    doc.text('This is a computer-generated invoice. No signature is required.', margin, termsY + 7);

    // ═══════════════ FOOTER ═══════════════
    doc.setFillColor(DARK_BLUE.r, DARK_BLUE.g, DARK_BLUE.b);
    doc.rect(0, 280, pageWidth, 17, 'F');
    doc.setTextColor(180, 200, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This is a system-generated document. No signature is required.', pageWidth / 2, 288, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text('Powered by InTrust Platform', pageWidth / 2, 293, { align: 'center' });

    doc.save(`${invoiceNumber}.pdf`);
};
