import React from 'react';

// Global hooks trackers
let mockGroupsState = [];
let mockSetGroups = jest.fn((val) => {
    mockGroupsState = val;
});
let mockLoadingState = true;
let mockSetLoading = jest.fn((val) => {
    mockLoadingState = val;
});

// Mock react module before importing OrdersClient
jest.mock('react', () => {
    const actualReact = jest.requireActual('react');
    return {
        ...actualReact,
        useState: jest.fn((init) => {
            if (Array.isArray(init)) {
                return [mockGroupsState, mockSetGroups];
            }
            if (init === true) {
                return [mockLoadingState, mockSetLoading];
            }
            return [init, jest.fn()];
        }),
        useEffect: jest.fn((effect) => effect()),
        useMemo: jest.fn((fn) => fn()),
        useRef: jest.fn((val) => ({ current: val })),
        useCallback: jest.fn((fn) => fn)
    };
});

import OrdersClient from '../app/(customer)/(protected)/orders/OrdersClient';
import { supabase } from '@/lib/supabaseClient';

// Mock Next.js navigation and contexts
jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: jest.fn(() => null)
    }),
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn()
    }),
    usePathname: () => '/orders'
}));

jest.mock('@/lib/contexts/RewardsRealtimeContext', () => ({
    useRewardsRealtime: () => ({
        unscratchedCards: [],
        lastArrival: null,
        markScratched: jest.fn()
    })
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }) => children
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Package: () => 'PackageIcon',
    ChevronRight: () => 'ChevronRightIcon',
    CheckCircle2: () => 'CheckCircle2Icon',
    ShoppingBag: () => 'ShoppingBagIcon',
    ExternalLink: () => 'ExternalLinkIcon',
    Store: () => 'StoreIcon',
    ArrowRight: () => 'ArrowRightIcon',
    Clock: () => 'ClockIcon',
    MapPin: () => 'MapPinIcon',
    X: () => 'XIcon'
}));

// Mock other UI components
jest.mock('@/components/ui/ScratchCard', () => () => 'ScratchCard');

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn()
    }))
}));

// Helper to recursively collect all status badge spans in the React element tree
function findStatusBadges(element, badges = []) {
    if (!element) return badges;
    if (
        element.type === 'span' &&
        element.props &&
        element.props.className &&
        element.props.className.includes('text-[10px]') &&
        element.props.className.includes('uppercase font-bold rounded')
    ) {
        badges.push({
            className: element.props.className,
            children: element.props.children
        });
    }
    if (element.props && element.props.children) {
        const children = React.Children.toArray(element.props.children);
        for (const child of children) {
            findStatusBadges(child, badges);
        }
    }
    return badges;
}

describe('CUST-02: Order status badges map to DB enum values', () => {
    let mockSupabaseInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGroupsState = [];
        mockLoadingState = true;

        mockSupabaseInstance = {
            from: jest.fn()
        };
        const { createClient } = require('@/lib/supabaseClient');
        createClient.mockReturnValue(mockSupabaseInstance);
    });

    it('should map all database delivery_status values to the correct CSS colors/labels and handle unknown statuses gracefully', async () => {
        // DB fixture matching all possible delivery_status enum values + an unknown one
        const mockOrdersList = [
            { id: 'order-1', created_at: '2026-06-06T10:00:00Z', delivery_status: 'delivered', total_amount_paise: 1000 },
            { id: 'order-2', created_at: '2026-06-06T10:00:00Z', delivery_status: 'shipped', total_amount_paise: 2000 },
            { id: 'order-3', created_at: '2026-06-06T10:00:00Z', delivery_status: 'packed', total_amount_paise: 3000 },
            { id: 'order-4', created_at: '2026-06-06T10:00:00Z', delivery_status: 'pending', total_amount_paise: 4000 },
            { id: 'order-5', created_at: '2026-06-06T10:00:00Z', delivery_status: 'cancelled', total_amount_paise: 5000 },
            { id: 'order-6', created_at: '2026-06-06T10:00:00Z', delivery_status: 'pending_credit', total_amount_paise: 6000 },
            { id: 'order-7', created_at: '2026-06-06T10:00:00Z', delivery_status: 'unknown_status_val', total_amount_paise: 7000 }, // Unknown status
            { id: 'order-8', created_at: '2026-06-06T10:00:00Z', delivery_status: null, total_amount_paise: 8000 } // Null status
        ];

        mockSupabaseInstance.from.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockOrdersList, error: null })
        }));

        // Render pass 1 (triggers useEffect -> fetchOrders)
        OrdersClient({ userId: 'test-user-id' });

        // Resolve promises (supabase fetch + setState)
        await new Promise((resolve) => setImmediate(resolve));
        mockLoadingState = false; // complete loading

        // Render pass 2 (renders list)
        const renderedJSX = OrdersClient({ userId: 'test-user-id' });

        // Traverse tree to find status badges
        const badges = findStatusBadges(renderedJSX);
        expect(badges).toHaveLength(mockOrdersList.length);

        // Verify status badge translations and color classes
        const badgeMap = {
            'delivered': { text: 'delivered', classPart: 'bg-green-100 text-green-800' },
            'shipped': { text: 'shipped', classPart: 'bg-blue-100 text-blue-800' },
            'packed': { text: 'packed', classPart: 'bg-orange-100 text-orange-800' },
            'pending': { text: 'pending', classPart: 'bg-yellow-100 text-yellow-800' },
            'cancelled': { text: 'cancelled', classPart: 'bg-yellow-100 text-yellow-800' },
            'pending_credit': { text: 'pending_credit', classPart: 'bg-yellow-100 text-yellow-800' },
            'unknown_status_val': { text: 'unknown_status_val', classPart: 'bg-yellow-100 text-yellow-800' },
            null: { text: 'pending', classPart: 'bg-yellow-100 text-yellow-800' } // Defaults to 'pending'
        };

        mockOrdersList.forEach((order, index) => {
            const badge = badges[index];
            const expected = badgeMap[order.delivery_status];

            // Assert exact label mapping (handling fallback to 'pending' when null)
            expect(badge.children).toBe(expected.text);

            // Assert correct color/theme class assignment without distortion or broken badges
            expect(badge.className).toContain(expected.classPart);
        });
    });
});
