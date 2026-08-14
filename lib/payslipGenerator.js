import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PLATFORM_CONFIG } from '@/lib/config/platform';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabaseClient';

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
const LIGHT_B= { r: 245, g: 248, b: 255 }; // Softer light blue for headers
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
const drawHeader = async (doc, pageWidth, month, year, startDateStr, endDateStr) => {
    const H = 60; // Taller header
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
    const qrX = pageWidth - QR_SIZE - QR_MARGIN - 8;
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
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SALARY SLIP', titleBlockRight, 18, { align: 'right' });

    // Thin white divider under title
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.setGState(doc.GState({ opacity: 0.4 }));
    doc.line(titleBlockRight - 70, 22, titleBlockRight, 22);
    doc.setGState(doc.GState({ opacity: 1 }));

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${month} ${year}`, titleBlockRight, 30, { align: 'right' });
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 225, 255);
    doc.text(`Pay Period: ${startDateStr} - ${endDateStr}`, titleBlockRight, 36, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, titleBlockRight, 42, { align: 'right' });

    // ── Logo + Brand block: left ──
    const logo = await getLogoBase64();
    let brandX = 12;
    if (logo) {
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 28, 16, 'F');
        doc.addImage(logo, 'PNG', 10, 13, 30, 30);
        brandX = 44;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INTRUST INDIA', brandX, 26);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 225, 255);
    doc.text('Powered by Intrust Financial Services Pvt. Ltd.', brandX, 33);
    doc.setFontSize(7);
    doc.text(`GSTIN: ${PLATFORM_CONFIG.business.gstin}`, brandX, 39);
    doc.text(`${PLATFORM_CONFIG.business.website}  |  ${PLATFORM_CONFIG.business.phone}`, brandX, 45);

    // ── Bottom accent line ──
    doc.setDrawColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.setLineWidth(1.5);
    doc.line(0, H, pageWidth, H);

    return H + 8;
};

// ─── Section Header helper ────────────────────────────────────────
const sectionHeader = (doc, text, y, margin, contentWidth) => {
    doc.setFillColor(LIGHT_B.r, LIGHT_B.g, LIGHT_B.b);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
    doc.setFillColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.rect(margin, y, 2.5, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK_B.r, DARK_B.g, DARK_B.b);
    doc.text(text, margin + 6, y + 4.8);
    return y + 10;
};

export const downloadPayslip = async ({ employee, salary, lineItems, attendanceStats: initialAttendanceStats }) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const mStr = MONTHS[salary.month - 1];

    // Compute Dates
    const startDateObj = new Date(salary.year, salary.month - 1, 1);
    const endDateObj = new Date(salary.year, salary.month, 0);
    
    const fmtDate = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const startDateStr = fmtDate(startDateObj);
    const endDateStr = fmtDate(endDateObj);
    
    const totalCalendarDays = endDateObj.getDate();

    // Fetch attendance if missing
    let attendanceStats = initialAttendanceStats;
    if (!attendanceStats && salary && employee && employee.id) {
        try {
            const sd = `${salary.year}-${String(salary.month).padStart(2, '0')}-01`;
            const ed = endDateObj.toISOString().split('T')[0];
            const { data: atts } = await supabase.from('attendance')
                .select('status')
                .eq('employee_id', employee.id)
                .gte('date', sd)
                .lte('date', ed);
                
            if (atts) {
                attendanceStats = { present: 0, absent: 0, half_day: 0, late: 0, leave: 0 };
                atts.forEach(a => {
                    attendanceStats[a.status] = (attendanceStats[a.status] || 0) + 1;
                });
            }
        } catch (err) {
            console.warn('Failed to fetch attendance for payslip', err);
        }
    }

    let y = await drawHeader(doc, pageWidth, mStr, salary.year, startDateStr, endDateStr);

    // ── Payroll & Employee Information ──
    y = sectionHeader(doc, 'PAYROLL & EMPLOYEE INFORMATION', y, margin, contentWidth);
    
    doc.setFontSize(8.5);
    
    const col1X = margin;
    const col1VX = margin + 28;
    const col2X = margin + 95;
    const col2VX = margin + 125;
    
    const drawRow = (yPos, lbl1, val1, lbl2, val2) => {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(SLATE.r, SLATE.g, SLATE.b); doc.text(lbl1, col1X, yPos);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY.r, NAVY.g, NAVY.b); doc.text(String(val1), col1VX, yPos);
        
        if (lbl2) {
            doc.setFont('helvetica', 'normal'); doc.setTextColor(SLATE.r, SLATE.g, SLATE.b); doc.text(lbl2, col2X, yPos);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY.r, NAVY.g, NAVY.b); doc.text(String(val2), col2VX, yPos);
        }
    };

    drawRow(y, 'Employee Name:', employee.full_name || 'N/A', 'Payslip ID:', salary.id ? salary.id.substring(0,8).toUpperCase() : 'N/A');
    y += 6;
    drawRow(y, 'Employee ID:', `EMP-${(employee.id || '').substring(0,8).toUpperCase()}`, 'Pay Date:', new Date(salary.processed_at || new Date()).toLocaleDateString('en-IN'));
    y += 6;
    drawRow(y, 'Department/Role:', (employee.department || employee.role || 'N/A').toUpperCase().replace(/_/g, ' '), 'Payroll Status:', salary.status.toUpperCase());
    y += 6;
    drawRow(y, 'Date of Joining:', employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-IN') : 'N/A', 'Employment Type:', (employee.employment_type || 'Full Time').toUpperCase().replace(/_/g, ' '));
    
    y += 10;

    // ── Attendance Summary ──
    if (attendanceStats) {
        y = sectionHeader(doc, 'MONTHLY ATTENDANCE SUMMARY', y, margin, contentWidth);
        
        const pres = attendanceStats.present || 0;
        const abs = attendanceStats.absent || 0;
        const hd = attendanceStats.half_day || 0;
        const late = attendanceStats.late || 0;
        const payableDays = Math.max(0, totalCalendarDays - abs - (hd * 0.5));

        doc.setFontSize(8.5);
        let tx = margin;
        
        const drawAtt = (lbl, val, color) => {
            doc.setFont('helvetica', 'normal'); doc.setTextColor(SLATE.r, SLATE.g, SLATE.b); doc.text(lbl, tx, y);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(color.r, color.g, color.b); doc.text(String(val), tx + 25, y);
            tx += 38;
        };

        drawAtt('Calendar Days:', totalCalendarDays, NAVY);
        drawAtt('Present Days:', pres, EMERALD);
        drawAtt('Absent Days:', abs, ROSE);
        drawAtt('Half Days:', hd, NAVY);
        
        doc.setFont('helvetica', 'bold'); doc.setTextColor(NAVY.r, NAVY.g, NAVY.b); 
        doc.text('Payable Days:', tx, y);
        doc.setFillColor(EMERALD.r, EMERALD.g, EMERALD.b);
        doc.roundedRect(tx + 22, y - 4, 16, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(String(payableDays), tx + 25, y + 0.5);

        y += 10;
    }

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

    const grossEarnings = (salary.net_salary || 0) + (salary.deductions || 0);

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin + contentWidth / 2 + 3 },
        head: [['EARNINGS', 'AMOUNT (INR)']],
        body: tableData,
        foot: [['Gross Earnings', fmt(grossEarnings)]],
        theme: 'grid',
        headStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5, textColor: [71, 85, 105] },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.1 }
    });
    
    const leftTableY = doc.lastAutoTable.finalY;

    const deductionsData = [];
    if (salary.deductions > 0) {
        deductionsData.push(['Leave / Absence & Other Deductions', fmt(salary.deductions)]);
    } else {
        deductionsData.push(['No Deductions', '0.00']);
    }

    autoTable(doc, {
        startY: y,
        margin: { left: margin + contentWidth / 2 + 3, right: margin },
        head: [['DEDUCTIONS', 'AMOUNT (INR)']],
        body: deductionsData,
        foot: [['Total Deductions', fmt(salary.deductions || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [255, 241, 242], textColor: [159, 18, 57], fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8.5, textColor: [71, 85, 105] },
        footStyles: { fillColor: [255, 228, 230], textColor: [159, 18, 57], fontStyle: 'bold', fontSize: 8.5 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] } },
        styles: { lineColor: [226, 232, 240], lineWidth: 0.1 }
    });

    const rightTableY = doc.lastAutoTable.finalY;
    
    y = Math.max(leftTableY, rightTableY) + 12;

    // ── Net Pay Summary ──
    const tx = pageWidth - margin - 80;

    // Draw a prominent Net Payable box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(tx - 4, y - 6, 84, 28, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('NET PAYABLE', tx, y + 2);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(EMERALD.r, EMERALD.g, EMERALD.b);
    doc.text(`Rs. ${fmt(salary.net_salary)}`, pageWidth - margin - 4, y + 3, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    
    const amountInWordsText = `Amount in words: ${numberToWords(Math.round(salary.net_salary))}`;
    const splitAmountText = doc.splitTextToSize(amountInWordsText, 76);
    doc.text(splitAmountText, pageWidth - margin - 4, y + 12, { align: 'right' });

    y += 36;

    // ── Footer ──
    const footerY = 270;
    doc.setFillColor(LIGHT_B.r, LIGHT_B.g, LIGHT_B.b);
    doc.rect(0, footerY, pageWidth, 27, 'F');
    doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
    doc.setLineWidth(0.3);
    doc.line(0, footerY, pageWidth, footerY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    doc.text(`Salary Slip for ${mStr} ${salary.year}`, pageWidth / 2, footerY + 8, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('This is a computer generated document. No physical signature is required.', pageWidth / 2, footerY + 14, { align: 'center' });
    doc.text('Powered by InTrust India HRM | intrustindia.com', pageWidth / 2, footerY + 19, { align: 'center' });

    const pdfBlob = doc.output('blob');
    const safeName = (employee.full_name || 'Employee').replace(/\s+/g, '_');
    const fileName = `Payslip_${safeName}_${salary.month}_${salary.year}.pdf`;
    
    return {
        blob: pdfBlob,
        fileName,
        download: () => {
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
};
