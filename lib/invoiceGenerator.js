import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (txn) => {
    const doc = new jsPDF();

    // Set document properties
    doc.setProperties({
        title: `Tax Invoice - ${txn.id}`,
        subject: 'Transaction Invoice',
        author: 'Intrust Financial Service India Pvt Ltd',
        keywords: 'invoice, transaction, intrust',
        creator: 'Intrust India'
    });

    // Clean Amount (remove Rupee symbol if present in string to avoid double symbols or encoding issues)
    const displayAmount = typeof txn.amount === 'string'
        ? txn.amount.replace(/[^\d\.,]/g, '')
        : txn.amount.toString();

    // Colors
    const primaryColor = [15, 23, 42]; // slate-900 (Darker for professionalism)
    const accentColor = [37, 99, 235]; // blue-600
    const secondaryColor = [100, 116, 139]; // slate-500
    const borderColor = [226, 232, 240]; // slate-200

    // --- Header Section ---
    // Left side: Company Info
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Intrust Financial Service', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('India Private Limited', 20, 31);
    doc.text('support@intrustindia.com', 20, 37);
    doc.text('www.intrustindia.com', 20, 42);

    // Right side: INVOICE title
    doc.setFontSize(28);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', 190, 28, { align: 'right' });

    // Header Divider
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);

    // --- Invoice Meta Section ---
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice No:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(txn.id, 45, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 20, 66);
    doc.setFont('helvetica', 'normal');
    doc.text(txn.date, 45, 66);

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 20, 72);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(txn.status.toUpperCase(), 45, 72);

    // Bill To
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 120, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(txn.user, 120, 66);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(txn.email, 120, 72);
    if (txn.role) {
        doc.text(`Role: ${txn.role.toUpperCase()}`, 120, 78);
    }

    // --- Table Section ---
    const tableData = [
        ['Description', txn.description || 'General Service'],
        ['Source', txn.source || 'Direct'],
        ['Entry Type', txn.type || 'N/A'],
        ['Price', `Rs. ${displayAmount}`]
    ];

    autoTable(doc, {
        startY: 90,
        head: [['Item Description', 'Details', 'Source', 'Total']],
        body: [[
            txn.description || 'Transaction Amount',
            txn.type || 'Payment',
            txn.source || 'Wallet',
            `Rs. ${displayAmount}`
        ]],
        theme: 'plain',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            cellPadding: 6,
            halign: 'left'
        },
        bodyStyles: {
            fontSize: 10,
            cellPadding: 8,
            textColor: primaryColor,
            lineColor: borderColor,
            lineWidth: 0.1
        },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 }
    });

    // --- Summary Section ---
    const finalY = doc.lastAutoTable.finalY + 10;

    // Summary Box
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(130, finalY, 60, 25, 'F');

    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', 135, finalY + 10);
    doc.text(`Rs. ${displayAmount}`, 185, finalY + 10, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Total (INR)', 135, finalY + 18);
    doc.setFontSize(12);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`Rs. ${displayAmount}`, 185, finalY + 18, { align: 'right' });

    // --- Footer Section ---
    const pageHeight = doc.internal.pageSize.height;

    // Add a signature line or stamp placeholder if needed
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(20, pageHeight - 40, 190, pageHeight - 40);

    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Intrust Financial Service India Private Limited', 105, pageHeight - 30, { align: 'center' });
    doc.text('Registered Office: India | Contact us at support@intrustindia.com', 105, pageHeight - 25, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated document and does not require a physical signature.', 105, pageHeight - 15, { align: 'center' });

    // Save PDF
    doc.save(`Invoice_${txn.id}.pdf`);
};
