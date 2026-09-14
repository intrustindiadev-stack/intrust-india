'use server';

import { headers } from 'next/headers';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

const BUCKET = 'customer-agreements';

function dataUriToBuffer(dataUri) {
    const m = /^data:application\/pdf;base64,(.+)$/.exec(dataUri || '');
    if (!m) return null;
    return Buffer.from(m[1], 'base64');
}

/** Store the signed agreement PDF + audit row. Called from submitKYC. */
export async function storeCustomerAgreement({ userId, kycRecordId, agreement }) {
    try {
        if (!agreement?.pdfBase64) return { success: true, data: null };
        const admin = createAdminClient();
        const buf = dataUriToBuffer(agreement.pdfBase64);
        if (!buf) return { success: false, error: 'Invalid agreement PDF' };
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const path = `${userId}/${agreement.agreementId || ts}.pdf`;
        const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
            contentType: 'application/pdf',
            upsert: true,
        });
        if (upErr) {
            console.error('[agreements] upload failed:', upErr.message);
            return { success: false, error: upErr.message };
        }
        let ip = '';
        try {
            const h = await headers();
            ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '';
        } catch { /* ignore */ }
        const { data, error } = await admin.from('customer_agreements').insert({
            user_id: userId,
            kyc_record_id: kycRecordId || null,
            doc_slug: agreement.docSlug || 'kyc_terms',
            doc_version: agreement.docVersion || 'v1.0',
            doc_title: agreement.docTitle || 'KYC Terms & Conditions',
            full_text_snapshot: agreement.fullText || '',
            pdf_storage_path: path,
            pdf_hash_sha256: agreement.pdfHash || null,
            accepted_at: agreement.acceptedAt || new Date().toISOString(),
            accepted_ip: ip,
            user_agent: agreement.userAgent || '',
        }).select('*').maybeSingle();
        if (error) {
            console.error('[agreements] insert failed:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data: { ...data, acceptedIp: ip } };
    } catch (e) {
        console.error('[agreements] unexpected:', e?.message);
        return { success: false, error: e?.message || 'Failed to store agreement' };
    }
}

/** Admin: list agreements for a user with signed PDF URLs. */
export async function listUserAgreements(userId) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const admin = createAdminClient();
    const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = ['admin', 'super_admin'].includes(profile?.role);
    if (!isAdmin && user.id !== userId) return { success: false, error: 'Unauthorized' };
    const { data, error } = await admin.from('customer_agreements')
        .select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows = [];
    for (const row of data || []) {
        let url = null;
        if (row.pdf_storage_path) {
            const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(row.pdf_storage_path, 3600);
            url = signed?.signedUrl || null;
        }
        rows.push({ ...row, pdfUrl: url });
    }
    return { success: true, data: rows };
}
