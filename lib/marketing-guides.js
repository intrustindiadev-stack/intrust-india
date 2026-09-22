// Shared marketing panel guides — fullscreen GuideInfoModal content.
// Keep entries short, simple, user-friendly.
export const MARKETING_GUIDES = {
    '/marketing': {
        title: 'Marketing Overview',
        overview: 'Your growth home: shares, clicks, orders, streak and today’s target in one clean view.',
        keyActions: [
            { label: 'Check today’s target', description: 'Top card shows your nearest milestone and % complete.' },
            { label: 'Share a product', description: 'Open Products, tap Share, send on WhatsApp. Cashback tracks automatically.' },
            { label: 'Play daily quiz', description: 'One play per day protects your streak and unlocks rewards.' },
        ],
        glossary: [
            { term: 'Shares', badgeTone: 'green', meaning: 'Product links you created and sent.' },
            { term: 'Clicks', badgeTone: 'slate', meaning: 'Friends who opened your link.' },
            { term: 'Orders', badgeTone: 'indigo', meaning: 'Purchases completed from your links.' },
        ],
        tips: ['Share 1 product daily to keep momentum. Quality beats quantity.'],
    },
    '/marketing/products': {
        title: 'Product Marketing',
        overview: 'Pick platform or your own products, share with one tap, watch clicks turn into cashback.',
        keyActions: [
            { label: 'Search or filter', description: 'Type 2+ letters; results filter instantly without reload.' },
            { label: 'Share', description: 'Tap Share. Your code is attached automatically.' },
            { label: 'Track', description: 'Shares, clicks and orders update on the card after each share.' },
        ],
        glossary: [
            { term: 'Promo cashback', badgeTone: 'green', meaning: 'Wallet credit you earn per verified order.' },
            { term: 'My products', badgeTone: 'indigo', meaning: 'Merchant inventory linked to your store.' },
        ],
        tips: ['Use the product image + price in your message for higher clicks.'],
    },
    '/marketing/daily-challenge': {
        title: 'Daily Challenge',
        overview: '10 questions daily. Correct answers earn cashback and protect your streak.',
        keyActions: [
            { label: 'Start quiz', description: 'One attempt per IST day. Answer all 10 to finish.' },
            { label: 'Streak freeze', description: 'Miss a day and your monthly freeze shields the streak automatically.' },
            { label: 'View sponsor', description: 'Top billboard shows today’s featured merchant.' },
        ],
        glossary: [
            { term: 'Streak', badgeTone: 'amber', meaning: 'Consecutive days played. Higher streak = bigger milestones.' },
            { term: 'Freeze', badgeTone: 'slate', meaning: 'One free shield renewed monthly.' },
        ],
        tips: ['Play before midnight IST — the day resets at 00:00 IST sharp.'],
    },
    '/marketing/targets': {
        title: 'Targets & Gifts',
        overview: 'Complete milestones for guaranteed cashback or mystery gifts to your doorstep.',
        keyActions: [
            { label: 'Track progress', description: 'Each card shows live X/Y progress and % bar.' },
            { label: 'Claim', description: 'When 100%, tap Claim. Cashback credits instantly; gifts ask address.' },
            { label: 'Track delivery', description: 'Claimed gifts appear below with pending to delivered status.' },
        ],
        glossary: [
            { term: 'Cashback', badgeTone: 'green', meaning: 'Instant wallet credit on claim.' },
            { term: 'Physical gift', badgeTone: 'amber', meaning: 'Ships free; tracking appears after dispatch.' },
            { term: 'Claimed', badgeTone: 'slate', meaning: 'Already redeemed — one claim per target.' },
        ],
        tips: ['Nearest-to-complete target is pinned on top — finish it first.'],
    },
    '/marketing/transactions': {
        title: 'Transactions',
        overview: 'Every marketing credit and sponsorship debit, straight from your wallet ledger.',
        keyActions: [
            { label: 'Filter', description: 'All / Credits / Debits pills filter instantly.' },
            { label: 'Search', description: 'Type description or amount to find any entry.' },
        ],
        glossary: [
            { term: 'CREDIT', badgeTone: 'green', meaning: 'Money added to your wallet.' },
            { term: 'DEBIT', badgeTone: 'red', meaning: 'Money spent (e.g. sponsorship).' },
        ],
        tips: ['Tap a row to see the linked campaign or order reference.'],
    },
    '/marketing/analytics': {
        title: 'Analytics',
        overview: 'What’s working: shares, clicks, orders and channel split across 7/30/90 days.',
        keyActions: [
            { label: 'Change range', description: '7d for this week, 30d for trends, 90d for season view.' },
            { label: 'Read channels', description: 'WhatsApp vs Instagram vs others shows where to double down.' },
        ],
        glossary: [
            { term: 'Conversion %', badgeTone: 'indigo', meaning: 'Orders divided by clicks. Above 3% is strong.' },
        ],
        tips: ['If clicks are high but orders low, try a different product image.'],
    },
};
