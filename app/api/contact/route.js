import { createAdminClient } from '@/lib/supabaseServer';
import { sendContactNotification } from '@/lib/email/sendContactNotification';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// POST /api/contact — public contact-form submission
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTHS = {
    name: 200,
    email: 320,
    subject: 300,
    message: 5000,
};

/**
 * Trim every string value in an object (shallow).
 * @param {Record<string, unknown>} obj
 */
function trimStrings(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === 'string' ? v.trim() : v;
    }
    return out;
}

export async function POST(request) {
    try {
        // ── 1. Parse body ────────────────────────────────────────────────
        let raw;
        try {
            raw = await request.json();
        } catch {
            return NextResponse.json(
                { error: 'Invalid JSON body' },
                { status: 400 }
            );
        }

        const body = trimStrings(raw);
        const { name, email, subject, message, company } = body;

        // ── 2. Honeypot ──────────────────────────────────────────────────
        if (company) {
            // Bot filled the hidden field — silently succeed.
            return NextResponse.json({ success: true });
        }

        // ── 3. Validate required fields ──────────────────────────────────
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'All fields are required (name, email, subject, message).' },
                { status: 400 }
            );
        }

        // ── 4. Validate email format ─────────────────────────────────────
        const normalizedEmail = email.toLowerCase();
        if (!EMAIL_RE.test(normalizedEmail)) {
            return NextResponse.json(
                { error: 'Invalid email address.' },
                { status: 400 }
            );
        }

        // ── 5. Validate max lengths ──────────────────────────────────────
        for (const [field, max] of Object.entries(MAX_LENGTHS)) {
            if (body[field] && body[field].length > max) {
                return NextResponse.json(
                    { error: `${field} must be ${max} characters or fewer.` },
                    { status: 400 }
                );
            }
        }

        // ── 6. Capture request metadata ──────────────────────────────────
        const forwarded = request.headers.get('x-forwarded-for');
        const source_ip = forwarded
            ? forwarded.split(',')[0].trim()
            : request.headers.get('x-real-ip') || null;
        const user_agent = request.headers.get('user-agent') || null;

        // ── 7. Persist to database ───────────────────────────────────────
        const admin = createAdminClient();

        const { data: row, error: dbError } = await admin
            .from('contact_messages')
            .insert({
                name,
                email: normalizedEmail,
                subject,
                message,
                source_ip,
                user_agent,
            })
            .select('id')
            .maybeSingle();

        if (dbError) {
            console.error('[API] Contact DB Error:', dbError);
            return NextResponse.json(
                { error: 'Failed to submit contact form.' },
                { status: 500 }
            );
        }

        // ── 8. Send notification email (best-effort) ─────────────────────
        try {
            await sendContactNotification({
                name,
                email: normalizedEmail,
                subject,
                message,
            });

            // Mark email as sent
            await admin
                .from('contact_messages')
                .update({ email_sent: true })
                .eq('id', row.id);
        } catch (emailErr) {
            // Email failure must NOT fail the request — row already persists.
            console.error('[API] Contact Email Error:', emailErr);
        }

        // ── 9. Success ──────────────────────────────────────────────────
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[API] Contact Unexpected Error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
