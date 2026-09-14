import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const NAVY = { r: 10, g: 22, b: 52 };
const BLUE = { r: 26, g: 86, b: 219 };
const SLATE = { r: 100, g: 116, b: 139 };
const LIGHT = { r: 239, g: 246, b: 255 };

export function fmtDateTime(iso) {
    try {
        return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
    } catch { return iso; }
}

export async function qrDataUrl(text) {
    try {
        return await QRCode.toDataURL(text, { width: 120, margin: 1 });
    } catch { return null; }
}

export async function logoDataUrl() {
    try {
        const res = await fetch('/logo.png');
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.onerror = () => resolve(null);
            r.readAsDataURL(blob);
        });
    } catch { return null; }
}

export function drawAgreementHeader(doc, W, M, business) {
    doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
    doc.rect(0, 0, W, 34, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Intrust India', M, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(190, 205, 230);
    doc.text('Operated by Intrust Financial Services (India) Pvt. Ltd. | ' + (business?.website || 'www.intrustindia.com'), M, 19);
    doc.text(String(business?.address || ''), M, 24);
    doc.text('GSTIN: ' + (business?.gstin || '-') + '  PAN: ' + (business?.pan || '-'), M, 28.5);
    return 40;
}

export function drawAgreementFooter(doc, W, H, pageNum, totalPages, agreementId, hash) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    doc.text('Agreement ' + agreementId + ' | ' + String(hash || '').slice(0, 24) + ' | Page ' + pageNum + '/' + totalPages, 15, H - 10);
    doc.setDrawColor(210, 220, 235);
    doc.line(15, H - 13, W - 15, H - 13);
}

export async function sha256Hex(blob) {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateKycAgreementPdf({ customer, doc, business, meta }) {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const M = 15;
    const CW = W - M * 2;
    let y = drawAgreementHeader(pdf, W, M, business);
    pdf.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
    pdf.roundedRect(M, y, CW, 16, 2, 2, 'F');
    pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Customer KYC Agreement & Consent', M + 4, y + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    pdf.text(doc.title + ' | ' + doc.version, M + 4, y + 12);
    y += 22;
    autoTable(pdf, {
        startY: y,
        head: [['Customer details', '']],
        body: [
            ['Full name', customer.fullName || '-'],
            ['Phone', customer.phoneNumber || '-'],
            ['PAN (masked)', customer.maskedPan || '-'],
            ['Address', customer.addressLine || '-'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [NAVY.r, NAVY.g, NAVY.b], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' } },
        margin: { left: M, right: M },
    });
    y = pdf.lastAutoTable.finalY + 6;
    pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Terms accepted', M, y);
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(40, 40, 40);
    const lines = pdf.splitTextToSize(doc.body_markdown || '', CW);
    for (const line of lines) {
        if (y > H - 34) { pdf.addPage(); y = 18; }
        if (line.startsWith('## ')) {
            y += 2;
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(NAVY.r, NAVY.g, NAVY.b);
            pdf.text(line.replace(/^##\s*/, ''), M, y);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(40, 40, 40);
        } else {
            pdf.text(line, M, y);
        }
        y += 4.2;
    }
    if (y > H - 62) { pdf.addPage(); y = 18; }
    y += 4;
    pdf.setFillColor(236, 253, 245);
    pdf.roundedRect(M, y, CW, 30, 2, 2, 'F');
    pdf.setTextColor(6, 78, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('Digital consent declaration', M + 4, y + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text(pdf.splitTextToSize('I, ' + (customer.fullName || 'the undersigned') + ', accept ' + doc.title + ' (' + doc.version + '). This document is my digital signature.', CW - 8), M + 4, y + 12);
    pdf.text('Accepted: ' + fmtDateTime(meta.acceptedAt) + ' IST | IP: ' + (meta.ip || '-'), M + 4, y + 25);
    y += 36;
    pdf.setFontSize(7.5);
    pdf.setTextColor(SLATE.r, SLATE.g, SLATE.b);
    pdf.text('Agreement ID: ' + meta.agreementId, M, y + 6);
    pdf.text('Device: ' + String(meta.userAgent || '').slice(0, 80), M, y + 11);
    const total = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        drawAgreementFooter(pdf, W, H, i, total, meta.agreementId, meta.hash);
    }
    void BLUE;
    return { pdf };
}

