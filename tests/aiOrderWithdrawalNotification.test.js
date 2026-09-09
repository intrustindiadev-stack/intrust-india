/**
 * tests/aiOrderWithdrawalNotification.test.js
 *
 * Tests for Admin Notifications on AI Orders Vault Withdrawal Requests:
 * 1. Branded email template generator (aiOrderWithdrawalNotificationTemplate)
 * 2. Withdrawal request route (POST /api/merchant/vault/withdraw) creating admin notifications & dispatching alerts
 * 3. Withdrawal approval route (POST /api/admin/ai-orders/withdrawals/[id]/approve) notifying merchant
 * 4. Withdrawal rejection route (POST /api/admin/ai-orders/withdrawals/[id]/reject) notifying merchant
 */

jest.mock('server-only', () => ({}), { virtual: true });

// Mock sendEmail
const mockSendEmail = jest.fn().mockResolvedValue({ success: true, messageId: '<test-email-id@intrust>' });
jest.mock('@/lib/email', () => ({
    sendEmail: (...args) => mockSendEmail(...args),
}));

// Mock WhatsApp notifications
const mockNotifyMerchantPayoutRequested = jest.fn().mockResolvedValue({ success: true });
const mockNotifyMerchantPayoutStatus = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/notifications/merchantWhatsapp', () => ({
    notifyMerchantPayoutRequested: (...args) => mockNotifyMerchantPayoutRequested(...args),
    notifyMerchantPayoutStatus: (...args) => mockNotifyMerchantPayoutStatus(...args),
}));

// Mock WalletService
const mockCreditWallet = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/wallet/walletService', () => ({
    WalletService: {
        creditWallet: (...args) => mockCreditWallet(...args),
    },
}));

// Mock apiAuth
let mockAuthUser = { id: 'merchant-user-123' };
let mockAuthProfile = { full_name: 'Rohit Sharma', email: 'rohit@example.com', phone: '+919876543210', role: 'merchant' };
let mockAdminSelectData = {};
let mockAdminInsertFn = jest.fn().mockResolvedValue({ error: null });
let mockAdminUpdateFn = jest.fn().mockResolvedValue({ error: null });

const mockSupabaseAdmin = {
    from: jest.fn((table) => {
        return {
            select: jest.fn((cols) => {
                return {
                    eq: jest.fn((col, val) => {
                        return {
                            single: jest.fn().mockImplementation(() => {
                                if (table === 'ai_orders_vault') {
                                    return Promise.resolve({
                                        data: mockAdminSelectData.vault || {
                                            id: 'vault-uuid-1',
                                            merchant_id: 'merchant-user-123',
                                            balance_paise: 500000, // ₹5,000
                                        },
                                        error: null,
                                    });
                                }
                                if (table === 'ai_orders_vault_transactions') {
                                    return Promise.resolve({
                                        data: mockAdminSelectData.transaction || {
                                            id: val,
                                            vault_id: 'vault-uuid-1',
                                            amount_paise: 200000,
                                            status: 'PENDING',
                                        },
                                        error: null,
                                    });
                                }
                                return Promise.resolve({ data: null, error: null });
                            }),
                            maybeSingle: jest.fn().mockImplementation(() => {
                                if (table === 'merchants') {
                                    return Promise.resolve({
                                        data: {
                                            business_name: 'Rohit Retailers',
                                            business_email: 'rohit.store@intrust.in',
                                            business_phone: '+919876543210',
                                        },
                                        error: null,
                                    });
                                }
                                if (table === 'user_profiles') {
                                    return Promise.resolve({
                                        data: mockAuthProfile,
                                        error: null,
                                    });
                                }
                                return Promise.resolve({ data: null, error: null });
                            }),
                        };
                    }),
                    in: jest.fn((col, val) => {
                        if (table === 'user_profiles' && col === 'role') {
                            return Promise.resolve({
                                data: [
                                    { id: 'admin-uuid-1', email: 'admin1@intrustindia.com', role: 'admin' },
                                    { id: 'admin-uuid-2', email: 'admin2@intrustindia.com', role: 'super_admin' },
                                ],
                                error: null,
                            });
                        }
                        return Promise.resolve({ data: [], error: null });
                    }),
                };
            }),
            insert: mockAdminInsertFn.mockImplementation((rows) => {
                return {
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: {
                                id: 'tx-uuid-new-123',
                                vault_id: 'vault-uuid-1',
                                type: 'WITHDRAWAL',
                                amount_paise: rows[0]?.amount_paise || 200000,
                                status: 'PENDING',
                            },
                            error: null,
                        }),
                    }),
                };
            }),
            update: mockAdminUpdateFn.mockImplementation((payload) => {
                return {
                    eq: jest.fn().mockResolvedValue({ error: null }),
                };
            }),
        };
    }),
};

