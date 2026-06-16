import React from 'react';

// Global hooks trackers
let mockUserDataState = null;
let mockSetUserData = jest.fn((updater) => {
    if (typeof updater === 'function') {
        mockUserDataState = updater(mockUserDataState);
    } else {
        mockUserDataState = updater;
    }
});

// Mock react module before importing dashboard
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useCallback: jest.fn((fn) => fn),
        useState: jest.fn((init) => {
            if (init && typeof init === 'object' && 'walletBalance' in init) {
                if (!mockUserDataState) {
                    mockUserDataState = init;
                }
                return [mockUserDataState, mockSetUserData];
            }
            // Force loading to be false to bypass skeleton view
            if (init === true) {
                return [false, jest.fn()];
            }
            return [init, jest.fn()];
        }),
        useEffect: jest.fn((effect) => effect())
    };
});

import CustomerDashboardPage from '../app/(customer)/(protected)/dashboard/page';
import { supabase } from '@/lib/supabaseClient';

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
jest.mock('@/components/layout/Navbar', () => () => 'Navbar');
jest.mock('@/components/giftcards/Breadcrumbs', () => () => 'Breadcrumbs');
jest.mock('@/components/layout/customer/CustomerBottomNav', () => () => 'CustomerBottomNav');
jest.mock('@/components/customer/dashboard/DashboardStats', () => () => 'DashboardStats');
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
    const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis()
    };
    return {
        supabase: {
            from: jest.fn(),
            channel: jest.fn(() => mockChannel),
            removeChannel: jest.fn()
        }
    };
});

// Helper to recursively find the stats prop in the React element tree
function findStatsProp(element) {
    if (!element) return null;
    if (element.props && element.props.stats) {
        return element.props.stats;
    }
    if (element.props && element.props.children) {
        const children = React.Children.toArray(element.props.children);
        for (const child of children) {
            const found = findStatsProp(child);
            if (found) return found;
        }
    }
    return null;
}

describe('CUST-01: Dashboard wallet balance matches wallets table', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUserDataState = null;
    });

    it('should query DB customer_wallets table and format the balance exactly to 2 decimal places with rupee symbol', async () => {
        const testBalancePaise = 12345; // Represents ₹123.45 in the database
        const expectedFormattedBalance = '₹123.45';

        // Mock Supabase database responses
        const mockResponseMap = {
            user_profiles: { data: { full_name: 'Test User', role: 'customer' }, error: null },
            kyc_records: { data: null, error: null },
            customer_wallets: { data: { balance_paise: testBalancePaise }, error: null },
            orders: { data: [], error: null },
            customer_wallet_transactions: { data: [], error: null },
            merchants: { data: null, error: null },
            reward_points_balance: { data: { total_earned: 100 }, error: null }
        };

        supabase.from.mockImplementation((tableName) => {
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue(mockResponseMap[tableName] || { data: null, error: null }),
                maybeSingle: jest.fn().mockResolvedValue(mockResponseMap[tableName] || { data: null, error: null })
            };
        });

        // 1. Initial render call (starts the async fetches)
        CustomerDashboardPage();

        // Let the promises resolve
        await new Promise((resolve) => setImmediate(resolve));

        // 2. Assert that the database query targeted customer_wallets
        expect(supabase.from).toHaveBeenCalledWith('customer_wallets');

        // 3. Assert that state was updated with correct division of paise to rupees
        expect(mockUserDataState.walletBalance).toBe(123.45);

        // 4. Render again (re-render) with the updated state to get the updated stats
        const updatedJSX = CustomerDashboardPage();
        const stats = findStatsProp(updatedJSX);

        expect(stats).toBeDefined();
        const walletStat = stats.find(s => s.label === 'Wallet Balance');
        expect(walletStat).toBeDefined();
        expect(walletStat.value).toBe(expectedFormattedBalance);
    });

    it('should default to ₹0.00 when customer_wallets data does not exist in the DB', async () => {
        const mockResponseMap = {
            user_profiles: { data: { full_name: 'Test User', role: 'customer' }, error: null },
            kyc_records: { data: null, error: null },
            customer_wallets: { data: null, error: null }, // no wallet row
            orders: { data: [], error: null },
            customer_wallet_transactions: { data: [], error: null },
            merchants: { data: null, error: null },
            reward_points_balance: { data: null, error: null }
        };

        supabase.from.mockImplementation((tableName) => {
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue(mockResponseMap[tableName] || { data: null, error: null }),
                maybeSingle: jest.fn().mockResolvedValue(mockResponseMap[tableName] || { data: null, error: null })
            };
        });

        CustomerDashboardPage();

        await new Promise((resolve) => setImmediate(resolve));

        expect(mockUserDataState.walletBalance).toBe(0.00);

        const updatedJSX = CustomerDashboardPage();
        const stats = findStatsProp(updatedJSX);
        const walletStat = stats.find(s => s.label === 'Wallet Balance');
        expect(walletStat.value).toBe('₹0.00');
    });
});
