import React from 'react';

// Mock react hooks
let mockOpen = false;
let mockNotifications = [];

jest.mock('react', () => {
    const actual = jest.requireActual('react');
    return {
        ...actual,
        useState: jest.fn((init) => {
            if (typeof init === 'boolean') {
                return [mockOpen, jest.fn()];
            }
            if (Array.isArray(init)) return [mockNotifications, jest.fn()];
            if (typeof init === 'number') return [2, jest.fn()];
            return [init, jest.fn()];
        }),
        useEffect: jest.fn(() => {}),
        useCallback: jest.fn((fn) => fn),
        useRef: jest.fn((val) => ({ current: val })),
    };
});

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

    describe('Global Portal Role Audit (Admin, Merchant, HRM, CRM, Employee)', () => {
        const portalApiPaths = [
            { role: 'Admin', path: '/api/admin/notifications' },
            { role: 'Merchant', path: '/api/merchant/notifications' },
            { role: 'CRM', path: '/api/crm/notifications' },
            { role: 'HRM', path: '/api/hrm/notifications' },
            { role: 'Employee', path: '/api/employee/notifications' },
            { role: 'Customer', path: '/api/notifications' },
        ];

        portalApiPaths.forEach(({ role, path }) => {
            test(`renders closed bell container and button for ${role} (${path})`, () => {
                mockOpen = false;
                mockNotifications = [];
                const tree = NotificationBell({ apiPath: path });
                expect(tree).toBeDefined();
                expect(tree.type).toBe('div');
                expect(tree.props.className).toContain('relative');

                // Inspect button child
                const [button, dropdown] = React.Children.toArray(tree.props.children);
                expect(button.type).toBe('button');
                expect(button.props.title).toBe('Notifications');
                expect(button.props['aria-expanded']).toBe(false);
                expect(dropdown).toBeFalsy();
            });

            test(`renders open dropdown with z-50 in-DOM for ${role} (${path})`, () => {
                mockOpen = true;
                mockNotifications = [
                    {
                        id: 'notif-1',
                        title: `${role} Alert`,
                        body: `Test notification for ${role}`,
                        type: 'info',
                        reference_type: 'order',
                        read: false,
                        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    }
                ];

                const tree = NotificationBell({ apiPath: path });
                expect(tree).toBeDefined();

                const [button, dropdown] = React.Children.toArray(tree.props.children);
                expect(button.props['aria-expanded']).toBe(true);
                expect(dropdown).toBeDefined();
                expect(dropdown.props.className).toContain('absolute');
                expect(dropdown.props.className).toContain('z-50');
            });
        });
    });
});
