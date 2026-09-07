import React from 'react';

// Mock react hooks
let mockOpen = false;
let mockNotifications = [];
let mockMounted = true;

jest.mock('react', () => {
    const actual = jest.requireActual('react');
    return {
        ...actual,
        useState: jest.fn((init) => {
            if (typeof init === 'boolean') {
                if (init === false) return [mockOpen, jest.fn()];
                return [mockMounted, jest.fn()];
            }
            if (Array.isArray(init)) return [mockNotifications, jest.fn()];
            if (typeof init === 'number') return [1, jest.fn()];
            if (typeof init === 'object' && init !== null) return [init, jest.fn()];
            return [init, jest.fn()];
        }),
        useEffect: jest.fn(() => {}),
        useCallback: jest.fn((fn) => fn),
        useRef: jest.fn((val) => ({ current: val })),
    };
});

jest.mock('react-dom', () => ({
    createPortal: (children) => children,
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

jest.mock('@/lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: jest.fn().mockResolvedValue({
                data: { session: { access_token: 'fake', user: { id: 'test' } } }
            }),
            refreshSession: jest.fn().mockResolvedValue({}),
        },
        channel: jest.fn(() => ({
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn().mockReturnThis(),
        })),
        removeChannel: jest.fn(),
    }
}));

import NotificationBell, { timeAgo } from '../components/notifications/NotificationBell';

describe('NotificationBell Component & timeAgo Helper', () => {
    beforeAll(() => {
        if (typeof global.document === 'undefined') {
            global.document = { body: {} };
        }
    });

    describe('timeAgo()', () => {
        test('returns empty string for null, undefined or empty input', () => {
            expect(timeAgo(null)).toBe('');
            expect(timeAgo(undefined)).toBe('');
            expect(timeAgo('')).toBe('');
        });

        test('returns Just now for invalid or future dates', () => {
            expect(timeAgo('not-a-date')).toBe('Just now');
            const futureDate = new Date(Date.now() + 60000).toISOString();
            expect(timeAgo(futureDate)).toBe('Just now');
        });

        test('returns Just now for timestamps under 60 seconds ago', () => {
            const date = new Date(Date.now() - 30 * 1000).toISOString();
            expect(timeAgo(date)).toBe('Just now');
        });

        test('returns relative minutes for under 60 minutes ago', () => {
            const date = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            expect(timeAgo(date)).toBe('15m ago');
        });

        test('returns relative hours for under 24 hours ago', () => {
            const date = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
            expect(timeAgo(date)).toBe('4h ago');
        });

        test('returns Yesterday for 1 day ago', () => {
            const date = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
            expect(timeAgo(date)).toBe('Yesterday');
        });

        test('returns relative days for 2-6 days ago', () => {
            const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
            expect(timeAgo(date)).toBe('3d ago');
        });

        test('returns formatted date for 7+ days ago', () => {
            const pastDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
            const formatted = timeAgo(pastDate.toISOString());
            expect(formatted).not.toBe('');
            expect(typeof formatted).toBe('string');
        });
    });

    describe('NotificationBell Rendering & Dropdown Evaluation', () => {
        beforeEach(() => {
            mockOpen = false;
            mockNotifications = [];
        });

        test('can render closed bell button', () => {
            const result = NotificationBell({ apiPath: '/api/merchant/notifications' });
            expect(result).toBeDefined();
        });

        test('can render open dropdown with notifications without throwing ReferenceError for timeAgo', () => {
            mockOpen = true;
            mockNotifications = [
                {
                    id: 'notif-1',
                    title: 'Merchant Order #999',
                    body: 'Customer placed a new store pickup order',
                    type: 'order',
                    reference_type: 'shopping_order',
                    read: false,
                    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                },
                {
                    id: 'notif-2',
                    title: 'Payout Processed',
                    body: '₹5,000 sent to your bank account',
                    type: 'success',
                    reference_type: 'payout_request',
                    read: true,
                    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                }
            ];

            let rendered;
            expect(() => {
                rendered = NotificationBell({ apiPath: '/api/merchant/notifications' });
            }).not.toThrow();

            expect(rendered).toBeDefined();
        });
    });
});
