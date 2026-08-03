import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import QRCode from 'qrcode';

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

const fmt = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Color Palette ────────────────────────────────────────────────
const NAVY   = { r: 10,  g: 20,  b: 50  };
const BLUE   = { r: 25,  g: 80,  b: 200 };
const EMERALD= { r: 16,  g: 185, b: 129 };
const DARK_B = { r: 15,  g: 40,  b: 120 };
const LIGHT_B= { r: 235, g: 243, b: 255 };
const SLATE  = { r: 90,  g: 105, b: 125 };
const BORDER = { r: 210, g: 220, b: 235 };
const WHITE  = { r: 255, g: 255, b: 255 };
const ROSE   = { r: 225, g: 29,  b: 72  }; // For deductions

// ─── Generate QR Code DataURL ─────────────────────────────────────
const generateQR = async (text) => {
    try {
        return await QRCode.toDataURL(text, {
            width: 120, margin: 1,
            color: { dark: '#0A1432', light: '#FFFFFF' }
        });
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
const drawHeader = async (doc, pageWidth, month, year) => {
    const H = 52; // Taller header for better layout
    const QR_SIZE = 36;
    const QR_MARGIN = 4;

    // Dark navy-to-emerald gradient header for payslips
    const steps = 80;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const r = Math.round(10 + (16 - 10) * t);
        const g = Math.round(20 + (100 - 20) * t);
        const bv = Math.round(50 + (100 - 50) * t);
        doc.setFillColor(r, g, bv);
        doc.rect(0, (H / steps) * i, pageWidth, H / steps + 0.2, 'F');
    }

    // ── QR code: far right, vertically centered ──
    const qrX = pageWidth - QR_SIZE - QR_MARGIN;
    const qrY = (H - QR_SIZE) / 2;
    const qr = await generateQR(`INTRUST-PAYSLIP-${month}-${year}`);
    if (qr) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - 1, qrY - 1, QR_SIZE + 2, QR_SIZE + 2, 2, 2, 'F');
        doc.addImage(qr, 'PNG', qrX, qrY, QR_SIZE, QR_SIZE);
    }

    // ── Title block: right of center, left of QR ──
    const titleBlockRight = qrX - 6;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('SALARY SLIP', titleBlockRight, 17, { align: 'right' });

    // Thin white divider under title
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.setGState(doc.GState({ opacity: 0.4 }));
    doc.line(titleBlockRight - 60, 20, titleBlockRight, 20);
    doc.setGState(doc.GState({ opacity: 1 }));

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 225, 255);
    doc.text(`Period: ${month} ${year}`, titleBlockRight, 27, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, titleBlockRight, 33, { align: 'right' });

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
    doc.setDrawColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.setLineWidth(1);
    doc.line(0, H, pageWidth, H);

    return H + 6;
};

// ─── Section Header helper ────────────────────────────────────────
const sectionHeader = (doc, text, y, margin, contentWidth) => {
    doc.setFillColor(LIGHT_B.r, LIGHT_B.g, LIGHT_B.b);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
    doc.setFillColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.rect(margin, y, 2.5, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_B.r, DARK_B.g, DARK_B.b);
    doc.text(text, margin + 6, y + 4.8);
    return y + 10;
};

