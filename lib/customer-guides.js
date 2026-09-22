// Shared customer panel guides — fullscreen GuideInfoModal content.
export const CUSTOMER_GUIDES = {
    '/dashboard': {
        title: 'Dashboard',
        overview: 'Your home: wallet, orders, rewards and today’s earning shortcuts.',
        keyActions: [
            { label: 'Check wallet', description: 'Top card shows balance; tap to open full wallet.' },
            { label: 'Track orders', description: 'Active orders snapshot shows live delivery status.' },
            { label: 'Earn today', description: 'Quiz + share shortcuts earn cashback in minutes.' },
        ],
        glossary: [],
        tips: ['Pull down to refresh — data stays cached for instant back-navigation.'],
    },
    '/shop': {
        title: 'Shop',
        overview: 'Verified stores and deals near you with fast filters.',
        keyActions: [
            { label: 'Search', description: 'Type to filter products instantly.' },
            { label: 'Wishlist', description: 'Heart any product to save it for later.' },
        ],
        glossary: [],
        tips: ['Use category pills to narrow results without reloads.'],
    },
    '/orders': {
        title: 'Orders',
        overview: 'Every purchase with live tracking and reorder in one tap.',
        keyActions: [
            { label: 'Track', description: 'Tap an order to see courier status and AWB.' },
            { label: 'Reorder', description: 'Repeat a past order without re-adding items.' },
        ],
        glossary: [],
        tips: ['Cancelled amounts return to your wallet automatically.'],
    },
    '/wallet': {
        title: 'Wallet',
        overview: 'Balance, cashback credits and passbook in one place.',
        keyActions: [
            { label: 'Check balance', description: 'Top card is always live.' },
            { label: 'Passbook', description: 'Every credit and debit with reference.' },
        ],
        glossary: [],
        tips: ['Marketing cashback appears here within seconds of approval.'],
    },
    '/profile': {
        title: 'Profile & Settings',
        overview: 'Your identity, KYC, contact details and preferences — all in one place.',
        keyActions: [
            { label: 'Edit details', description: 'Tap a field to update name, phone or email.' },
            { label: 'KYC status', description: 'Verified badge unlocks higher wallet limits.' },
            { label: 'Wallet shortcut', description: 'Financial snapshot links straight to wallet & store credit.' },
        ],
        glossary: [],
        tips: ['Keep your phone current — delivery and OTP depend on it.'],
    },
    '/refer': {
        title: 'Refer & Earn',
        overview: 'Share your code, earn coins when friends join and transact.',
        keyActions: [
            { label: 'Copy code', description: 'One tap copies your invite link to clipboard.' },
            { label: 'Share', description: 'Send via WhatsApp or any social app.' },
            { label: 'Track network', description: 'See L1–L7 levels and coins earned live.' },
        ],
        glossary: [
            { term: 'Coins', badgeTone: 'amber', meaning: 'Reward currency — 100 coins = ₹1.' },
        ],
        tips: ['Deeper levels keep earning passively as your network shops.'],
    },
};
