import Link from 'next/link';

/**
 * Post-approval bank-details catch-up prompt.
 *
 * Bank details are OPTIONAL on the merchant application form, so a merchant can
 * be approved and land on the dashboard with no bank account on file. Payouts
 * stay blocked until an admin (or the automated penny-drop check) verifies the
 * account, so we surface the missing step prominently on the dashboard.
 *
 * Rendered by app/(merchant)/merchant/dashboard/page.jsx — kept hook-free so it
 * works inside that server component.
 */
export default function BankDetailsActionBanner({ bankAccountNumber, bankIfscCode, bankVerified }) {
    const hasBankDetails = Boolean(bankAccountNumber && bankIfscCode);

    // Nothing to prompt about: verified, or submitted and awaiting review.
    if (bankVerified || hasBankDetails) return null;

    return (
        <div className="rounded-3xl border-2 border-amber-400 bg-amber-400/10 p-5 sm:p-6 shadow-lg shadow-amber-500/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <span className="material-icons-round text-3xl text-amber-500 shrink-0">error_outline</span>
                    <div>
                        <p className="font-black text-sm sm:text-base text-amber-800 dark:text-amber-300">
                            Action Required: Add your bank details to enable payouts.
                        </p>
                        <p className="text-xs sm:text-sm text-amber-700/90 dark:text-amber-400/80 mt-1">
                            Your account is approved and the merchant panel is fully available. Withdrawals and settlements stay blocked until your bank details are verified.
                        </p>
                    </div>
                </div>
                <Link
                    href="/merchant/settings?tab=bank"
                    className="shrink-0 px-6 py-3 bg-[#D4AF37] text-[#020617] font-bold text-sm rounded-xl hover:opacity-90 transition-all gold-glow shadow-lg shadow-[#D4AF37]/20 text-center"
                >
                    Add Bank Details
                </Link>
            </div>
        </div>
    );
}
