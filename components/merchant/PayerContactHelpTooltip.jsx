'use client';

export default function PayerContactHelpTooltip({ field = 'phone' }) {
    const message = field === 'email'
        ? 'Email must be a real, deliverable address. Test/example addresses are not accepted.'
        : 'Mobile must be a real 10-digit Indian number. Placeholder values like 9999999999 are not accepted by the payment gateway.';

    return (
        <span className="relative inline-flex group">
            <button
                type="button"
                aria-label={`${field === 'email' ? 'Email' : 'Mobile'} acceptance rules`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-black text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30"
            >
                ?
            </button>
            <span className="pointer-events-none absolute right-0 top-7 z-30 hidden w-64 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-relaxed text-white shadow-xl group-hover:block group-focus-within:block">
                {message}
            </span>
        </span>
    );
}
