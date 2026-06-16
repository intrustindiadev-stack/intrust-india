import React from 'react';

// Global hooks trackers for testing
let mockLoadingState = true;
let mockUserDataState = {
    name: 'Test User',
    totalPurchases: 0,
    totalSavings: 0,
    kycStatus: 'pending',
    isGoldVerified: false,
    subscriptionExpiry: null,
    walletBalance: 0.00,
    activeCards: 0,
    completedOnboarding: true,
    referralCode: null,
    merchantStatus: null
};
let mockRecentActivityState = [];
let mockShowPackagesState = false;

// Mock react module before importing dashboard
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useCallback: jest.fn((fn) => fn),
        useState: jest.fn((init) => {
            if (init === true) {
                return [mockLoadingState, (val) => { mockLoadingState = val; }];
            }
            if (init && typeof init === 'object' && 'walletBalance' in init) {
                return [mockUserDataState, (val) => { mockUserDataState = typeof val === 'function' ? val(mockUserDataState) : val; }];
            }
            if (Array.isArray(init)) {
                return [mockRecentActivityState, (val) => { mockRecentActivityState = val; }];
            }
            if (init === false) {
                return [mockShowPackagesState, (val) => { mockShowPackagesState = val; }];
            }
            return [init, jest.fn()];
        }),
        useEffect: jest.fn(() => {}) // Bypass useEffect to prevent async fetch/polling loops in tests
    };
});

import CustomerDashboardPage from '../app/(customer)/(protected)/dashboard/page';
import MerchantLoading from '../app/(merchant)/merchant/loading';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn()
    })
}));

// Mock Auth Context
jest.mock('@/lib/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-uuid', email: 'test@example.com' },
        profile: { full_name: 'Test User', is_gold_verified: false },
        loading: false
    })
}));

// Mock custom hooks
jest.mock('@/hooks/usePayment', () => ({
    usePayment: () => ({
        initiatePayment: jest.fn(),
        loading: false
    })
}));

jest.mock('@/hooks/usePayerContact', () => ({
    usePayerContact: () => ({
        payerName: 'Test User',
        payerEmail: 'test@example.com',
        payerPhone: '9999999999'
    })
}));

jest.mock('@/hooks/useKYCPopup', () => ({
    useKYCPopup: () => ({
        isOpen: false,
        closeKYC: jest.fn()
    })
}));

jest.mock('@/hooks/useMerchantApplyPopup', () => ({
    useMerchantApplyPopup: () => ({
        isOpen: false,
        closeMerchantPopup: jest.fn()
    })
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>,
        h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
        p: ({ children, ...props }) => <p {...props}>{children}</p>
    },
    AnimatePresence: ({ children }) => children
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Wallet: () => 'WalletIcon',
    Package: () => 'PackageIcon',
    TrendingUp: () => 'TrendingUpIcon',
    Gift: () => 'GiftIcon',
    Heart: () => 'HeartIcon',
    Star: () => 'StarIcon',
    CheckCircle: () => 'CheckCircleIcon',
    Clock: () => 'ClockIcon',
    ChevronRight: () => 'ChevronRightIcon',
    Check: () => 'CheckIcon',
    Lock: () => 'LockIcon',
    Calendar: () => 'CalendarIcon',
    AlertCircle: () => 'AlertCircleIcon',
    X: () => 'XIcon',
    Shield: () => 'ShieldIcon',
    Sparkles: () => 'SparklesIcon',
    Sun: () => 'SunIcon',
    CreditCard: () => 'CreditCardIcon',
    ShoppingBag: () => 'ShoppingBagIcon',
    Zap: () => 'ZapIcon',
    Coins: () => 'CoinsIcon',
    Smartphone: () => 'SmartphoneIcon',
    ShoppingCart: () => 'ShoppingCartIcon'
}));

