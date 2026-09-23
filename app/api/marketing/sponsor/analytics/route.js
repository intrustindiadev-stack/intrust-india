import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Anonymous-safe beacon: records billboard IMPRESSION / PRODUCT_CLICK events
// for sponsorship analytics. Uses service-role key (no user auth required),
// but strictly validates payload to prevent junk writes.
const ALLOWED_TYPES = ['IMPRESSION', 'PRODUCT_CLICK'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

        const { sponsorship_id, event_type, product_id = null, visitor_id = null, metadata = {} } = body;

        if (!UUID_RE.test(String(sponsorship_id || ''))) {
            return NextResponse.json({ error: 'Invalid sponsorship_id' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(event_type)) {
            return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
        }
        if (product_id !== null && !UUID_RE.test(String(product_id))) {
            return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { persistSession: false } }
        );

        // sponsor_date + merchant_id are filled by the trg_fill_sponsorship_analytics_event
        // trigger from daily_challenge_sponsorships (sponsor_date is NOT NULL, and the
        // client must never be trusted to send it).
        const { error } = await supabase.from('sponsorship_analytics_events').insert({
            sponsorship_id,
            event_type,
            product_id,
            visitor_id: typeof visitor_id === 'string' && visitor_id ? visitor_id.slice(0, 64) : null,
            metadata
        });

        if (error) {
            console.error('[sponsorship-analytics] insert failed:', error.message);
            return NextResponse.json({ error: 'Insert failed' }, { status: 500 });
        }

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (err) {
        console.error('[sponsorship-analytics] error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
