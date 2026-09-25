/**
 * Central Configuration for InTrust Marketing Hub & Features
 * Allows controlling marketing hub availability across customer, merchant, and admin portals.
 */

// Global toggle: Set to true to put marketing hub / features in "Coming Soon" mode
export const IS_MARKETING_COMING_SOON = true;

export const MARKETING_COMING_SOON_CONFIG = {
    title: 'Marketing Hub',
    badge: 'Coming Soon',
    launchNotice: 'Feature Under Construction — Launching Soon',
    headline: 'We Are Crafting Something Amazing',
    subtitle: 'Daily Cash Challenges, Curated Deals, Streaks & Milestone Rewards are arriving soon!',
    description: 'We are engineering an extraordinary growth & rewards ecosystem on InTrust. Play daily interactive trivia, share high-converting store deals, protect your streaks with freeze passes, and claim direct wallet cashbacks alongside free physical gifts.',
    features: [
        {
            title: 'Daily Trivia & Cash Quiz',
            desc: '10 daily brainteasers across business, tech, corporate history & general knowledge with instant wallet cash.',
            icon: 'Trophy',
            tag: 'Win ₹ Daily',
            color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-500'
        },
        {
            title: 'Promote & Earn Viral Deals',
            desc: 'Share verified products from InTrust Mart with unique links and earn instant promotional cashback on every order.',
            icon: 'ShoppingBag',
            tag: 'Instant Cash',
            color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-500'
        },
        {
            title: 'Mystery Milestone Gifts',
            desc: 'Hit promotional and streak milestones to unlock physical prizes: ANC earbuds, smartwatches & 24K gold coins.',
            icon: 'Gift',
            tag: 'Free Gifts',
            color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-500'
        },
        {
            title: 'Prime Billboard Sponsorship',
            desc: 'Merchants can sponsor daily quiz slots to showcase store branding & 4 featured products to thousands of active shoppers.',
            icon: 'Store',
            tag: 'For Merchants',
            color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-500'
        }
    ]
};
