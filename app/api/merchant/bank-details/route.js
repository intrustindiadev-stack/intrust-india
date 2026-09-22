import { createAdminClient } from '@/lib/supabaseServer';
import { requireMerchantSubscription } from '@/lib/merchant/requireSubscription';
import { NextResponse } from 'next/server';
import { sprintVerify } from '@/lib/sprintVerify';

// Indian IFSC: 4 alphabetic bank code + '0' + 6 alphanumeric branch code.
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// Bank account numbers are 6-20 digits (no spaces / dashes).
const ACCOUNT_NUMBER_REGEX = /^[0-9]{6,20}$/;

const norm = (v) => (typeof v === 'string' ? v.trim() : '');

export async function POST(request) {
    try {
        const subResult = await requireMerchantSubscription(request);
        if (!subResult.ok) return subResult.response;
        const { user, merchant, admin } = subResult;

        const body = await request.json();
        const {
            bank_account_name,
            bank_account_number,
            bank_ifsc_code,
            bank_name
        } = body;

        const accountHolderName = norm(bank_account_name);
        const accountNumber = norm(bank_account_number).replace(/[\s-]+/g, '');
        const ifscCode = norm(bank_ifsc_code).toUpperCase();
        const bankName = norm(bank_name);

        // ── Server-side validation ───────────────────────────────────────────
        // Never trust the client form: the penny-drop API is a paid call and the
        // merchant panel is reachable straight after approval.
        if (!accountHolderName || !accountNumber || !ifscCode) {
            return NextResponse.json(
                { error: 'Missing required bank details. Account holder name, account number and IFSC code are all required.' },
                { status: 400 }
            );
        }

        if (!ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
            return NextResponse.json(
                { error: 'Invalid account number. Enter 6-20 digits with no spaces or dashes.' },
                { status: 400 }
            );
        }

        if (!IFSC_REGEX.test(ifscCode)) {
            return NextResponse.json(
                { error: 'Invalid IFSC code. Expected format like SBIN0001234.' },
                { status: 400 }
            );
        }

        // ── Persist the submission ───────────────────────────────────────────
        // Saving new details always invalidates any previous approval, and the
        // explicit 'pending' flag is what surfaces this row in the admin
        // verification queue (bank_verified = false alone cannot distinguish
        // "never submitted" from "awaiting review").
        const payload = {
            bank_account_name: accountHolderName,
            bank_account_number: accountNumber,
            bank_ifsc_code: ifscCode,
            bank_name: bankName || null,
            bank_data: {
                account_holder_name: accountHolderName,
                account_number: accountNumber,
                ifsc: ifscCode,
                bank_name: bankName || null,
            },
            bank_verified: false,
            bank_verification_status: 'pending',
            updated_at: new Date().toISOString()
        };

        const { data: updatedMerchant, error: updateError } = await admin
            .from('merchants')
            .update(payload)
            .eq('id', merchant.id)
            .select('id, business_name')
            .single();

        if (updateError) throw updateError;

        const businessName = updatedMerchant?.business_name || 'A merchant';

        // ── Automated penny-drop (best effort — never blocks the submission) ──
        // If the registry confirms the account we can flip bank_verified to true
        // immediately, which unblocks payouts without an admin touching it.
        // Anything else (rejection, outage, or 'manual_review') leaves the row as
        // 'pending' so it still lands in the admin queue.
        let autoVerified = false;
        let verificationMessage = 'Awaiting admin verification.';

        try {
            const bypassEnabled = process.env.NODE_ENV !== 'production'
                && process.env.ENABLE_VERIFICATION_BYPASS === 'true';

            const result = bypassEnabled
                ? {
                    valid: true,
                    message: 'Bank Verified (Local Bypass Enabled)',
                    data: { account_name: accountHolderName },
                }
                : await sprintVerify.verifyBank(accountNumber, ifscCode);

            if (result?.valid === true) {
                const registeredName = result.data?.account_name || result.data?.clientName || null;

                const { error: verifyError } = await admin
                    .from('merchants')
                    .update({
                        bank_verified: true,
                        bank_verification_status: 'verified',
                        bank_data: {
                            ...payload.bank_data,
                            verified_via: bypassEnabled ? 'bypass' : 'penny_drop',
                            verified_at: new Date().toISOString(),
                            registered_name: registeredName,
                        },
                    })
                    .eq('id', merchant.id);

                if (verifyError) {
                    // The submission is still valid and pending — an admin can
                    // complete the verification manually.
                    console.error('[BankDetails] Auto-verify write failed:', verifyError);
                    verificationMessage = 'Saved. Automatic verification could not be recorded, pending admin review.';
                } else {
                    autoVerified = true;
                    verificationMessage = 'Bank details verified automatically.';
                }
            } else {
                // valid === false (registry rejected) or 'manual_review' (outage):
                // keep 'pending' so an admin reviews it. We never auto-mark a
                // submission as failed — that could lock out a legitimate merchant
                // on a transient upstream error.
                verificationMessage = result?.message
                    ? `Saved. ${result.message} — pending admin review.`
                    : 'Saved. Pending admin verification.';
            }
        } catch (verifyErr) {
            // A third-party outage must never lose the merchant's submission.
            console.error('[BankDetails] Penny-drop verification error:', verifyErr);
            verificationMessage = 'Saved. Automatic verification unavailable, pending admin review.';
        }

        // ── Notify admins about the submission ───────────────────────────────
        // Only worth alerting when a human actually has to do something: if the
        // penny-drop already verified the account there is nothing to review.
        if (!autoVerified) {
            try {
                const { data: adminProfiles } = await admin
                    .from('user_profiles')
                    .select('id')
                    .in('role', ['admin', 'super_admin']);

                if (adminProfiles && adminProfiles.length > 0) {
                    const adminNotifs = adminProfiles.map((ap) => ({
                        user_id: ap.id,
                        title: 'Bank Details Updated 🏦',
                        body: `${businessName} submitted bank details. Verification required.`,
                        type: 'info',
                        reference_type: 'bank_verification',
                        reference_id: merchant.id
                    }));
                    const { error: notifInsertError } = await admin.from('notifications').insert(adminNotifs);
                    if (notifInsertError) console.error('[BankNotif] Admin insert failed:', notifInsertError);
                }
            } catch (notifError) {
                console.error('[BankNotif Error]:', notifError);
            }
        } else {
            try {
                await admin.from('notifications').insert({
                    user_id: user.id,
                    title: 'Bank Account Verified ✅',
                    body: 'Your bank account was verified automatically. You can now request withdrawals from your wallet.',
                    type: 'success',
                    reference_type: 'bank_verification',
                    reference_id: merchant.id,
                });
            } catch (notifError) {
                console.error('[BankNotif] Merchant insert failed:', notifError);
            }
        }

        return NextResponse.json({
            success: true,
            bank_verified: autoVerified,
            bank_verification_status: autoVerified ? 'verified' : 'pending',
            message: verificationMessage,
        });
    } catch (error) {
        console.error('[BankDetails API Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
