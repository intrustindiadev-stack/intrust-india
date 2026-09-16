import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { CandidateHireSchema } from '@/lib/hrm/validation';
import { checkRateLimit } from '@/lib/hrm/rateLimiter';
import { generateEmployeeCode } from '@/lib/hrm/employeeCode';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendHRMAlert } from '@/lib/email';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const adminSupabase = createAdminClient();

        // 1. Verify Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        // 2. Rate Limiting Check (30 requests per minute per user)
        const rateLimit = checkRateLimit(user.id, 30, 60000);
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': Math.ceil(rateLimit.resetMs / 1000).toString() } }
            );
        }

        // 3. Verify HR Manager or Admin Role
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !['hr', 'hr_manager', 'admin', 'super_admin'].includes(userProfile?.role)) {
            return NextResponse.json({ error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        // 4. Zod Schema Validation
        const rawBody = await request.json();
        const parsed = CandidateHireSchema.safeParse(rawBody);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.format() },
                { status: 400 }
            );
        }

        const {
            applicationId, stage, panelAccessGranted, offeredSalary,
            commissionPercent, joiningBonus, offerLetterNotes, interviewDate, interviewNotes,
            teamId, reportingManagerId, department
        } = parsed.data;

        // 5. Build updates
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
            .select('id, full_name, email, phone, city, role_category, career_job_roles(title)')
            .single();

        if (updateError || !updatedApp) {
            console.error('Error updating application:', updateError);
            return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 });
        }

        // 6. Notify Admins if hired and automate employee creation
        if (stage === 'hired') {
            // Generate a strong random password for onboarding
            const tempPassword = Math.random().toString(36).slice(-10) + 'A1!a';

            // A. Automate User Creation
            try {
                // Create auth user (this triggers the user_profiles creation automatically)
                const { data: authData, error: createUserError } = await adminSupabase.auth.admin.createUser({
                    email: updatedApp.email,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: {
                        full_name: updatedApp.full_name,
                        phone: updatedApp.phone,
                    }
                });

                if (createUserError) {
                    // Ignore if user already exists
                    console.error('Auth user creation error (may already exist):', createUserError);
                } else if (authData?.user) {
                    // Update the auto-generated user_profiles row with HRM data
                    // Badge via shared generator (lib/hrm/employeeCode.js) with retry on
                    // collision (partial unique index WHERE employee_id IS NOT NULL).
                    let empId = null;
                    for (let attempt = 0; attempt < 10; attempt++) {
                        const candidate = generateEmployeeCode();
                        const { data: empDup } = await adminSupabase.from('user_profiles').select('id').eq('employee_id', candidate).maybeSingle();
                        if (!empDup) { empId = candidate; break; }
                    }
                    if (!empId) {
                        console.error('hire-candidate: could not assign unique employee_id after 10 attempts');
                    } else {
                    
                    await adminSupabase.from('user_profiles').update({
                        employee_id: empId,
                        joining_date: new Date().toISOString().split('T')[0], // today
                        base_salary: offeredSalary ? Number(offeredSalary) : 0,
                        city: updatedApp.city || null,
                        department: department || updatedApp.role_category || 'other',
                        role: 'employee',
                        employment_type: 'full_time',
                        reporting_manager_id: reportingManagerId || null
                    }).eq('id', authData.user.id);
                    }

                    if (teamId) {
                        await adminSupabase.from('team_members').insert({
                            team_id: teamId,
                            user_id: authData.user.id
                        });
                    }

                    // C. Create Panel Access Request if needed
                    if (panelAccessGranted && panelAccessGranted !== 'employee') {
                        await adminSupabase.from('panel_access_requests').insert({
                            user_id: authData.user.id,
                            requested_role: panelAccessGranted,
                            department: department || updatedApp.role_category || 'other',
                            team_id: teamId || null,
                            reporting_manager_id: reportingManagerId || null,
                            requested_by: user.id,
                            status: 'pending'
                        });
                    }
                }
            } catch (authErr) {
                console.error('Failed to automate employee creation:', authErr);
            }

            // B. Notify Admins
            const { data: admins, error: adminsError } = await adminSupabase
                .from('user_profiles')
                .select('id')
                .in('role', ['admin', 'super_admin']);

            if (!adminsError && admins?.length > 0) {
                let notifications = [];
                if (panelAccessGranted && panelAccessGranted !== 'employee') {
                     notifications = admins.map(admin => ({
                        user_id: admin.id,
                        title: 'New Panel Access Request',
                        body: `${updatedApp.full_name} has requested access to the ${panelAccessGranted} panel. Please review and approve.`,
                        type: 'warning',
                        reference_type: 'panel_access_request',
                        reference_id: updatedApp.id,
                        read: false
                    }));
                } else {
                    notifications = admins.map(admin => ({
                        user_id: admin.id,
                        title: 'New Employee Hired & Created',
                        body: `${updatedApp.full_name} has been hired for ${updatedApp.career_job_roles?.title || updatedApp.role_category}. Their employee account has been created.`,
                        type: 'info',
                        reference_type: 'hire_approval',
                        reference_id: updatedApp.id,
                        read: false
                    }));
                }

                await adminSupabase.from('notifications').insert(notifications);
            }

            // Fire-and-forget onboarding welcome email to candidate
            if (updatedApp.email) {
                fireAndForgetEmail(async () => {
                    await sendHRMAlert({
                        type: 'candidate_hired',
                        to: updatedApp.email,
                        data: {
                            candidateName: updatedApp.full_name,
                            jobTitle: updatedApp.career_job_roles?.title || updatedApp.role_category,
                            department: department || updatedApp.role_category || 'General',
                            tempPassword,
                        },
                        actorId: user.id,
                        metadata: { applicationId },
                    });
                }, { category: 'hrm_hire', entityId: applicationId });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error in hire-candidate:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
