/**
 * Bank-verification decoupling — unit tests for the two API routes.
 *
 * Complements e2e_tests/bank_decoupling_flow.mjs: the live E2E cannot exercise
 * the automated penny-drop SUCCESS branch (SprintVerify is called for real with
 * LIVE credentials, so a synthetic account is always rejected), which is why the
 * branch matrix is covered here with a mocked registry.
 *
 *   /api/merchant/bank-details (POST)
 *     - validation: missing fields / bad IFSC / bad account number → 400
 *     - registry confirms → bank_verified = true + flag 'verified'
 *     - registry unavailable/manual review → flag stays 'pending'
 *     - admin notification targets merchant.id (not user.id)
 *
 *   /api/admin/verify-bank (POST)
 *     - no bank details → 400 + exact message, third-party call NEVER attempted
 *     - account number without IFSC → 400 (strengthened guard regression test)
 *     - happy path → bank_verified + flag 'verified'
 *
 * Run: node --env-file=.env.local --experimental-vm-modules node_modules/jest/bin/jest.js __tests__/bankVerificationDecoupling.test.js
 */

const MERCHANT_ROW = { id: 'm-1111', user_id: 'u-2222', business_name: 'Test Biz' };

// A merchant that already HAS bank details on file — what /api/admin/verify-bank
// needs to get past its guard.
const MERCHANT_ROW_WITH_BANK = {
    ...MERCHANT_ROW,
    bank_account_number: '123456789012',
    bank_ifsc_code: 'SBIN0001234',
    bank_data: { account_number: '123456789012', ifsc: 'SBIN0001234' },
    bank_verified: false,
};

jest.mock('@/lib/supabaseServer', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/lib/merchant/requireSubscription', () => ({ requireMerchantSubscription: jest.fn() }));
jest.mock('@/lib/apiAuth', () => ({ getAuthUser: jest.fn() }));
jest.mock('@/lib/sprintVerify', () => ({ sprintVerify: { verifyBank: jest.fn() } }));
jest.mock('@/lib/notifications/merchantWhatsapp', () => ({ notifyMerchantBankVerified: jest.fn() }));
jest.mock('@/lib/email/dispatch', () => ({ fireAndForgetEmail: jest.fn() }));
jest.mock('@/lib/email', () => ({ sendMerchantAlert: jest.fn() }));

import { POST as postBankDetails } from '../app/api/merchant/bank-details/route';
import { POST as postVerifyBank } from '../app/api/admin/verify-bank/route';
import { createAdminClient } from '@/lib/supabaseServer';
import { requireMerchantSubscription } from '@/lib/merchant/requireSubscription';
import { getAuthUser } from '@/lib/apiAuth';
import { sprintVerify } from '@/lib/sprintVerify';

/**
 * Minimal chainable Supabase query-builder mock, table-aware so each table can
 * resolve its own read result. Update/insert payloads are recorded for asserts.
 */
function makeMockDb({ tableResults = {} } = {}) {
    const updates = [];
    const inserts = [];
    const make = (table) => {
        const chain = {
            select: jest.fn(() => chain),
            eq: jest.fn(() => chain),
            neq: jest.fn(() => chain),
            in: jest.fn(() => chain),
            order: jest.fn(() => chain),
            limit: jest.fn(() => chain),
            update: jest.fn((payload) => { updates.push({ table, payload }); return chain; }),
            insert: jest.fn((payload) => { inserts.push({ table, payload }); return chain; }),
            upsert: jest.fn((payload) => { inserts.push({ table, payload }); return chain; }),
            delete: jest.fn(() => chain),
            single: jest.fn(() => Promise.resolve(tableResults[table] ?? { data: null, error: null })),
            maybeSingle: jest.fn(() => Promise.resolve(tableResults[table] ?? { data: null, error: null })),
            then: (res, rej) => Promise.resolve(tableResults[table] ?? { data: null, error: null }).then(res, rej),
        };
        return chain;
    };
    const db = { from: jest.fn((t) => make(t)) };
    return { db, updates, inserts };
}

function jsonRequest(body, url = 'http://localhost:3000/test') {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
        body: JSON.stringify(body),
    });
}

const VALID_BANK = {
    bank_account_name: 'Ramesh Kumar',
    bank_account_number: '123456789012',
    bank_ifsc_code: 'SBIN0001234',
    bank_name: 'State Bank of India',
};

