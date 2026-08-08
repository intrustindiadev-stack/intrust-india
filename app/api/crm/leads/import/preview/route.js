import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { CrmLeadCsvRowSchema } from '@/lib/crm/validation';

export async function POST(request) {
    try {
        const adminClient = createAdminClient();
        const { leads } = await request.json();

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
        }
        
        if (leads.length > 10000) {
            return NextResponse.json({ error: 'Maximum 10,000 leads per batch' }, { status: 400 });
        }

        const results = [];
        const uniquePhones = new Set();
        const uniqueEmails = new Set();
        const locationsToPreview = [];

        // 1. Validate Schema and collect identifiers
        for (let i = 0; i < leads.length; i++) {
            const rawLead = leads[i];
            const parsed = CrmLeadCsvRowSchema.safeParse(rawLead);
            
            if (!parsed.success) {
                const issue = parsed.error.issues[0];
                results[i] = {
                    index: i,
                    status: 'invalid',
                    reason: `${issue.path[0]}: ${issue.message}`,
                    data: rawLead
                };
                continue;
            }

            const data = parsed.data;
            if (!data.contact_name && !data.phone && !data.email) {
                results[i] = { index: i, status: 'invalid', reason: 'Missing contact_name, phone, or email', data };
                continue;
            }

            if (data.phone) uniquePhones.add(data.phone);
            if (data.email) uniqueEmails.add(data.email.toLowerCase());

            results[i] = { index: i, status: 'valid', data };
        }

        // 2. Database Duplicate Check
        const existingPhones = new Set();
        const existingEmails = new Set();
        const existingExternalKeys = new Set(); // Stores `${source_system}:${external_lead_id}`

        if (uniquePhones.size > 0) {
            const { data: phoneMatches } = await adminClient
                .from('crm_leads')
                .select('phone')
                .in('phone', Array.from(uniquePhones));
            (phoneMatches || []).forEach(m => existingPhones.add(m.phone));
        }

        if (uniqueEmails.size > 0) {
            const { data: emailMatches } = await adminClient
                .from('crm_leads')
                .select('email')
                .in('email', Array.from(uniqueEmails));
            (emailMatches || []).forEach(m => existingEmails.add(m.email.toLowerCase()));
        }

        // Collect external lead IDs to query
        const externalIdPairs = results
            .filter(r => r.status === 'valid' && r.data.external_lead_id)
            .map(r => ({
                source_system: r.data.source_system || 'csv_import',
                external_lead_id: r.data.external_lead_id
            }));

        if (externalIdPairs.length > 0) {
            const extIds = [...new Set(externalIdPairs.map(p => p.external_lead_id))];
            const { data: extMatches } = await adminClient
                .from('crm_leads')
                .select('source_system, external_lead_id')
                .in('external_lead_id', extIds);

            (extMatches || []).forEach(m => {
                const sys = m.source_system || 'csv_import';
                existingExternalKeys.add(`${sys}:${m.external_lead_id}`);
            });
        }

        // Mark duplicates and collect locations for routing
        for (let i = 0; i < leads.length; i++) {
            const res = results[i];
            if (res.status === 'valid') {
                const sys = res.data.source_system || 'csv_import';
                const extKey = res.data.external_lead_id ? `${sys}:${res.data.external_lead_id}` : null;

                const isDupPhone = res.data.phone && existingPhones.has(res.data.phone);
                const isDupEmail = res.data.email && existingEmails.has(res.data.email.toLowerCase());
                const isDupExternal = extKey && existingExternalKeys.has(extKey);
                
                if (isDupPhone || isDupEmail || isDupExternal) {
                    res.status = 'duplicate';
                    if (isDupExternal) {
                        res.reason = 'Duplicate External Lead ID exists';
                    } else {
                        res.reason = 'Duplicate phone or email exists';
                    }
                } else {
                    // Valid and not duplicate, prepare for routing preview
                    const { pincode, zone, area, city, state } = res.data;
                    if (pincode || zone || area || city || state) {
                        locationsToPreview.push({ index: i, pincode, zone, area, city, state });
                    } else {
                        res.routing = { matched: false, reason: 'Missing Location' };
                    }
                }
            }
        }

        // 3. Routing Analysis
        if (locationsToPreview.length > 0) {
            const { data: routingResults, error: routingError } = await adminClient
                .rpc('crm_bulk_preview_team_for_location', { p_locations: locationsToPreview });
            
            if (!routingError && routingResults) {
                for (const routing of routingResults) {
                    const idx = routing.index;
                    if (routing.matched) {
                        results[idx].routing = {
                            matched: true,
                            team_id: routing.team_id,
                            team_name: routing.team_name,
                            match_type: routing.match_type
                        };
                    } else {
                        results[idx].routing = { matched: false, reason: 'No Service Coverage' };
                        // We do NOT change status to 'invalid' automatically, it becomes 'unroutable'
                    }
                }
            } else {
                console.error("Routing error:", routingError);
            }
        }

        // 4. Summarize
        const summary = {
            total: leads.length,
            ready: 0,
            invalid: 0,
            duplicate: 0,
            unroutable: 0,
            teamDistribution: {}
        };

        for (const res of results) {
            if (res.status === 'invalid') {
                summary.invalid++;
            } else if (res.status === 'duplicate') {
                summary.duplicate++;
            } else if (res.status === 'valid') {
                if (res.routing?.matched) {
                    summary.ready++;
                    const tname = res.routing.team_name || 'Unknown';
                    summary.teamDistribution[tname] = (summary.teamDistribution[tname] || 0) + 1;
                } else {
                    summary.unroutable++;
                }
            }
        }

        return NextResponse.json({ summary, rows: results });

    } catch (err) {
        console.error('[Preview API Error]', err);
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
    }
}
