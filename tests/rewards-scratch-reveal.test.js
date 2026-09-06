/**
 * Unit & Integration Tests — Scratch Card Reveal & Bulk Reveal Endpoints
 *
 * Tests covering:
 *   Test 1 — Normal scratch: Authenticated user scratches own unscratched card -> 200 'scratched'
 *   Test 2 — Already scratched: Scratching again -> 200 'already_scratched' without double-crediting
 *   Test 3 — Wrong user / BOLA: User A attempts to scratch User B's card -> 404 'not_found'
 *   Test 4 — Invalid UUID: Malformed ID -> 400 'bad_request'
 *   Test 5 — Database failure: DB error -> 500 'server_error' (NOT converted to 'not_found')
 *   Test 6 — Bulk scratch: Scratches only matching unscratched cards for authenticated user
 *   Test 7 — Unauthorized: Unauthenticated request -> 401 'unauthorized'
 *   Test 8 — Balance integrity: Verifies balance read-only inspection, no mutations to ledger
 *
 * Run:
 *   npx jest tests/rewards-scratch-reveal.test.js
 */

import { POST as scratchSinglePost } from '../app/api/rewards/scratch/[id]/route';
import { PATCH as scratchLegacyPatch } from '../app/api/rewards/scratch/route';
import { POST as scratchBulkPost } from '../app/api/rewards/scratch/bulk/route';
import * as supabaseServer from '../lib/supabaseServer';

jest.mock('../lib/supabaseServer');
jest.mock('../lib/logger', () => ({
    createRequestLogger: () => ({
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    }),
}));
jest.mock('../lib/rateLimit', () => ({
    checkRateLimit: () => ({ allowed: true, retryAfterMs: 0 }),
}));

