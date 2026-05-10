/**
 * Unit tests — scratch rate-limiter & reward notification helper
 *
 * Covers:
 *   1. checkRateLimit — allows requests within the window limit
 *   2. checkRateLimit — blocks requests that exceed the window limit
 *   3. checkRateLimit — resets after the window elapses
 *   4. checkRateLimit — independent keys do not interfere
 *   5. notifyRewardEarned — skips 'daily_login' events
 *   6. notifyRewardEarned — skips when totalDistributed <= 0
 *   7. notifyRewardEarned — skips when supabaseAdmin is missing
 *   8. notifyRewardEarned — inserts a 'success' notification for a valid reward
 *   9. notifyRewardEarned — uses resolved transactionId when DB lookup succeeds
 *  10. notifyRewardEarned — tolerates a failed transactionId lookup (logs + continues)
 *  11. notifyRewardEarned — swallows insertion errors so the caller never throws
 *
 * Run:
 *   npx jest tests/scratch-ratelimit-notify.test.js
 */

import { checkRateLimit } from '../lib/rateLimit';
import { notifyRewardEarned } from '../lib/rewardNotifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Advance jest fake-timers by `ms` milliseconds. */
const tick = (ms) => jest.advanceTimersByTime(ms);

// ─── §1-4  checkRateLimit ─────────────────────────────────────────────────────

describe('checkRateLimit', () => {
    beforeEach(() => {
        // Each test uses real timers but a fresh module so the internal Map is clean.
        jest.useFakeTimers();
        // Clear module registry so _store is reset between tests.
        jest.resetModules();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('allows requests within the limit', async () => {
        const { checkRateLimit: rl } = await import('../lib/rateLimit');
        const opts = { limit: 3, windowMs: 10_000 };

        expect(rl('u1:scratch', opts).allowed).toBe(true);
        expect(rl('u1:scratch', opts).allowed).toBe(true);
        expect(rl('u1:scratch', opts).allowed).toBe(true);
    });

    it('blocks the (limit+1)th request in the same window', async () => {
        const { checkRateLimit: rl } = await import('../lib/rateLimit');
        const opts = { limit: 2, windowMs: 10_000 };

        rl('u2:scratch', opts); // 1
        rl('u2:scratch', opts); // 2
        const { allowed, retryAfterMs } = rl('u2:scratch', opts); // 3 → blocked

        expect(allowed).toBe(false);
        expect(retryAfterMs).toBeGreaterThan(0);
    });

    it('resets after the window elapses', async () => {
        const { checkRateLimit: rl } = await import('../lib/rateLimit');
        const WINDOW = 5_000;
        const opts = { limit: 1, windowMs: WINDOW };

        expect(rl('u3:scratch', opts).allowed).toBe(true);
        expect(rl('u3:scratch', opts).allowed).toBe(false); // blocked

        tick(WINDOW + 1); // advance past the window

        expect(rl('u3:scratch', opts).allowed).toBe(true);  // allowed again
    });

    it('independent keys do not interfere', async () => {
        const { checkRateLimit: rl } = await import('../lib/rateLimit');
        const opts = { limit: 1, windowMs: 10_000 };

        expect(rl('userA:scratch', opts).allowed).toBe(true);
        expect(rl('userA:scratch', opts).allowed).toBe(false);

        // userB has its own slot
        expect(rl('userB:scratch', opts).allowed).toBe(true);
    });
});

// ─── §5-11  notifyRewardEarned ────────────────────────────────────────────────

describe('notifyRewardEarned', () => {
    /** Build a minimal Supabase admin mock with controllable behaviour. */
    function makeAdmin({
        lookupError = null,
        lookupData  = null,
        insertError = null,
    } = {}) {
        const insertMock = jest.fn().mockResolvedValue({ error: insertError });
        const maybeSingleMock = jest.fn().mockResolvedValue({ data: lookupData, error: lookupError });

        // Chained builder: .from().select().eq()...maybeSingle()
        const chainSelect = {
            eq:          () => chainSelect,
            order:       () => chainSelect,
            limit:       () => chainSelect,
            maybeSingle: maybeSingleMock,
        };

        // Chained builder: .from().insert()
        const chainInsert = {
            insert: insertMock,
        };

        const fromMock = jest.fn((table) => {
            if (table === 'reward_transactions') return chainSelect;
            return chainInsert; // 'notifications'
        });

        return { from: fromMock, _insertMock: insertMock, _maybeSingleMock: maybeSingleMock };
    }

    const BASE = {
        userId:           'user-abc',
        eventType:        'wallet_topup',
        totalDistributed: 50,
        referenceId:      'ref-123',
        referenceType:    'wallet_topup',
    };

    it('skips daily_login events', async () => {
        const admin = makeAdmin();
        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE, eventType: 'daily_login' });
        expect(admin.from).not.toHaveBeenCalled();
    });

    it('skips when totalDistributed is 0', async () => {
        const admin = makeAdmin();
        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE, totalDistributed: 0 });
        expect(admin.from).not.toHaveBeenCalled();
    });

    it('skips when totalDistributed is negative', async () => {
        const admin = makeAdmin();
        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE, totalDistributed: -10 });
        expect(admin.from).not.toHaveBeenCalled();
    });

    it('skips when supabaseAdmin is falsy', async () => {
        // Should not throw
        await expect(
            notifyRewardEarned({ supabaseAdmin: null, ...BASE })
        ).resolves.toBeUndefined();
    });

    it('skips when userId is falsy', async () => {
        const admin = makeAdmin();
        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE, userId: '' });
        expect(admin.from).not.toHaveBeenCalled();
    });

    it('inserts a success-type notification for a valid reward', async () => {
        const admin = makeAdmin({ lookupData: null }); // no prior tx found

        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE });

        // Notification insert was called
        expect(admin._insertMock).toHaveBeenCalledTimes(1);

        const insertPayload = admin._insertMock.mock.calls[0][0];
        expect(insertPayload).toMatchObject({
            user_id:        BASE.userId,
            type:           'success',         // NOT 'reward' — DB constraint
            reference_type: 'reward_scratch_card',
        });
    });

    it('resolves transactionId when the DB lookup succeeds', async () => {
        const txId = 'tx-found-uuid';
        const admin = makeAdmin({ lookupData: { id: txId } });

        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE });

        const insertPayload = admin._insertMock.mock.calls[0][0];
        expect(insertPayload.reference_id).toBe(txId);
    });

    it('sets reference_id to null when the DB lookup returns nothing', async () => {
        const admin = makeAdmin({ lookupData: null });

        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE });

        const insertPayload = admin._insertMock.mock.calls[0][0];
        expect(insertPayload.reference_id).toBeNull();
    });

    it('tolerates a failed transactionId lookup and still inserts the notification', async () => {
        const admin = makeAdmin({ lookupError: { message: 'DB error' } });
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await notifyRewardEarned({ supabaseAdmin: admin, ...BASE });

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('[rewardNotifications]'),
            expect.anything()
        );
        // Notification must still have been inserted despite the lookup failure
        expect(admin._insertMock).toHaveBeenCalledTimes(1);
        warnSpy.mockRestore();
    });

    it('swallows notification insertion errors so the caller never throws', async () => {
        const admin = makeAdmin({ insertError: { message: 'insert failed' } });
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(
            notifyRewardEarned({ supabaseAdmin: admin, ...BASE })
        ).resolves.toBeUndefined(); // must not reject

        expect(errSpy).toHaveBeenCalledWith(
            expect.stringContaining('[rewardNotifications]'),
            expect.anything()
        );
        errSpy.mockRestore();
    });
});
