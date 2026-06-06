import React from 'react';

// Mock react before importing components
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useState: jest.fn((init) => {
            if (Array.isArray(init)) {
                return [[], jest.fn()];
            }
            if (typeof init === 'boolean') {
                return [false, jest.fn()];
            }
            return [init, jest.fn()];
        }),
        useEffect: jest.fn(() => {}),
        useMemo: jest.fn((fn) => fn()),
        useCallback: jest.fn((fn) => fn),
        useRef: jest.fn((init) => ({ current: init })),
        useContext: jest.fn(() => ({}))
    };
});

import WishlistClient from '../app/(customer)/(protected)/wishlist/WishlistClient';
import OrdersClient from '../app/(customer)/(protected)/orders/OrdersClient';
import TransactionsPage from '../app/(customer)/(protected)/transactions/page';
import InventoryPage from '../app/(merchant)/merchant/inventory/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn()
    }),
    useSearchParams: () => ({
        get: jest.fn()
    }),
    usePathname: () => '/test',
    redirect: jest.fn()
}));

// Mock Auth Context
jest.mock('@/lib/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-uuid', email: 'test@example.com' },
        loading: false
    })
}));

// Mock Rewards Realtime
jest.mock('@/lib/contexts/RewardsRealtimeContext', () => ({
    useRewardsRealtime: () => ({
        unscratchedCards: [],
        lastArrival: null,
        markScratched: jest.fn()
    })
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Heart: () => 'HeartIcon',
    ShoppingCart: () => 'ShoppingCartIcon',
    Trash2: () => 'Trash2Icon',
    Package: () => 'PackageIcon',
    Loader2: () => 'Loader2Icon',
    Store: () => 'StoreIcon',
    ArrowLeft: () => 'ArrowLeftIcon',
    ShoppingBag: () => 'ShoppingBagIcon',
    Clock: () => 'ClockIcon',
    MapPin: () => 'MapPinIcon',
    X: () => 'XIcon',
    CheckCircle2: () => 'CheckCircle2Icon',
    TrendingUp: () => 'TrendingUpIcon',
    TrendingDown: () => 'TrendingDownIcon',
    Wallet: () => 'WalletIcon',
    Gift: () => 'GiftIcon',
    ArrowDownLeft: () => 'ArrowDownLeftIcon',
    ArrowUpRight: () => 'ArrowUpRightIcon',
    Search: () => 'SearchIcon',
    Filter: () => 'FilterIcon'
}));

// Mock Recharts
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="recharts-container">{children}</div>,
    AreaChart: ({ children }) => <div>{children}</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null
}));

// Mock components
jest.mock('@/components/layout/Navbar', () => () => 'Navbar');
jest.mock('@/components/layout/customer/CustomerBottomNav', () => () => 'CustomerBottomNav');
jest.mock('@/components/ui/ConfirmModal', () => () => 'ConfirmModal');
jest.mock('@/components/ui/OutOfStockBadge', () => () => 'OutOfStockBadge');
jest.mock('@/components/ui/OutOfStockOverlay', () => () => 'OutOfStockOverlay');
jest.mock('@/components/ui/NotifyMeButton', () => () => 'NotifyMeButton');
jest.mock('@/components/ui/ScratchCard', () => () => 'ScratchCard');
jest.mock('../app/(merchant)/merchant/inventory/InventoryTable', () => () => <div data-testid="inventory-table" />);

// Mock stock library
jest.mock('@/lib/shopping/stock', () => ({
    isPlatformProductOOS: jest.fn(() => false),
    isInventoryRowOOS: jest.fn(() => false)
}));

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => {
    return {
        supabase: {
            from: jest.fn(() => ({
                delete: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis()
            }))
        },
        createClient: jest.fn(() => ({
            from: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis()
            }))
        }))
    };
});

// Mock Supabase Server (for InventoryPage server component)
const mockSupabaseServer = {
    auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-merchant-user-id' } }, error: null })
    },
    from: jest.fn((table) => {
        const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            single: jest.fn()
        };
        
        chain.single.mockImplementation(async () => {
            if (table === 'user_profiles') {
                return { data: { role: 'merchant' }, error: null };
            }
            if (table === 'merchants') {
                return { data: { id: 'merchant-id', user_id: 'test-merchant-user-id' }, error: null };
            }
            return { data: null, error: null };
        });

        const response = { data: [], count: 0, error: null };
        chain.then = (onFulfilled) => Promise.resolve(response).then(onFulfilled);
        return chain;
    })
};

jest.mock('@/lib/supabaseServer', () => ({
    createServerSupabaseClient: jest.fn(() => Promise.resolve(mockSupabaseServer)),
    createAdminClient: jest.fn(() => mockSupabaseServer)
}));

// Helpers for element traversal
function resolveElement(element) {
    let current = element;
    while (current && typeof current.type === 'function') {
        try {
            // Do not execute Framer Motion components as they rely on React context internally
            if (current.type.name === 'AnimatePresence' || current.type.name === 'motion') {
                break;
            }
            current = current.type(current.props);
        } catch (e) {
            break;
        }
    }
    return current;
}

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

describe('UI-02: Empty State Illustrations Verification', () => {
    it('Wishlist Page: Renders empty state message when wishlist is empty', () => {
        const rendered = WishlistClient({ userId: 'u1', userEmail: 'u@e.com', initialItems: [] });
        
        const emptyHeader = findElement(rendered, (node) => 
            node.props && node.props.children === 'Your wishlist is empty'
        );
        expect(emptyHeader).not.toBeNull();
    });

    it('Orders Page: Renders empty state message when there are no orders', () => {
        const rendered = OrdersClient({ userId: 'u1' });

        const emptyHeader = findElement(rendered, (node) => 
            node.props && node.props.children === 'No orders found'
        );
        expect(emptyHeader).not.toBeNull();
    });

    it('Transactions Page: Renders empty state message when there is no activity', () => {
        const rendered = TransactionsPage();

        const emptyHeader = findElement(rendered, (node) => 
            node.props && node.props.children === 'No transactions found'
        );
        expect(emptyHeader).not.toBeNull();
    });

    it('Merchant Inventory Page: Renders empty state when inventory is empty', async () => {
        const rendered = await InventoryPage({ searchParams: Promise.resolve({ filter: 'all' }) });

        const emptyHeader = findElement(rendered, (node) => 
            node.props && node.props.children === 'No active coupons found'
        );
        expect(emptyHeader).not.toBeNull();
    });
});
