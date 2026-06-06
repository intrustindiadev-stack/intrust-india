import React from 'react';
import MerchantRootLayout from '../app/(merchant)/merchant/layout';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Mock navigation to throw redirect errors to halt execution
jest.mock('next/navigation', () => ({
    redirect: jest.fn((path) => {
        const err = new Error('NEXT_REDIRECT');
        err.digest = `NEXT_REDIRECT;307;${path};`;
        throw err;
    })
}));

jest.mock('next/headers', () => {
    const mockHeaders = {
        get: jest.fn().mockReturnValue('')
    };
    return {
        headers: jest.fn().mockResolvedValue(mockHeaders)
    };
});

// Mock Supabase server helper
jest.mock('@/lib/supabaseServer', () => ({
    createServerSupabaseClient: jest.fn(),
    createAdminClient: jest.fn()
}));

// Mock layout components to prevent browser/rendering issues in node environment
jest.mock('@/components/layout/merchant/MerchantLayout', () => ({ children }) => <div>{children}</div>);
jest.mock('@/components/layout/merchant/MerchantBottomNav', () => () => null);
jest.mock('@/components/chat/merchant/MerchantGlobalChat', () => () => null);
jest.mock('@/components/merchant/SubscriptionContext', () => ({
    SubscriptionProvider: ({ children }) => <div>{children}</div>
}));

jest.mock('@/app/(admin)/admin/settings/actions', () => ({
    getPricingSettings: jest.fn().mockResolvedValue({
        sub1m: 100,
        sub6m: 500,
        sub12m: 900
    })
}));

jest.mock('@/lib/merchant/getPayerContact', () => ({
    getPayerContact: jest.fn().mockReturnValue({ payerEmail: 'test@example.com', payerPhone: '123' })
}));

describe('Merchant Onboarding Status Guard (AUTH-02)', () => {
    let mockSupabase;
    let mockGetUser;
    let mockFrom;
    let mockSelect;
    let mockEq;
    let mockSingle;
    let mockMaybeSingle;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetUser = jest.fn();
        mockSingle = jest.fn();
        mockMaybeSingle = jest.fn();
        mockEq = jest.fn().mockReturnValue({
            single: mockSingle,
            maybeSingle: mockMaybeSingle
        });
        mockSelect = jest.fn().mockReturnValue({
            eq: mockEq
        });
        mockFrom = jest.fn().mockReturnValue({
            select: mockSelect
        });

        mockSupabase = {
            auth: {
                getUser: mockGetUser
            },
            from: mockFrom
        };

        createServerSupabaseClient.mockResolvedValue(mockSupabase);
    });

    async function assertRedirect(action, expectedPath) {
        try {
            await action();
            throw new Error('Expected redirect but layout rendered successfully');
        } catch (err) {
            if (err.message === 'NEXT_REDIRECT') {
                expect(redirect).toHaveBeenCalledWith(expectedPath);
            } else {
                throw err;
            }
        }
    }

    it('should redirect to /login if there is no user session', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        await assertRedirect(
            () => MerchantRootLayout({ children: 'content' }),
            '/login'
        );
    });

    it('should redirect to / if the user is a standard customer (wrong role)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSingle.mockResolvedValue({ data: { role: 'user' }, error: null });

        await assertRedirect(
            () => MerchantRootLayout({ children: 'content' }),
            '/'
        );
    });

    it('should redirect to /merchant-apply if user is merchant but has no merchants row', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSingle.mockResolvedValue({ data: { role: 'merchant' }, error: null });
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });

        await assertRedirect(
            () => MerchantRootLayout({ children: 'content' }),
            '/merchant-apply'
        );
    });

    it('should redirect to /merchant-status/pending when status is pending', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSingle.mockResolvedValue({ data: { role: 'merchant' }, error: null });
        mockMaybeSingle.mockResolvedValue({
            data: { status: 'pending', subscription_status: 'active', subscription_expires_at: '2099-01-01' },
            error: null
        });

        await assertRedirect(
            () => MerchantRootLayout({ children: 'content' }),
            '/merchant-status/pending'
        );
    });

    it('should redirect to /merchant-status/rejected when status is rejected', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSingle.mockResolvedValue({ data: { role: 'merchant' }, error: null });
        mockMaybeSingle.mockResolvedValue({
            data: { status: 'rejected', subscription_status: 'active', subscription_expires_at: '2099-01-01' },
            error: null
        });

        await assertRedirect(
            () => MerchantRootLayout({ children: 'content' }),
            '/merchant-status/rejected'
        );
    });

    it('should redirect to /merchant-status/suspended when status is suspended', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSingle.mockResolvedValue({ data: { role: 'merchant' }, error: null });
        mockMaybeSingle.mockResolvedValue({
            data: { status: 'suspended', subscription_status: 'active', subscription_expires_at: '2099-01-01' },
            error: null
        });

        await assertRedirect(
            () => MerchantRootLayout({ children: 'content' }),
            '/merchant-status/suspended'
        );
    });

    it('should NOT redirect and render the children when status is approved (control case)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
        mockSingle.mockResolvedValue({ data: { role: 'merchant' }, error: null });
        mockMaybeSingle.mockResolvedValue({
            data: { status: 'approved', subscription_status: 'active', subscription_expires_at: '2099-01-01' },
            error: null
        });

        const result = await MerchantRootLayout({ children: <div id="child">Child Content</div> });

        expect(redirect).not.toHaveBeenCalled();
        expect(result).toBeDefined();
    });
});