export const downloadPayslip = async ({ employee, salary, lineItems }) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const mStr = MONTHS[salary.month - 1];

    let y = await drawHeader(doc, pageWidth, mStr, salary.year);

    // ── Employee Details ──
    y = sectionHeader(doc, 'EMPLOYEE DETAILS', y, margin, contentWidth);
    
    doc.setFontSize(8.5);
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    
    doc.setFont('helvetica', 'normal'); doc.text('Employee Name:', margin, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY.r, NAVY.g, NAVY.b); doc.text(employee.full_name || 'N/A', margin + 30, y);
    
    doc.setFont('helvetica', 'normal'); doc.setTextColor(SLATE.r, SLATE.g, SLATE.b); doc.text('Department/Role:', margin + 100, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY.r, NAVY.g, NAVY.b); doc.text((employee.department || employee.role || 'N/A').toUpperCase().replace(/_/g, ' '), margin + 130, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(SLATE.r, SLATE.g, SLATE.b); doc.text('Employee ID:', margin, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY.r, NAVY.g, NAVY.b); doc.text(`EMP-${employee.id.substring(0,8).toUpperCase()}`, margin + 30, y);

    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(SLATE.r, SLATE.g, SLATE.b); doc.text('Status:', margin, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(EMERALD.r, EMERALD.g, EMERALD.b); doc.text(salary.status.toUpperCase(), margin + 30, y);
    
    y += 10;

    // ── Salary Breakdown ──
    y = sectionHeader(doc, 'SALARY BREAKDOWN', y, margin, contentWidth);

    const tableData = [];
    tableData.push(['Basic Salary', fmt(salary.base_salary || employee.base_salary)]);
    if (salary.hra > 0) tableData.push(['HRA (House Rent Allowance)', fmt(salary.hra)]);
    if (salary.allowances > 0) tableData.push(['Standard Allowances', fmt(salary.allowances)]);

    if (lineItems && lineItems.length > 0) {
        lineItems.forEach(item => {
            tableData.push([{ content: item.label, styles: { textColor: BLUE } }, fmt(item.amount_paise / 100)]);
        });
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin + contentWidth / 2 + 2 },
        head: [['EARNINGS', 'AMOUNT (INR)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [71, 85, 105] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.1 }
    });
    
    const leftTableY = doc.lastAutoTable.finalY;

    const deductionsData = [];
    if (salary.deductions > 0) {
        deductionsData.push(['Other Deductions', fmt(salary.deductions)]);
    } else {
        deductionsData.push(['No Deductions', '0.00']);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin + contentWidth / 2 + 2, right: margin },
        head: [['DEDUCTIONS', 'AMOUNT (INR)']],
        body: deductionsData,
        theme: 'grid',
        headStyles: { fillColor: [255, 241, 242], textColor: [159, 18, 57], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [71, 85, 105] },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] } },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.1 }
    });

    const rightTableY = doc.lastAutoTable.finalY;
    
    y = Math.max(leftTableY, rightTableY) + 12;

    // ── Net Pay Summary ──
    const tx = pageWidth - margin - 68;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('Gross Earnings', tx, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(`Rs. ${fmt((salary.net_salary || 0) + (salary.deductions || 0))}`, pageWidth - margin, y, { align: 'right' });

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('Total Deductions', tx, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ROSE.r, ROSE.g, ROSE.b);
    doc.text(`- Rs. ${fmt(salary.deductions)}`, pageWidth - margin, y, { align: 'right' });

    y += 6;
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.4);
    doc.line(tx, y - 2, pageWidth - margin, y - 2);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.text('NET PAYABLE', tx, y + 2);
    doc.text(`Rs. ${fmt(salary.net_salary)}`, pageWidth - margin, y + 2, { align: 'right' });

    y += 12;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(`Amount in words: ${numberToWords(Math.round(salary.net_salary))}`, tx, y, { align: 'right' });

    // ── Footer ──
    const footerY = 270;
    doc.setFillColor(LIGHT_B.r, LIGHT_B.g, LIGHT_B.b);
    doc.rect(0, footerY, pageWidth, 27, 'F');
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(0, footerY, pageWidth, footerY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(`Payslip for ${mStr} ${salary.year}`, pageWidth / 2, footerY + 8, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('This is a computer generated document. No signature is required.', pageWidth / 2, footerY + 14, { align: 'center' });
    doc.text('Powered by InTrust India | intrustindia.com', pageWidth / 2, footerY + 19, { align: 'center' });

    const pdfBlob = doc.output('blob');
    return {
        blob: pdfBlob,
        fileName: `Payslip_${employee.full_name.replace(/\s+/g, '_')}_${salary.month}_${salary.year}.pdf`,
        download: () => {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslip_${employee.full_name.replace(/\s+/g, '_')}_${salary.month}_${salary.year}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
};