jest.mock('@/lib/apiAuth', () => ({
    getAuthUser: jest.fn(async () => ({
        user: mockAuthUser,
        profile: mockAuthProfile,
        admin: mockSupabaseAdmin,
    })),
}));

import { aiOrderWithdrawalNotificationTemplate } from '../lib/email/templates/aiOrderWithdrawalNotification.js';
import { POST as handleWithdrawalRequest } from '../app/api/merchant/vault/withdraw/route.js';
import { POST as handleWithdrawalApprove } from '../app/api/admin/ai-orders/withdrawals/[id]/approve/route.js';
import { POST as handleWithdrawalReject } from '../app/api/admin/ai-orders/withdrawals/[id]/reject/route.js';

describe('AI Orders Vault Withdrawal Admin Notifications', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthUser = { id: 'merchant-user-123' };
        mockAuthProfile = { full_name: 'Rohit Sharma', email: 'rohit@example.com', phone: '+919876543210', role: 'merchant' };
        mockAdminSelectData = {};
    });

    describe('1. Email Template Generator (aiOrderWithdrawalNotificationTemplate)', () => {
        it('generates branded subject and content with escaped entities', () => {
            const template = aiOrderWithdrawalNotificationTemplate({
                merchantName: 'Super Mart <script>alert(1)</script>',
                merchantEmail: 'owner@supermart.com',
                merchantPhone: '+919800012345',
                amountRupees: 90000,
                transactionId: 'tx-123-uuid',
                vaultId: 'vault-456-uuid',
                remainingBalanceRupees: 10000,
                adminPortalUrl: 'https://intrustindia.com/admin/ai-orders/withdrawals',
                requestedAt: new Date('2026-09-10T12:00:00Z'),
            });

            expect(template.subject).toContain('AI Orders Vault Withdrawal Request: ₹90,000.00 — Super Mart');
            expect(template.html).toContain('Super Mart &lt;script&gt;alert(1)&lt;/script&gt;');
            expect(template.html).not.toContain('<script>alert(1)</script>');
            expect(template.html).toContain('₹90,000.00');
            expect(template.html).toContain('https://intrustindia.com/admin/ai-orders/withdrawals');
            expect(template.html).toContain('tx-123-uuid');
            expect(template.html).toContain('vault-456-uuid');

            expect(template.text).toContain('INTRUST INDIA — AI ORDERS VAULT WITHDRAWAL REQUEST');
            expect(template.text).toContain('Requested Amount:     ₹90,000.00');
            expect(template.text).toContain('https://intrustindia.com/admin/ai-orders/withdrawals');
        });
    });

    describe('2. POST /api/merchant/vault/withdraw', () => {
        it('creates in-app notifications for all admins and dispatches alerts upon withdrawal request', async () => {
            const req = new Request('http://localhost:3000/api/merchant/vault/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_paise: 200000 }), // ₹2,000
            });

            const res = await handleWithdrawalRequest(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.new_balance_paise).toBe(300000);

            // Verify admin notification insertion
            expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('notifications');
            expect(mockAdminInsertFn).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        user_id: 'admin-uuid-1',
                        title: 'AI Orders: Withdrawal Request 💰',
                        body: expect.stringContaining('Rohit Retailers requested a vault withdrawal of ₹2,000.00'),
                        type: 'warning',
                        priority: 'HIGH',
                        reference_type: 'ai_orders_withdrawal',
                        action_url: '/admin/ai-orders/withdrawals',
                    }),
                    expect.objectContaining({
                        user_id: 'admin-uuid-2',
                        title: 'AI Orders: Withdrawal Request 💰',
                        body: expect.stringContaining('Rohit Retailers requested a vault withdrawal of ₹2,000.00'),
                        type: 'warning',
                        priority: 'HIGH',
                        reference_type: 'ai_orders_withdrawal',
                        action_url: '/admin/ai-orders/withdrawals',
                    }),
                ])
            );

            // Verify best-effort email dispatch
            expect(mockSendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: expect.stringContaining('AI Orders Vault Withdrawal Request: ₹2,000.00'),
                    sender: 'accounts',
                    category: 'ai_orders_withdrawal_alert',
                })
            );

            // Verify best-effort WhatsApp receipt
            expect(mockNotifyMerchantPayoutRequested).toHaveBeenCalledWith(
                expect.objectContaining({
                    merchantUserId: 'merchant-user-123',
                    amountRs: 2000,
                    source: 'AI Orders Vault',
                })
            );
        });

        it('rejects withdrawal if balance is insufficient', async () => {
            mockAdminSelectData.vault = {
                id: 'vault-uuid-1',
                merchant_id: 'merchant-user-123',
                balance_paise: 10000, // only ₹100
            };

            const req = new Request('http://localhost:3000/api/merchant/vault/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_paise: 50000 }), // requesting ₹500
            });

            const res = await handleWithdrawalRequest(req);
            const json = await res.json();

            expect(res.status).toBe(400);
            expect(json.error).toBe('Insufficient vault balance');
            expect(mockSendEmail).not.toHaveBeenCalled();
        });
    });

    describe('3. POST /api/admin/ai-orders/withdrawals/[id]/approve', () => {
        beforeEach(() => {
            mockAuthProfile = { full_name: 'Admin User', role: 'admin' };
        });

        it('credits merchant wallet and notifies merchant upon approval', async () => {
            const req = new Request('http://localhost:3000/api/admin/ai-orders/withdrawals/tx-uuid-1/approve', {
                method: 'POST',
            });

            const res = await handleWithdrawalApprove(req, { params: Promise.resolve({ id: 'tx-uuid-1' }) });
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(mockCreditWallet).toHaveBeenCalledWith(
                'merchant-user-123',
                2000,
                'tx-uuid-1',
                'ai_orders_vault_withdrawal',
                expect.stringContaining('AI Orders Vault withdrawal credit')
            );

            // Verify merchant notification
            expect(mockAdminInsertFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'merchant-user-123',
                    title: 'Vault Withdrawal Approved ✅',
                    body: expect.stringContaining('₹2,000.00 has been approved'),
                    type: 'success',
                    action_url: '/merchant/wallet',
                })
            );

            // Verify WhatsApp status alert
            expect(mockNotifyMerchantPayoutStatus).toHaveBeenCalledWith(
                expect.objectContaining({
                    merchantUserId: 'merchant-user-123',
                    amountRs: 2000,
                    status: 'APPROVED',
                })
            );
        });
    });

    describe('4. POST /api/admin/ai-orders/withdrawals/[id]/reject', () => {
        beforeEach(() => {
            mockAuthProfile = { full_name: 'Super Admin', role: 'super_admin' };
        });

        it('refunds vault balance and notifies merchant upon rejection', async () => {
            const req = new Request('http://localhost:3000/api/admin/ai-orders/withdrawals/tx-uuid-1/reject', {
                method: 'POST',
            });

            const res = await handleWithdrawalReject(req, { params: Promise.resolve({ id: 'tx-uuid-1' }) });
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);

            // Verify merchant notification
            expect(mockAdminInsertFn).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'merchant-user-123',
                    title: 'Vault Withdrawal Rejected ❌',
                    body: expect.stringContaining('Funds have been refunded to your vault.'),
                    type: 'error',
                    action_url: '/merchant/vault/transactions',
                })
            );

            // Verify WhatsApp status alert
            expect(mockNotifyMerchantPayoutStatus).toHaveBeenCalledWith(
                expect.objectContaining({
                    merchantUserId: 'merchant-user-123',
                    amountRs: 2000,
                    status: 'REJECTED',
                })
            );
        });
    });
});
