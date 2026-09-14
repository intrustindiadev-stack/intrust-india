'use server';

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { LEGAL_DEFAULTS, LEGAL_SLUGS } from '@/lib/legalDefaults';

function fallbackDoc(slug) {
    const d = LEGAL_DEFAULTS[slug];
    if (!d) return null;
    return {
        id: `fallback-${slug}`,
        slug,
        title: d.title,
        body_markdown: d.body,
        version: d.version,
        is_active: true,
        effective_from: d.effectiveFrom,
        isFallback: true,
    };
}

export async function getActiveLegalDoc(slug) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data, error } = await supabase
            .from('legal_documents')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();
        if (!error && data) return { success: true, data };
    } catch (e) { console.warn('[legal] fallback for', slug, e?.message); }
    const fb = fallbackDoc(slug);
    if (!fb) return { success: false, error: 'Unknown document' };
    return { success: true, data: fb };
}

export async function listLegalDocsAdmin() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const admin = createAdminClient();
    const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (!['admin', 'super_admin'].includes(profile?.role)) return { success: false, error: 'Admin only' };
    const { data, error } = await admin.from('legal_documents').select('*').order('slug').order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function publishLegalDoc({ slug, title, body_markdown }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };
    const admin = createAdminClient();
    const { data: profile } = await admin.from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (!['admin', 'super_admin'].includes(profile?.role)) return { success: false, error: 'Admin only' };
    if (!LEGAL_SLUGS.includes(slug)) return { success: false, error: 'Invalid slug' };
    if (!title?.trim() || !body_markdown?.trim()) return { success: false, error: 'Title and body required' };
    const { data: current } = await admin.from('legal_documents').select('version').eq('slug', slug).eq('is_active', true).maybeSingle();
    const nextVersion = bumpVersion(current?.version || 'v1.0');
    await admin.from('legal_documents').update({ is_active: false }).eq('slug', slug).eq('is_active', true);
    const { data: inserted, error } = await admin.from('legal_documents').insert({
        slug, title: title.trim(), body_markdown, version: nextVersion,
        is_active: true, effective_from: new Date().toISOString(), created_by: user.id,
    }).select('*').maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, data: inserted };
}

function bumpVersion(v) {
    const m = /^v(\d+)\.(\d+)$/.exec(v || '');
    if (!m) return 'v1.1';
    let major = parseInt(m[1], 10), minor = parseInt(m[2], 10) + 1;
    return `v${major}.${minor}`;
}
