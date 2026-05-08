import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const adminSupabase = createAdminClient();

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        // 2. Verify HR Manager or Admin Role
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !['hr_manager', 'admin', 'super_admin'].includes(userProfile?.role)) {
            return NextResponse.json({ error: 'Forbidden. HR Manager or Admin access required.' }, { status: 403 });
        }

        // 3. Get Request Data
        const body = await request.json();
        const { applicationId, stage, panelAccessGranted, offeredSalary, commissionPercent, joiningBonus, offerLetterNotes, interviewDate, interviewNotes } = body;

        if (!applicationId) {
            return NextResponse.json({ error: 'Missing applicationId.' }, { status: 400 });
        }

        // 4. Build updates
        const updates = {
            status: stage,
            panel_access_granted: panelAccessGranted || null,
            offered_salary: offeredSalary ? Number(offeredSalary) : null,
            commission_percent: commissionPercent ? Number(commissionPercent) : null,
            joining_bonus: joiningBonus ? Number(joiningBonus) : null,
            offer_letter_notes: offerLetterNotes || null,
            interview_date: interviewDate ? new Date(interviewDate).toISOString() : null,
            interview_notes: interviewNotes || null,
            hired_at: stage === 'hired' ? new Date().toISOString() : null,
        };

        const { data: updatedApp, error: updateError } = await adminSupabase
            .from('career_applications')
            .update(updates)
            .eq('id', applicationId)
            .select('id, full_name, role_category, career_job_roles(title)')
            .single();

        if (updateError || !updatedApp) {
            console.error('Error updating application:', updateError);
            return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 });
        }

        // 5. Notify Admins if hired
        if (stage === 'hired') {
            const { data: admins, error: adminsError } = await adminSupabase
                .from('user_profiles')
                .select('id')
                .in('role', ['admin', 'super_admin']);

            if (!adminsError && admins?.length > 0) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    title: 'New Hire Pending Approval',
                    body: `${updatedApp.full_name} has been marked as hired for ${updatedApp.career_job_roles?.title || updatedApp.role_category}. Panel access recommended: ${panelAccessGranted || 'None'}. Please review and grant the appropriate role.`,
                    type: 'info',
                    reference_type: 'hire_approval',
                    reference_id: updatedApp.id,
                    read: false
                }));

                await adminSupabase.from('notifications').insert(notifications);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error in hire-candidate:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
