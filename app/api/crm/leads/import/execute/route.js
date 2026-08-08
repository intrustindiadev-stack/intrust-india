import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const adminClient = createAdminClient();
        const { rows, allowUnresolved, batch_id, uploader_id } = await request.json();

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
        }

        const importBatchId = batch_id || crypto.randomUUID();
        const leadsToInsert = [];
        let skippedCount = 0;

        for (const row of rows) {
            // Only consider valid rows
            if (row.status !== 'valid') {
                skippedCount++;
                continue;
            }

            const isRoutable = row.routing?.matched;
            
            // If it's not routable and we don't allow unresolved, skip it
            if (!isRoutable && !allowUnresolved) {
                skippedCount++;
                continue;
            }

            const data = row.data;
            const leadRecord = {
                title: data.title || data.contact_name || 'Imported Lead',
                contact_name: data.contact_name || 'Unknown',
                phone: data.phone || null,
                email: data.email?.toLowerCase() || null,
                source: data.source || 'CSV Import',
                status: 'new',
                pipeline_stage: 'new',
                notes: data.notes || null,
                state: data.state || null,
                city: data.city || null,
                zone: data.zone || null,
                area: data.area || null,
                pincode: data.pincode || null,
                created_by: uploader_id,
                import_batch_id: importBatchId,
                source_system: data.source_system || 'csv_import',
                external_lead_id: data.external_lead_id || null
            };

            leadsToInsert.push(leadRecord);
        }

        if (leadsToInsert.length === 0) {
            return NextResponse.json({ error: 'No valid leads to insert' }, { status: 400 });
        }

        // Insert in batches of 1000
        const BATCH_SIZE = 1000;
        let insertedCount = 0;
        const failedRows = [];

        for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
            const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
            const { data, error } = await adminClient.from('crm_leads').insert(batch).select('id');
            
            if (error) {
                console.error(`Batch insert failed:`, error);
                failedRows.push(`Failed to insert batch starting at index ${i}: ${error.message}`);
                // Since this is all-or-nothing per chunk, we continue with next chunk but record failure
            } else {
                insertedCount += data.length;
            }
        }

        // Audit Log
        if (insertedCount > 0) {
            await adminClient.from('audit_logs_crm').insert({
                actor_id: uploader_id,
                action: 'BULK_IMPORT',
                table_name: 'crm_leads',
                new_data: {
                    batch_id: importBatchId,
                    attempted: leadsToInsert.length,
                    inserted: insertedCount,
                    skipped_by_user_or_validation: skippedCount,
                    failures: failedRows.length
                }
            });
        }

        return NextResponse.json({
            success: true,
            batch_id: importBatchId,
            inserted: insertedCount,
            failed: failedRows.length,
            failed_details: failedRows
        });

    } catch (err) {
        console.error('[Execute Import API Error]', err);
        return NextResponse.json({ error: 'Failed to execute import' }, { status: 500 });
    }
}