describe('POST /api/merchant/bank-details (merchant catch-up submission)', () => {
    let mockDb;

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.ENABLE_VERIFICATION_BYPASS;
        mockDb = makeMockDb({
            tableResults: {
                merchants: { data: MERCHANT_ROW, error: null },
                // Admin fan-out list read by the notification block.
                user_profiles: { data: [{ id: 'admin-1' }], error: null },
            },
        });
        requireMerchantSubscription.mockResolvedValue({
            ok: true,
            user: { id: 'u-2222' },
            merchant: MERCHANT_ROW,
            admin: mockDb.db,
        });
        createAdminClient.mockReturnValue(mockDb.db);
    });

    test('rejects missing fields with 400 before any registry call', async () => {
        const res = await postBankDetails(jsonRequest({ bank_account_name: 'Ramesh Kumar' }));
        expect(res.status).toBe(400);
        expect(sprintVerify.verifyBank).not.toHaveBeenCalled();
        expect(mockDb.updates).toHaveLength(0);
    });

    test('rejects a malformed IFSC with 400', async () => {
        const res = await postBankDetails(jsonRequest({ ...VALID_BANK, bank_ifsc_code: 'NOT-A-IFSC' }));
        expect(res.status).toBe(400);
        expect(sprintVerify.verifyBank).not.toHaveBeenCalled();
    });

    test('normalizes spaces/dashes out of the account number before validating', async () => {
        // Deliberately lenient: '1234 5678' is what the user meant, so it is
        // normalized rather than rejected (a real typo like 'AB12' still fails).
        const res = await postBankDetails(jsonRequest({ ...VALID_BANK, bank_account_number: '1234 5678' }));
        expect(res.status).toBe(200);
        expect(mockDb.updates[0].payload.bank_account_number).toBe('12345678');
    });

    test('penny-drop success auto-verifies: bank_verified=true + flag=verified', async () => {
        sprintVerify.verifyBank.mockResolvedValue({
            valid: true,
            message: 'Verified Successfully',
            data: { account_name: 'RAMESH KUMAR', ref_id: 'PV-1' },
        });

        const res = await postBankDetails(jsonRequest(VALID_BANK));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(sprintVerify.verifyBank).toHaveBeenCalledWith('123456789012', 'SBIN0001234');
        expect(json.bank_verified).toBe(true);
        expect(json.bank_verification_status).toBe('verified');

        // First update persists the submission (pending), the second records the
        // automated verification.
        expect(mockDb.updates.length).toBeGreaterThanOrEqual(2);
        expect(mockDb.updates[0].payload.bank_verified).toBe(false);
        expect(mockDb.updates[0].payload.bank_verification_status).toBe('pending');
        expect(mockDb.updates[1].payload.bank_verified).toBe(true);
        expect(mockDb.updates[1].payload.bank_verification_status).toBe('verified');
        expect(mockDb.updates[1].payload.bank_data.verified_via).toBe('penny_drop');
        expect(mockDb.updates[1].payload.bank_data.registered_name).toBe('RAMESH KUMAR');
    });

    test('registry unavailable → submission kept as pending for the admin queue', async () => {
        sprintVerify.verifyBank.mockResolvedValue({ valid: 'manual_review', message: 'Verification Service Unavailable' });

        const res = await postBankDetails(jsonRequest(VALID_BANK));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.bank_verified).toBe(false);
        expect(json.bank_verification_status).toBe('pending');
        expect(mockDb.updates).toHaveLength(1);
        expect(mockDb.updates[0].payload.bank_verified).toBe(false);
        expect(mockDb.updates[0].payload.bank_verification_status).toBe('pending');
        // Admins are only pinged when a human actually has to act.
        expect(mockDb.inserts.some((i) => i.table === 'notifications')).toBe(true);
    });

    test('registry throws → submission is still saved as pending (no data loss)', async () => {
        sprintVerify.verifyBank.mockRejectedValue(new Error('upstream timeout'));

        const res = await postBankDetails(jsonRequest(VALID_BANK));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.bank_verification_status).toBe('pending');
        expect(mockDb.updates[0].payload.bank_account_number).toBe('123456789012');
        expect(mockDb.updates[0].payload.bank_verification_status).toBe('pending');
    });

    test('admin notification references the merchant row (not the user id)', async () => {
        sprintVerify.verifyBank.mockResolvedValue({ valid: 'manual_review', message: 'manual' });

        await postBankDetails(jsonRequest(VALID_BANK));

        const notif = mockDb.inserts.find((i) => i.table === 'notifications');
        expect(notif).toBeDefined();
        expect(notif.payload[0].reference_id).toBe('m-1111');
        expect(notif.payload[0].body).toContain('Test Biz');
    });
});


