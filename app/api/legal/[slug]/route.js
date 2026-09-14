import { NextResponse } from 'next/server';
import { createStaticSupabaseClient } from '@/lib/supabaseServer';
import { LEGAL_DEFAULTS } from '@/lib/legalDefaults';

export async function GET(_req, { params }) {
    const { slug } = await params;
    if (!LEGAL_DEFAULTS[slug]) {
        return NextResponse.json({ success: false, error: 'Unknown document' }, { status: 404 });
    }
    try {
        const supabase = createStaticSupabaseClient();
        const { data, error } = await supabase
            .from('legal_documents')
            .select('slug,title,body_markdown,version,effective_from')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();
        if (!error && data) return NextResponse.json({ success: true, data });
    } catch (e) { console.warn('[api/legal] fallback', e?.message); }
    const fb = LEGAL_DEFAULTS[slug];
    return NextResponse.json({
        success: true,
        data: { slug, title: fb.title, body_markdown: fb.body, version: fb.version, effective_from: fb.effectiveFrom },
    });
}
