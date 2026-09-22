/**
 * Unit tests for PATCH /api/admin/merchants/[id]/store-status
 *
 * Regression context: the admin Store Status page previously issued the
 * merchants.is_open UPDATE from the browser with the anon-key client. RLS
 * (`merchants_update_policy`: user_id = auth.uid()) matched ZERO rows for an
 * admin who does not own the merchant, PostgREST returned error = null, and
 * the UI showed "Store status updated" while nothing had changed (silent
 * no-op reverted by the realtime channel).
 *
 * The route must therefore:
 *   - reject non-admins (403)
 *   - reject a non-boolean is_open (400)
 *   - treat "0 rows updated" as 404 Merchant-not-found — never success
 *   - write through the service-role client (admin client)
 */
import { PATCH } from '../app/api/admin/merchants/[id]/store-status/route';

jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn(),
}));

import { createAdminClient } from '@/lib/supabaseServer';

const MERCHANT_ID = '612b1cc3-403e-4093-b8d1-f1c01b5b4c5f';
const ADMIN_USER_ID = '6e81e8f5-337d-4d92-ab4f-e633f890b8de';

const makeParams = (id = MERCHANT_ID) => ({ params: Promise.resolve({ id }) });

const makeRequest = (body) => ({
    json: async () => body,
    headers: { get: () => 'Bearer test-token' },
});

/**
 * Chainable supabase-js-shaped builder for the merchants table.
 * single() is queued: 1st call = pre-fetch (existing), 2nd = update (updated).
 */
function makeMerchantsBuilder({ existing = null, updated = null, updateError = null, fetchError = null } = {}) {
    const b = {};
    b.select = jest.fn(() => b);
    b.eq = jest.fn(() => b);
    b.update = jest.fn(() => b);
    b.single = jest.fn()
        .mockResolvedValueOnce({ data: existing, error: fetchError })
        .mockResolvedValueOnce({ data: updated, error: updateError });
    return b;
}

/**
 * Admin client consumed by the route + getAuthUser.
 * profile = what the user_profiles single() resolves to (drives the role gate).
 */
function makeClient({ profile = { role: 'admin', is_suspended: false }, merchants, tables = {} } = {}) {
    const auditBuilder = { insert: jest.fn(() => Promise.resolve({ error: null })) };
    const resolved = {
        audit_logs: auditBuilder,
        user_profiles: {
            select: () => ({
                eq: () => ({ single: () => Promise.resolve({ data: profile, error: null }) }),
            }),
        },
        ...tables,
    };

    return {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: ADMIN_USER_ID } }, error: null }) },
        from: jest.fn((table) => resolved[table] ?? merchants),
        _audit: auditBuilder,
        _merchants: merchants,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    createAdminClient.mockReset();
});

describe('auth & validation', () => {
    it('returns 403 for a non-admin caller', async () => {
        createAdminClient.mockReturnValue(makeClient({ profile: { role: 'merchant', is_suspended: false } }));

        const res = await PATCH(makeRequest({ is_open: true }), makeParams());
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toMatch(/admin access required/i);
    });

    it('returns 401 when unauthenticated', async () => {
        const client = makeClient({ profile: null });
        // simulate an invalid/expired bearer token so getAuthUser finds no user
        client.auth.getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: new Error('bad token') });
        createAdminClient.mockReturnValue(client);

        const res = await PATCH(makeRequest({ is_open: true }), makeParams());
        expect(res.status).toBe(401);
    });

    it('returns 400 when is_open is missing', async () => {
        createAdminClient.mockReturnValue(makeClient());

        const res = await PATCH(makeRequest({}), makeParams());
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/is_open/i);
    });

    it('returns 400 when is_open is not a boolean', async () => {
        createAdminClient.mockReturnValue(makeClient());

        const res = await PATCH(makeRequest({ is_open: 'yes' }), makeParams());
        expect(res.status).toBe(400);
    });
});

describe('outcome mapping', () => {
    it('returns 404 when the merchant does not exist (0 rows) — never success', async () => {
        // pre-fetch resolves null → route must short-circuit with 404
        createAdminClient.mockReturnValue(makeClient({
            merchants: makeMerchantsBuilder({ existing: null }),
        }));

        const res = await PATCH(makeRequest({ is_open: true }), makeParams());
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toMatch(/not found/i);
    });

    it('returns 500 if the update itself errors', async () => {
        createAdminClient.mockReturnValue(makeClient({
            merchants: makeMerchantsBuilder({
                existing: { id: MERCHANT_ID, is_open: true },
                updated: null,
                updateError: new Error('db exploded'),
            }),
        }));

        const res = await PATCH(makeRequest({ is_open: false }), makeParams());
        expect(res.status).toBe(500);
    });
});

describe('happy path — privileged write via service role', () => {
    it('updates is_open through the admin client, writes an audit row, returns 200', async () => {
        const existing = { id: MERCHANT_ID, business_name: 'Acme', is_open: false };
        const updated = { id: MERCHANT_ID, business_name: 'Acme', is_open: true };

        const merchants = makeMerchantsBuilder({ existing, updated });
        createAdminClient.mockReturnValue(makeClient({ merchants }));

        const res = await PATCH(makeRequest({ is_open: true }), makeParams());
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.merchant.is_open).toBe(true);

        // privileged write must have gone through the admin (service-role) client
        expect(merchants.update).toHaveBeenCalledWith({ is_open: true });

        // and an audit row must have been written
        const client = createAdminClient.mock.results[0].value;
        expect(client._audit.insert).toHaveBeenCalledTimes(1);
        expect(client._audit.insert.mock.calls[0][0][0].action).toBe('store_status_toggle');
    });

    it('still returns 200 (audit non-blocking) when the audit insert fails', async () => {
        const merchants = makeMerchantsBuilder({
            existing: { id: MERCHANT_ID, business_name: 'Acme', is_open: true },
            updated: { id: MERCHANT_ID, business_name: 'Acme', is_open: false },
        });
        const client = makeClient({ merchants });
        client._audit.insert = jest.fn(() => Promise.resolve({ error: new Error('audit down') }));
        createAdminClient.mockReturnValue(client);

        const res = await PATCH(makeRequest({ is_open: false }), makeParams());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
    });
});