describe('POST /api/admin/verify-bank (admin financial verification)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.ENABLE_VERIFICATION_BYPASS;
    });

    test('400 + exact message when the merchant has no bank details', async () => {
        const mockDb = makeMockDb({
            tableResults: {
                merchants: { data: { id: 'm-1', bank_account_number: null, bank_ifsc_code: null, bank_data: null, bank_verified: false }, error: null },
            },
        });
        createAdminClient.mockReturnValue(mockDb.db);
        getAuthUser.mockResolvedValue({ user: { id: 'admin-1' }, profile: { role: 'admin' }, admin: mockDb.db });

        const res = await postVerifyBank(jsonRequest({ merchantId: 'm-1' }));
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Cannot verify. Merchant has not provided bank details yet.');
        expect(json.code).toBe('BANK_DETAILS_MISSING');
        // Nothing may be written and the paid registry call must not be attempted.
        expect(sprintVerify.verifyBank).not.toHaveBeenCalled();
        expect(mockDb.updates).toHaveLength(0);
    });

    test('400 when only the IFSC is missing (legacy bank_data-only row)', async () => {
        const mockDb = makeMockDb({
            tableResults: {
                merchants: {
                    data: {
                        id: 'm-1',
                        bank_account_number: '123456789012',
                        bank_ifsc_code: null,
                        bank_data: { account_number: '123456789012' },
                        bank_verified: false,
                    },
                    error: null,
                },
            },
        });
        createAdminClient.mockReturnValue(mockDb.db);
        getAuthUser.mockResolvedValue({ user: { id: 'admin-1' }, profile: { role: 'admin' }, admin: mockDb.db });

        const res = await postVerifyBank(jsonRequest({ merchantId: 'm-1' }));
        expect(res.status).toBe(400);
        expect(sprintVerify.verifyBank).not.toHaveBeenCalled();
    });

    test('whitespace-only values count as missing', async () => {
        const mockDb = makeMockDb({
            tableResults: {
                merchants: {
                    data: {
                        id: 'm-1',
                        bank_account_number: '   ',
                        bank_ifsc_code: 'SBIN0001234',
                        bank_data: null,
                        bank_verified: false,
                    },
                    error: null,
                },
            },
        });
        createAdminClient.mockReturnValue(mockDb.db);
        getAuthUser.mockResolvedValue({ user: { id: 'admin-1' }, profile: { role: 'admin' }, admin: mockDb.db });

        const res = await postVerifyBank(jsonRequest({ merchantId: 'm-1' }));
        expect(res.status).toBe(400);
    });

    test('happy path: marks verified and advances the lifecycle flag', async () => {
        const mockDb = makeMockDb({
            tableResults: {
                merchants: { data: MERCHANT_ROW_WITH_BANK, error: null },
                user_profiles: { data: { email: 'biz@test.com' }, error: null },
            },
        });
        createAdminClient.mockReturnValue(mockDb.db);
        getAuthUser.mockResolvedValue({ user: { id: 'admin-1' }, profile: { role: 'admin' }, admin: mockDb.db });

        const res = await postVerifyBank(jsonRequest({ merchantId: 'm-1111' }));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockDb.updates[0].payload.bank_verified).toBe(true);
        expect(mockDb.updates[0].payload.bank_verification_status).toBe('verified');
    });

    test('403 for non-admin callers', async () => {
        const mockDb = makeMockDb();
        createAdminClient.mockReturnValue(mockDb.db);
        getAuthUser.mockResolvedValue({ user: { id: 'u-1' }, profile: { role: 'merchant' }, admin: mockDb.db });

        const res = await postVerifyBank(jsonRequest({ merchantId: 'm-1' }));
        expect(res.status).toBe(403);
        expect(sprintVerify.verifyBank).not.toHaveBeenCalled();
    });
});

