import { LayoutDashboard, Users, Store, Sprout, Wallet, CreditCard, MessageSquare, Activity, ShieldCheck } from 'lucide-react';

export const PAGE_GUIDES = {
  '/admin': {
    title: 'Dashboard',
    icon: LayoutDashboard,
    overview: 'A real-time pulse of the platform: headline KPIs, recent activity, and items that need admin attention.',
    keyActions: [
      { label: 'Review KPI cards', description: 'Each card aggregates live platform data. Click a card to jump to its source page.' },
      { label: 'Triage alerts', description: 'Alerts are ordered by severity. Resolve the top item first.' },
    ],
    glossary: [
      { term: 'Active merchants', meaning: 'Merchants approved and able to transact right now.' },
      { term: 'Pending', badgeTone: 'amber', meaning: 'Awaiting admin review or document verification.' },
    ],
    tips: ['Use ⌘K to jump to any section without touching the sidebar.'],
  },
  '/admin/users': {
    title: 'Users',
    icon: Users,
    overview: 'Search, inspect, and manage every customer account on the platform.',
    keyActions: [
      { label: 'Search', description: 'Filter by name, email, or phone. Results update as you type.' },
      { label: 'Inspect a user', description: 'Open a row to view activity, orders, and linked merchant accounts.' },
    ],
    glossary: [
      { term: 'Active', badgeTone: 'green', meaning: 'Account in good standing.' },
      { term: 'Suspended', badgeTone: 'red', meaning: 'Login and transactions are blocked until reinstated.' },
    ],
    tips: ['Suspending a user does not delete their data — it is fully reversible.'],
  },
  '/admin/merchants': {
    title: 'Merchants',
    icon: Store,
    overview: 'The merchant directory: onboarding status, business details, and approval workflow.',
    keyActions: [
      { label: 'Filter by status', description: 'Use the status filter to isolate pending approvals.' },
      { label: 'Approve / reject', description: 'Open a pending merchant to review documents before deciding.' },
    ],
    glossary: [
      { term: 'Pending', badgeTone: 'amber', meaning: 'Submitted, awaiting admin review.' },
      { term: 'Approved', badgeTone: 'green', meaning: 'Verified and live on the platform.' },
      { term: 'Rejected', badgeTone: 'red', meaning: 'Application declined; the merchant can reapply.' },
    ],
    tips: ['Always check uploaded KYC documents before approving.'],
  },
  '/admin/investments': { // Changed from /admin/ai-grow since it uses investments path
    title: 'AI Grow',
    icon: Sprout,
    overview: 'Overview of the AI Grow investment program: participating merchants, pooled balances, and yield distribution health.',
    keyActions: [
      { label: 'Monitor the pool', description: 'Headline cards show total invested balance across all merchants.' },
      { label: 'Open a wallet', description: 'Jump to the Wallets page to adjust an individual merchant balance.' },
    ],
    glossary: [
      { term: 'Yield payout', meaning: 'Automated profit distribution credited to merchant wallets on schedule.' },
    ],
    tips: ['Manual adjustments are made from the AI Grow Wallets page, not here.'],
  },
  '/admin/ai-grow/wallets': {
    title: 'AI Grow Wallets',
    icon: Wallet,
    overview: 'View every AI Grow merchant investment wallet and make manual balance adjustments with a full audit trail.',
    keyActions: [
      { label: 'Adjust Balance', description: 'Credit, debit, or directly override a wallet balance. Every change requires a reason and is permanently logged.' },
      { label: 'History', description: 'Open the audit drawer to see every past adjustment, who made it, and why.' },
    ],
    glossary: [
      { term: 'Credit', badgeTone: 'green', meaning: 'Adds funds to the wallet.' },
      { term: 'Debit', badgeTone: 'red', meaning: 'Deducts funds. Cannot push a balance below zero.' },
      { term: 'Override', badgeTone: 'indigo', meaning: 'Sets the balance to an exact amount. Use with care.' },
      { term: 'Frozen', badgeTone: 'amber', meaning: 'Wallet cannot be adjusted until reactivated.' },
    ],
    tips: [
      'The projected new balance is shown live before you confirm — always sanity-check it.',
      'Adjustments are atomic and race-safe against automated yield payouts.',
    ],
  },
  '/admin/store-status': {
    title: 'Store Status',
    icon: Activity,
    overview: 'Manage store status and health metrics.',
    keyActions: [
      { label: 'Review status', description: 'Check the operational status of the store.' }
    ],
    glossary: [
      { term: 'Active', badgeTone: 'green', meaning: 'Store is fully operational.' },
      { term: 'Down', badgeTone: 'red', meaning: 'Store is experiencing issues.' },
    ],
    tips: ['Always monitor store status during peak hours.'],
  },
  '/admin/whatsapp-health': {
    title: 'WhatsApp Health',
    icon: MessageSquare,
    overview: 'Delivery health for outbound WhatsApp messaging: success rates, failures, and template status.',
    keyActions: [
      { label: 'Scan failure list', description: 'Failed messages show the error code from the provider.' },
      { label: 'Retry', description: 'Eligible failed messages can be re-queued from the row action.' },
    ],
    glossary: [
      { term: 'Delivered', badgeTone: 'green', meaning: 'Confirmed delivered to the recipient device.' },
      { term: 'Failed', badgeTone: 'red', meaning: 'Provider rejected or could not deliver the message.' },
      { term: 'Sent', badgeTone: 'slate', meaning: 'Handed to the provider, delivery not yet confirmed.' },
    ],
    tips: ['A sudden spike in failures usually means a template was paused — check template status first.'],
  },
  '/admin/roles': {
    title: 'Role Management',
    icon: ShieldCheck,
    overview: 'Control system access by assigning roles to users. Manage administrators, HR managers, and sales personnel.',
    keyActions: [
      { label: 'Search users', description: 'Find users by name, email, or phone number to quickly update their roles.' },
      { label: 'Update role', description: 'Select a new role from the dropdown. Changes take effect on the user\'s next page load.' },
    ],
    glossary: [
      { term: 'Super Admin', badgeTone: 'rose', meaning: 'Full system access. Can assign any role, including other Super Admins.' },
      { term: 'Admin', badgeTone: 'purple', meaning: 'Platform administrator. Cannot grant Super Admin privileges or remove their own admin access.' },
    ],
    tips: ['You cannot remove your own admin privileges to prevent accidental self-lockouts.'],
  },
};
