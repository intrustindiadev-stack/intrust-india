import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabaseClient';

/**
 * Converts a number to Indian currency words
 */
const numberToWords = (num) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';

    return str.toUpperCase() + 'RUPEES ONLY';
};

export const generateInvoice = async (txn, settings) => {
    const doc = new jsPDF();
    const shortId = (txn.id || 'TXN').toString().slice(0, 8).toUpperCase();

    // Fetch settings if not provided (essential for Admin-only one-shot calls)
    let s = settings;
    if (!s) {
        try {
            const { data } = await supabase
                .from('invoice_settings')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000000')
                .single();
            s = data;
        } catch (e) {
            console.error('Failed to fetch invoice settings, using fallbacks', e);
        }
    }

    // Final Fallback settings
    if (!s) {
        s = {
            company_name: 'Intrust Financial Services (India) Pvt. Ltd.',
            company_address: 'TF-312/MM09, Ashima Mall, Narmadapuram Rd, Danish Naga, Bhopal, MP 462026',
            company_phone: '18002030052',
            gst_number: '23AAFC14866A1ZV',
            platform_fee_percent: 2,
            gst_percent: 18,
            sac_code: '9971'
        };
    }

    // Robust Parsing: Handle numbers, raw values, and formatted strings (₹ 2,450.00)
    let amountVal = txn.amountRaw || txn.amount || 0;
    if (typeof amountVal === 'string') {
        amountVal = amountVal.replace(/[^0-9.-]+/g, "");
    }
    const baseAmount = parseFloat(amountVal) || 0;
    
    const platformFee = (baseAmount * (s.platform_fee_percent / 100));
    const gstAmount = (baseAmount * (s.gst_percent / 100));
    const grandTotal = baseAmount + platformFee + gstAmount;

    // Helper: Format Currency
    const formatCurrency = (val) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // --- Minimal & Professional Design ---
    
    // Header Line (Top Accent - Thin & Clean)
    doc.setDrawColor(30, 41, 59); // Slate 800
    doc.setLineWidth(0.5);
    doc.line(15, 15, 195, 15);

    // Brand Name (Left)
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST', 15, 30);

    // "TAX INVOICE" (Right)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('TAX INVOICE', 195, 27, { align: 'right' });
    
    // Invoice Meta (ID / Date)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`INV-${shortId}`, 15, 42);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${new Date(txn.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`, 15, 47);

    // --- Bill To / Bill From ---
    const columnWidth = 85;
    const infoY = 65;

    // Bill From (Our Details)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', 15, infoY);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(s.company_name, 15, infoY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const addressLines = doc.splitTextToSize(s.company_address, columnWidth);
    doc.text(addressLines, 15, infoY + 10);
    doc.text(`GST: ${s.gst_number}`, 15, infoY + 22);
    doc.text(`Contact: ${s.company_phone}`, 15, infoY + 26);

    // Bill To (Customer Details)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 110, infoY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(txn.customer_name || 'Valued Partner', 110, infoY + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    if (txn.customer_phone) {
        doc.text(`Phone: ${txn.customer_phone}`, 110, infoY + 10);
    }
    doc.text(`Reference: ${txn.id}`, 110, infoY + 14);

    // --- Items Table (Minimal Striped) ---
    autoTable(doc, {
        startY: 100,
        head: [['SAC', 'DESCRIPTION', 'QTY', 'AMOUNT (INR)']],
        body: [
            [s.sac_code || '9971', txn.description || 'Service Charges', '1', formatCurrency(baseAmount)]
        ],
        theme: 'plain',
        headStyles: {
            fillColor: [248, 250, 252],
            textColor: [15, 23, 42],
            fontSize: 8,
            fontStyle: 'bold',
            cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 8,
            textColor: [51, 65, 85]
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 90 },
            2: { cellWidth: 25, halign: 'center' },
            3: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
    });

    // --- Totals Section ---
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalsX = 135;
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal', totalsX, finalY);
    doc.text(formatCurrency(baseAmount), 190, finalY, { align: 'right' });

    doc.text(`Platform Fee (${s.platform_fee_percent}%)`, totalsX, finalY + 8);
    doc.text(formatCurrency(platformFee), 190, finalY + 8, { align: 'right' });

    doc.text(`GST (${s.gst_percent}%)`, totalsX, finalY + 16);
    doc.text(formatCurrency(gstAmount), 190, finalY + 16, { align: 'right' });

    // Grand Total
    doc.setDrawColor(241, 245, 249);
    doc.line(totalsX, finalY + 20, 195, finalY + 20);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GRAND TOTAL', totalsX, finalY + 30);
    doc.text(`₹ ${formatCurrency(grandTotal)}`, 190, finalY + 30, { align: 'right' });

    // --- Amount in Words ---
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    const totalWords = numberToWords(Math.round(grandTotal));
    doc.text(`AMOUNT IN WORDS: ${totalWords.toUpperCase()} RUPEES ONLY`, 15, finalY + 50);

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TERMS & CONDITIONS', 15, finalY + 65);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const disclaimerLines = doc.splitTextToSize(s.disclaimer || 'Non-refundable digital transaction.', 180);
    doc.text(disclaimerLines, 15, finalY + 70);

    // Footer
    doc.setDrawColor(241, 245, 249);
    doc.line(15, 280, 195, 280);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Light Slate
    doc.text('This is a system-generated document based on the Intrust Secure Ledger. No signature is required.', 105, 285, { align: 'center' });

    // Save
    doc.save(`Invoice_${shortId}.pdf`);
};
