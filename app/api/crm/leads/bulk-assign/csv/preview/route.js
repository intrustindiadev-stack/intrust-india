import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const adminClient = createAdminClient();
        const { assignments } = await request.json();

        if (!Array.isArray(assignments) || assignments.length === 0) {
            return NextResponse.json({ error: 'No assignments provided' }, { status: 400 });
        }

        const uniqueEmails = [...new Set(assignments.map(a => a.employee_email))];
        const uniqueLeadIds = [...new Set(assignments.map(a => a.lead_id))];

        // Fetch employees
        const { data: users } = await adminClient
            .from('user_profiles')
            .select('id, email, role, is_active')
            .in('email', uniqueEmails);
            
        const userMap = {};
        (users || []).forEach(u => userMap[u.email] = u);

        // Fetch leads to verify they exist and aren't archived
        const { data: leads } = await adminClient
            .from('crm_leads')
            .select('id')
            .in('id', uniqueLeadIds)
            .is('archived_at', null);
            
        const leadSet = new Set((leads || []).map(l => l.id));

        const errors = [];
        let valid_count = 0;
        let invalid_count = 0;
        const valid_assignments = [];

        // Validate each row
        for (const a of assignments) {
            const { lead_id, employee_email } = a;
            
            if (!leadSet.has(lead_id)) {
                errors.push(`Lead ${lead_id} not found or is archived.`);
                invalid_count++;
                continue;
            }

            const emp = userMap[employee_email];
            if (!emp) {
                errors.push(`Employee ${employee_email} not found.`);
                invalid_count++;
                continue;
            }
            if (!emp.is_active) {
                errors.push(`Employee ${employee_email} is not active.`);
                invalid_count++;
                continue;
            }
            if (!['relationship_exec', 'relationship_manager', 'sales_exec', 'sales_manager', 'admin', 'super_admin'].includes(emp.role)) {
                errors.push(`Employee ${employee_email} does not have a CRM sales/relationship role.`);
                invalid_count++;
                continue;
            }

            valid_assignments.push({ lead_id, newRepId: emp.id });
            valid_count++;
        }

        return NextResponse.json({
            valid_count,
            invalid_count,
            errors,
            valid_assignments
        });

    } catch (err) {
        console.error('[Bulk Assign Preview Error]', err);
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
    }
}
