import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

const BASE_URL = process.env.OMNIFLOW_BASE_URL;
const TOKEN = process.env.OMNIFLOW_API_TOKEN;

/**
 * Parses the Omniflow/Meta template components array to extract:
 * - body text string
 * - ordered list of variables inferred from {{N}} tokens
 */
function parseComponents(components = []) {
    let bodyText = '';
    let headerText = '';
    let footerText = '';
    const variables = [];

    for (const comp of components) {
        const type = comp.type?.toLowerCase();

        if (type === 'body') {
            bodyText = comp.text || '';
            // Extract {{N}} placeholders in order
            const matches = [];
            const re = /\{\{(\d+)\}\}/g;
            let m;
            while ((m = re.exec(bodyText)) !== null) {
                const pos = parseInt(m[1], 10);
                if (!matches.includes(pos)) matches.push(pos);
            }
            matches.sort((a, b) => a - b).forEach((pos, idx) => {
                variables.push({
                    key: `var_${pos}`,
                    position: pos,
                    placeholderToken: `{{${pos}}}`,
                    label: `Variable ${pos}`,
                    placeholder: `Enter value for {{${pos}}}`,
                    required: true,
                    defaultFromContact: null
                });
            });
        } else if (type === 'header') {
            headerText = comp.text || '';
        } else if (type === 'footer') {
            footerText = comp.text || '';
        }
    }

    return { bodyText, headerText, footerText, variables };
}

/**
 * Normalizes a raw Omniflow template object into the CRM UI model.
 */
function normalizeOmniflowTemplate(raw) {
    const { bodyText, variables } = parseComponents(raw.components || []);

    // Build a human-readable title from the template name
    const title = (raw.name || '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

    return {
        id: raw.id || raw.name,
        name: raw.name,
        title: title || raw.name,
        description: raw.description || '',
        text: bodyText,
        language: raw.language || 'en',
        category: (raw.category || 'UTILITY').toUpperCase(),
        status: (raw.status || '').toUpperCase(),
        variables
    };
}

/**
 * Fallback static CRM templates (shown if Omniflow is unreachable or returns no approved templates).
 */
const FALLBACK_CRM_TEMPLATES = [
    {
        id: 'crm_lead_followup_v1',
        name: 'crm_lead_followup',
        title: 'Lead Follow-up',
        description: 'Follow up with a lead regarding their inquiry or interest.',
        language: 'en',
        category: 'UTILITY',
        status: 'APPROVED',
        text: 'Hello {{1}}, thank you for reaching out to Intrust India. I wanted to check in regarding your inquiry about {{2}}. Please let us know a convenient time to discuss further.',
        variables: [
            { key: 'name', position: 1, placeholderToken: '{{1}}', label: 'Contact Name', placeholder: 'e.g. John Doe', defaultFromContact: 'contact_name', required: true },
            { key: 'topic', position: 2, placeholderToken: '{{2}}', label: 'Inquiry Topic / Service', placeholder: 'e.g. Commercial Loan / Merchant Account', required: true }
        ]
    },
    {
        id: 'crm_meeting_reminder_v1',
        name: 'crm_meeting_reminder',
        title: 'Meeting / Call Reminder',
        description: 'Remind a contact about an upcoming scheduled call or meeting.',
        language: 'en',
        category: 'UTILITY',
        status: 'APPROVED',
        text: 'Hi {{1}}, this is a friendly reminder from Intrust India about our call scheduled for {{2}} at {{3}}. Reply to this message if you need to reschedule.',
        variables: [
            { key: 'name', position: 1, placeholderToken: '{{1}}', label: 'Contact Name', placeholder: 'e.g. Jane Smith', defaultFromContact: 'contact_name', required: true },
            { key: 'date', position: 2, placeholderToken: '{{2}}', label: 'Meeting Date', placeholder: 'e.g. Tomorrow, 10th Aug', required: true },
            { key: 'time', position: 3, placeholderToken: '{{3}}', label: 'Meeting Time', placeholder: 'e.g. 3:00 PM IST', required: true }
        ]
    }
];

/**
 * GET /api/whatsapp/templates
 * 
 * Fetches live approved WhatsApp templates from Omniflow (Meta).
 * Falls back to static CRM templates if Omniflow is unavailable.
 * Requires authenticated CRM session.
 */
export async function GET() {
    try {
        // Authenticate user (CRM agents only)
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: { type: 'unauthorized', message: 'Authentication required.' } },
                { status: 401 }
            );
        }

        // Try fetching live templates from Omniflow
        if (BASE_URL && TOKEN) {
            try {
                const omniRes = await fetch(`${BASE_URL}/api/wpbox/gettemplates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: TOKEN }),
                    // 8-second timeout
                    signal: AbortSignal.timeout(8000)
                });

                if (omniRes.ok) {
                    const omniData = await omniRes.json();
                    const rawTemplates = omniData?.templates || omniData?.data || omniData?.waba_templates || [];

                    if (Array.isArray(rawTemplates) && rawTemplates.length > 0) {
                        // Filter to only APPROVED templates
                        const approved = rawTemplates.filter(t =>
                            (t.status || '').toUpperCase() === 'APPROVED'
                        );

                        // Normalize and filter to those with a body text
                        const normalized = approved
                            .map(normalizeOmniflowTemplate)
                            .filter(t => t.text && t.text.trim().length > 0);

                        if (normalized.length > 0) {
                            return NextResponse.json({
                                success: true,
                                source: 'omniflow',
                                templates: normalized
                            });
                        }
                    }
                }
            } catch (omniErr) {
                console.warn('[whatsapp/templates] Omniflow fetch failed, using fallback:', omniErr.message);
            }
        }

        // Fallback to static templates
        return NextResponse.json({
            success: true,
            source: 'fallback',
            templates: FALLBACK_CRM_TEMPLATES
        });

    } catch (error) {
        console.error('[whatsapp/templates] Route error:', error);
        return NextResponse.json(
            { error: { type: 'server_error', message: error.message } },
            { status: 500 }
        );
    }
}