// Mock Dashboard Subcomponents to act as simple elements
jest.mock('@/components/layout/Navbar', () => () => <div data-testid="navbar" />);
jest.mock('@/components/giftcards/Breadcrumbs', () => () => 'Breadcrumbs');
jest.mock('@/components/layout/customer/CustomerBottomNav', () => () => <div data-testid="bottom-nav" />);
jest.mock('@/components/customer/dashboard/DashboardStats', () => () => <div data-testid="dashboard-stats" />);
jest.mock('@/components/customer/dashboard/QuickServices', () => () => 'QuickServices');
jest.mock('@/components/customer/dashboard/RecentActivity', () => () => 'RecentActivity');
jest.mock('@/components/customer/dashboard/QuickActions', () => () => 'QuickActions');
jest.mock('@/components/customer/RecentShoppingOrders', () => () => 'RecentShoppingOrders');
jest.mock('@/components/customer/dashboard/GoldSubscription', () => () => 'GoldSubscription');
jest.mock('@/components/customer/dashboard/ReferralGenzSection', () => () => 'ReferralGenzSection');
jest.mock('@/components/customer/dashboard/AdBannerCarousel', () => () => 'AdBannerCarousel');
jest.mock('@/components/customer/dashboard/DisclaimerNote', () => () => 'DisclaimerNote');
jest.mock('@/components/customer/dashboard/SolarPromoCard', () => () => 'SolarPromoCard');
jest.mock('@/components/customer/dashboard/CareerOpportunityCard', () => () => 'CareerOpportunityCard');
jest.mock('@/components/home/AdvertisementModal', () => () => 'AdvertisementModal');
jest.mock('@/components/kyc/KYCPopup', () => () => 'KYCPopup');
jest.mock('@/components/ui/FeatureAdvertiser', () => () => 'FeatureAdvertiser');
jest.mock('next/dynamic', () => () => () => 'DynamicComponent');

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => {
    const mockQueryChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
    };
    return {
        supabase: {
            from: jest.fn(() => mockQueryChain),
            channel: jest.fn(() => ({
                on: jest.fn().mockReturnThis(),
                subscribe: jest.fn().mockReturnThis()
            })),
            removeChannel: jest.fn()
        }
    };
});

// Helper to resolve functional component elements to host elements
function resolveElement(element) {
    let current = element;
    while (current && typeof current.type === 'function') {
        try {
            current = current.type(current.props);
        } catch (e) {
            // If it throws, break
            break;
        }
    }
    return current;
}

// Helper to recursively traverse React element tree to find nodes matching predicate
function findElement(element, predicate) {
    const resolved = resolveElement(element);
    if (!resolved) return null;
    if (predicate(resolved)) return resolved;
    if (resolved.props && resolved.props.children) {
        const children = React.Children.toArray(resolved.props.children);
        for (const child of children) {
            const found = findElement(child, predicate);
            if (found) return found;
        }
    }
    return null;
}

describe('UI-01: Dashboard Skeleton Loader Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLoadingState = true;
    });

    it('Customer Dashboard: Renders loading skeleton while data is fetching', () => {
        mockLoadingState = true;

        const rendered = CustomerDashboardPage();

        // 1. Verify a div with animate-pulse exists in the resolved tree
        const pulseDiv = findElement(rendered, (node) => 
            node.props && node.props.className && node.props.className.includes('animate-pulse')
        );
        expect(pulseDiv).not.toBeNull();

        // 2. Verify that the actual dashboard elements are NOT rendered yet (they are replaced by skeleton)
        const statsDiv = findElement(rendered, (node) => 
            node.props && node.props['data-testid'] === 'dashboard-stats'
        );
        expect(statsDiv).toBeNull();
    });

    it('Customer Dashboard: Renders main content and hides skeleton when loading is false', () => {
        mockLoadingState = false;

        const rendered = CustomerDashboardPage();

        // 1. Verify there is no div with animate-pulse matching the loading wrapper
        const pulseDiv = findElement(rendered, (node) => 
            node.props && node.props.className && node.props.className.includes('animate-pulse')
        );
        expect(pulseDiv).toBeNull();

        // 2. Verify that the actual dashboard components are rendered
        const statsDiv = findElement(rendered, (node) => 
            node.props && node.props['data-testid'] === 'dashboard-stats'
        );
        expect(statsDiv).not.toBeNull();
    });

    it('Merchant Dashboard: loading.jsx renders skeleton loader with animate-pulse', () => {
        const rendered = MerchantLoading();

        // Verify that the merchant skeleton contains animate-pulse style
        const pulseContainer = findElement(rendered, (node) => 
            node.props && node.props.className && node.props.className.includes('animate-pulse')
        );
        expect(pulseContainer).not.toBeNull();
    });
});