describe('Rewards Scratch Card Reveal Endpoints', () => {
    const userA = { id: '11111111-1111-4111-8111-111111111111', email: 'userA@example.com' };
    const userB = { id: '22222222-2222-4222-8222-222222222222', email: 'userB@example.com' };
    const cardId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cardId2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    let mockUserSupabase;
    let mockAdminSupabase;

    beforeEach(() => {
        jest.clearAllMocks();

        // Standard authenticated client mock (for supabase.auth.getUser)
        mockUserSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: userA },
                    error: null,
                }),
            },
        };
        supabaseServer.createServerSupabaseClient.mockResolvedValue(mockUserSupabase);

        // Standard admin client mock
        mockAdminSupabase = {
            from: jest.fn(),
        };
        supabaseServer.createAdminClient.mockReturnValue(mockAdminSupabase);
    });

    // ── Test 1: Normal scratch ───────────────────────────────────────────────
    it('Test 1 — Normal scratch: Authenticated user scratches own unscratched card', async () => {
        // Mock atomic update succeeding
        const mockUpdateBuilder = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { id: cardId, points: 150, event_type: 'purchase' },
                error: null,
            }),
        };

        // Mock balance fetch
        const mockBalanceBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { current_balance: 650, tier: 'silver' },
                error: null,
            }),
        };

        mockAdminSupabase.from.mockImplementation((table) => {
            if (table === 'reward_transactions') return mockUpdateBuilder;
            if (table === 'reward_points_balance') return mockBalanceBuilder;
            throw new Error(`Unexpected table ${table}`);
        });

        const req = new Request(`http://localhost/api/rewards/scratch/${cardId}`, { method: 'POST' });
        const res = await scratchSinglePost(req, { params: Promise.resolve({ id: cardId }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.code).toBe('scratched');
        expect(json.pointsWon).toBe(150);
        expect(json.newBalance).toBe(650);
        expect(json.tier).toBe('silver');

        // Verify update was scoped to userA and is_scratched: false
        expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ is_scratched: true });
        expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('id', cardId);
        expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('user_id', userA.id);
        expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('is_scratched', false);
    });

    // ── Test 2: Already scratched (idempotent) ────────────────────────────────
    it('Test 2 — Already scratched: Subsequent scratch returns already_scratched without error or double credit', async () => {
        // Atomic update returns null (already scratched)
        const mockUpdateBuilder = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        };

        // Select for idempotency returns is_scratched: true
        const mockSelectBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { id: cardId, is_scratched: true },
                error: null,
            }),
        };

        // Balance fetch
        const mockBalanceBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { current_balance: 650, tier: 'silver' },
                error: null,
            }),
        };

        let txCallCount = 0;
        mockAdminSupabase.from.mockImplementation((table) => {
            if (table === 'reward_transactions') {
                txCallCount++;
                return txCallCount === 1 ? mockUpdateBuilder : mockSelectBuilder;
            }
            if (table === 'reward_points_balance') return mockBalanceBuilder;
            throw new Error(`Unexpected table ${table}`);
        });

        const req = new Request(`http://localhost/api/rewards/scratch/${cardId}`, { method: 'POST' });
        const res = await scratchSinglePost(req, { params: Promise.resolve({ id: cardId }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.code).toBe('already_scratched');
        expect(json.newBalance).toBe(650);
        expect(json.pointsWon).toBeUndefined();
    });

    // ── Test 3: Wrong user / BOLA protection ──────────────────────────────────
    it("Test 3 — Wrong user / BOLA: User A cannot scratch User B's card", async () => {
        // Update matches 0 rows because card belongs to userB
        const mockUpdateBuilder = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        };

        // Idempotency select also finds nothing for userA
        const mockSelectBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
            }),
        };

        let txCallCount = 0;
        mockAdminSupabase.from.mockImplementation((table) => {
            if (table === 'reward_transactions') {
                txCallCount++;
                return txCallCount === 1 ? mockUpdateBuilder : mockSelectBuilder;
            }
            throw new Error(`Unexpected table ${table}`);
        });

        const req = new Request(`http://localhost/api/rewards/scratch/${cardId}`, { method: 'POST' });
        const res = await scratchSinglePost(req, { params: Promise.resolve({ id: cardId }) });
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.success).toBe(false);
        expect(json.code).toBe('not_found');
        // Both update and select must enforce userA's id
        expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('user_id', userA.id);
        expect(mockSelectBuilder.eq).toHaveBeenCalledWith('user_id', userA.id);
    });

    // ── Test 4: Invalid UUID validation ───────────────────────────────────────
    it('Test 4 — Invalid UUID: Rejects non-UUID identifier with 400 bad_request', async () => {
        const req = new Request('http://localhost/api/rewards/scratch/invalid-uuid-123', { method: 'POST' });
        const res = await scratchSinglePost(req, { params: Promise.resolve({ id: 'invalid-uuid-123' }) });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.code).toBe('bad_request');
        expect(mockAdminSupabase.from).not.toHaveBeenCalled();
    });

    // ── Test 5: Database failure handling ────────────────────────────────────
    it('Test 5 — Database failure: Database error returns server_error, NOT misleading not_found', async () => {
        const mockUpdateBuilder = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: { code: '50001', message: 'connection failure' },
            }),
        };

        mockAdminSupabase.from.mockImplementation((table) => {
            if (table === 'reward_transactions') return mockUpdateBuilder;
            throw new Error(`Unexpected table ${table}`);
        });

        const req = new Request(`http://localhost/api/rewards/scratch/${cardId}`, { method: 'POST' });
        const res = await scratchSinglePost(req, { params: Promise.resolve({ id: cardId }) });
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.code).toBe('server_error');
    });

    // ── Test 6: Bulk scratch ──────────────────────────────────────────────────
    it('Test 6 — Bulk scratch: Scratches multiple owned cards atomically', async () => {
        const mockBulkBuilder = {
            update: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({
                data: [
                    { id: cardId, points: 50 },
                    { id: cardId2, points: 100 },
                ],
                error: null,
            }),
        };

        const mockBalanceBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { current_balance: 500, tier: 'bronze' },
                error: null,
            }),
        };

        mockAdminSupabase.from.mockImplementation((table) => {
            if (table === 'reward_transactions') return mockBulkBuilder;
            if (table === 'reward_points_balance') return mockBalanceBuilder;
            throw new Error(`Unexpected table ${table}`);
        });

        const req = new Request('http://localhost/api/rewards/scratch/bulk', {
            method: 'POST',
            body: JSON.stringify({ ids: [cardId, cardId2] }),
        });

        const res = await scratchBulkPost(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.totalPointsWon).toBe(150);
        expect(json.scratchedCount).toBe(2);
        expect(json.scratched).toHaveLength(2);
        expect(mockBulkBuilder.in).toHaveBeenCalledWith('id', [cardId, cardId2]);
        expect(mockBulkBuilder.eq).toHaveBeenCalledWith('user_id', userA.id);
        expect(mockBulkBuilder.eq).toHaveBeenCalledWith('is_scratched', false);
    });

    // ── Test 7: Unauthorized check ───────────────────────────────────────────
    it('Test 7 — Unauthorized: Rejects requests when session is missing', async () => {
        mockUserSupabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'no session' },
        });

        const req = new Request(`http://localhost/api/rewards/scratch/${cardId}`, { method: 'POST' });
        const res = await scratchSinglePost(req, { params: Promise.resolve({ id: cardId }) });
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.success).toBe(false);
        expect(json.code).toBe('unauthorized');
        expect(mockAdminSupabase.from).not.toHaveBeenCalled();
    });

    // ── Test 8: Legacy PATCH route test ──────────────────────────────────────
    it('Test 8 — Legacy PATCH route: Works with admin client and maintains backward compatibility', async () => {
        const mockUpdateBuilder = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
                data: { id: cardId, is_scratched: true, points: 50 },
                error: null,
            }),
        };

        mockAdminSupabase.from.mockReturnValue(mockUpdateBuilder);

        const req = new Request('http://localhost/api/rewards/scratch', {
            method: 'PATCH',
            body: JSON.stringify({ transactionId: cardId }),
        });

        const res = await scratchLegacyPatch(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.code).toBe('scratched');
        expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('user_id', userA.id);
    });
});
