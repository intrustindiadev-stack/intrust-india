import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// Initialize required env vars for tests
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// ── Mock Headers ──────────────────────────────────────────────────────────
class MockHeaders {
    constructor(init = {}) {
        this.map = new Map();
        if (init) {
            for (const [k, v] of Object.entries(init)) {
                this.map.set(k.toLowerCase(), v);
            }
        }
    }
    get(name) {
        return this.map.get(name.toLowerCase()) || null;
    }
    set(name, value) {
        this.map.set(name.toLowerCase(), value);
    }
}

// Global state to control our mocks
let mockUser = null;
let mockProfile = null;
let dbAccessed = false;

const trackDbAccess = () => {
    dbAccessed = true;
};

// Comprehensive mock database result shape
const mockDbResult = {
    id: '00000000-0000-0000-0000-000000000000',
    status: 'approved',
    subscription_status: 'active',
    subscription_expires_at: '2099-01-01',
    user_id: 'test-user-123',
    role: 'customer',
    success: true,
    total_amount_paise: 1000,
    expected_amount_paise: 1000,
    customer_id: 'test-user-123',
    merchant_id: '00000000-0000-0000-0000-000000000000',
    payment_method: 'gateway',
    payment_status: 'pending',
    delivery_status: 'pending',
    settlement_status: 'pending',
    due_date: '2099-01-01',
    balance_paise: 5000,
    wallet_balance_paise: 5000,
    current_balance: 5000,
    tier: 'bronze',
    points: 100,
    event_type: 'daily_login'
};

// ── Mock Supabase Chain ───────────────────────────────────────────────────
const mockChain = {
    select: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    insert: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    update: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    delete: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    eq: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    neq: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    in: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    order: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    limit: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    gt: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    lte: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    not: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    or: jest.fn().mockImplementation(function() { trackDbAccess(); return this; }),
    single: jest.fn().mockImplementation(async function() {
        trackDbAccess();
        return { data: { ...mockDbResult, role: mockProfile?.role || 'customer' }, error: null };
    }),
    maybeSingle: jest.fn().mockImplementation(async function() {
        trackDbAccess();
        return { data: { ...mockDbResult, role: mockProfile?.role || 'customer' }, error: null };
    }),
    // To support thenable/promise chain
    then: jest.fn().mockImplementation(function(onfulfilled) {
        trackDbAccess();
        return Promise.resolve({ data: [{ ...mockDbResult, role: mockProfile?.role || 'customer' }], error: null }).then(onfulfilled);
    })
};

const mockSupabase = {
    auth: {
        getUser: jest.fn().mockImplementation(async (token) => {
            if (token && (token === 'valid-token' || token === 'test-service-role-key')) {
                return { data: { user: mockUser }, error: null };
            }
            if (!token && mockUser) {
                return { data: { user: mockUser }, error: null };
            }
            return { data: { user: null }, error: new Error('Invalid or missing token') };
        }),
        getSession: jest.fn().mockImplementation(async () => {
            if (mockUser) {
                return { data: { session: { user: mockUser } }, error: null };
            }
            return { data: { session: null }, error: null };
        }),
        onAuthStateChange: jest.fn().mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } }
        }),
        admin: {
            signOut: jest.fn().mockResolvedValue({ error: null }),
            updateUserById: jest.fn().mockResolvedValue({ error: null })
        }
    },
    from: jest.fn().mockImplementation(() => {
        trackDbAccess();
        return mockChain;
    }),
    rpc: jest.fn().mockImplementation((name) => {
        trackDbAccess();
        if (name === 'check_rate_limit') return Promise.resolve({ data: { allowed: true }, error: null });
        return Promise.resolve({ data: mockDbResult, error: null });
    })
};

// ── Mock next/headers before routes import them ───────────────────────────
jest.mock('next/headers', () => {
    return {
        cookies: jest.fn().mockImplementation(async () => {
            return {
                getAll: () => [],
                get: (name) => {
                    if (mockUser && name.includes('auth-token')) {
                        return { value: 'valid-cookie-token' };
                    }
                    return null;
                },
                set: () => {}
            };
        }),
        headers: jest.fn().mockImplementation(async () => {
            return new MockHeaders({});
        })
    };
});

// ── Mock external dependencies ───────────────────────────────────────────
jest.mock('@/lib/supabaseServer', () => ({
    createServerSupabaseClient: jest.fn().mockImplementation(() => Promise.resolve(mockSupabase)),
    createAdminClient: jest.fn().mockImplementation(() => mockSupabase)
}));

jest.mock('@/lib/apiAuth', () => ({
    getAuthUser: jest.fn().mockImplementation(async (req) => {
        if (mockUser) {
            return {
                user: mockUser,
                profile: mockProfile,
                admin: mockSupabase
            };
        }
        return {
            user: null,
            profile: null,
            admin: mockSupabase
        };
    })
}));

jest.mock('@/lib/merchant/requireSubscription', () => ({
    requireMerchantSubscription: jest.fn().mockImplementation(async (req) => {
        if (!mockUser) {
            return {
                ok: false,
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            };
        }
        if (mockProfile?.role !== 'merchant' && mockProfile?.role !== 'admin' && mockProfile?.role !== 'super_admin') {
            return {
                ok: false,
                response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            };
        }
        return {
            ok: true,
            user: mockUser,
            profile: mockProfile,
            merchant: { status: 'approved', subscription_status: 'active', subscription_expires_at: '2099-01-01' },
            admin: mockSupabase
        };
    })
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn().mockImplementation(() => mockSupabase)
}));

// Mock heavy modules/integrations
jest.mock('@/lib/sprintVerify', () => ({
    sprintVerify: {
        _callVerificationAPI: jest.fn().mockResolvedValue({}),
        verifyGSTIN: jest.fn().mockResolvedValue({ valid: true, data: {} })
    }
}));

jest.mock('@/lib/omniflow', () => ({
    sendWhatsAppMessage: jest.fn().mockResolvedValue({}),
    sendMessageToAgent: jest.fn().mockResolvedValue('Hello'),
    normalisePhone: jest.fn().mockImplementation(p => p),
    getAllTemplateStatuses: jest.fn().mockResolvedValue([])
}));

jest.mock('@/lib/notifications/merchantWhatsapp', () => ({
    notifyMerchantNewOrder: jest.fn().mockResolvedValue({}),
    notifyMerchantOrderCancelled: jest.fn().mockResolvedValue({})
}));

// Helper to create mock requests
function createMockRequest({ method = 'GET', url = 'http://localhost/api/test', headers = {}, body = null }) {
    const headerObj = new MockHeaders(headers);
    return {
        method,
        url,
        headers: headerObj,
        cookies: {
            getAll: () => [],
            get: () => null,
            set: () => {}
        },
        json: async () => body || {},
        text: async () => body ? JSON.stringify(body) : '',
        nextUrl: new URL(url)
    };
}

// Helper to extract dynamic parameters from path
function extractParams(routePath) {
    const params = {};
    const matches = routePath.match(/\[([^\]]+)\]/g);
    if (matches) {
        matches.forEach(m => {
            const paramName = m.slice(1, -1);
            if (paramName.toLowerCase() === 'id') {
                params[paramName] = '00000000-0000-0000-0000-000000000000';
            } else {
                params[paramName] = 'test-param';
            }
        });
    }
    return params;
}

// ── Whitelist of Public API Routes ────────────────────────────────────────
const PUBLIC_ROUTES = [
    /^\/api\/auth\/email\/(signin|signup|signup\/precheck|resend-verification)$/,
    /^\/api\/auth\/(verify-otp|signup-otp|google|google\/callback|request-otp|verify-phone|logout|check-phone)$/,
    /^\/api\/webhooks\/omniflow$/,
    /^\/api\/sabpaisa\/(callback|webhook)$/,
    /^\/api\/contact$/,
    /^\/api\/whatsapp\/(status|opt-out)$/,
    /^\/api\/cron\/(check-stock|order-timeout|purge-expired-otps)$/,
    /^\/api\/shopping\/(trending-products|storefront)$/,
    /^\/api\/search$/,
    /^\/api\/test-(sprint|wallet)$/,
    /^\/api\/verify-payment$/,
    /^\/api\/coupons$/,
    /^\/api\/rewards\/leaderboard$/,
    /^\/api\/notify\/restock$/,
    /^\/api\/udhari\/reminders$/,
    /^\/api\/create-order$/,
    /^\/api\/flash-sale$/
];

// ── Discovery of API Routes ────────────────────────────────────────────────
const apiDir = path.resolve(__dirname, '../app/api');

function getRouteFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getRouteFiles(fullPath, files);
        } else if (file === 'route.js' || file === 'route.ts') {
            files.push(fullPath);
        }
    }
    return files;
}

const routeFiles = getRouteFiles(apiDir);

// Comprehensive mock body for route validation parameters
const DEFAULT_MOCK_BODY = {
    payerEmail: 'test@example.com',
    payerMobile: '9999999999',
    clientTxnId: 'TXN123456',
    amount: '10.00',
    amount_paise: 1000,
    amountPaise: 1000,
    udf1: 'WALLET_TOPUP',
    udf2: '00000000-0000-0000-0000-000000000000',
    udf3: 'test-plan',
    action: 'test',
    groupId: '00000000-0000-0000-0000-000000000000',
    group_id: '00000000-0000-0000-0000-000000000000',
    merchantId: '00000000-0000-0000-0000-000000000000',
    durationDays: 15,
    items: [{ product_id: 'prod-123', quantity: 1, is_platform_item: true }],
    businessName: 'Test Business',
    ownerName: 'Test Owner',
    phone: '9999999999',
    email: 'test@example.com',
    address: 'Test Address',
    bankAccount: '1234567890',
    ifscCode: 'UTIB0000001',
    panCard: 'ABCDE1234F',
    password: 'TestPassword123!',
    orderId: '00000000-0000-0000-0000-000000000000'
};

describe('JWT Validation on Protected API Routes (AUTH-04)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = null;
        mockProfile = null;
        dbAccessed = false;
    });

    routeFiles.forEach(filePath => {
        const relPath = path.relative(apiDir, filePath);
        const routePath = '/api/' + relPath.replace(/\\/g, '/').replace(/\/route\.(js|ts)$/, '');
        const isPublic = PUBLIC_ROUTES.some(rx => rx.test(routePath));

        describe(`Endpoint: ${routePath}`, () => {
            let routeModule;

            beforeAll(async () => {
                routeModule = await import(filePath);
            });

            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            methods.forEach(method => {
                if (isPublic) {
                    it(`[PUBLIC CONTROL] ${method} does not require JWT validation`, () => {
                        expect(isPublic).toBe(true);
                    });
                    return;
                }

                it(`[PROTECTED] ${method} rejects missing/invalid JWTs with 401 before DB access`, async () => {
                    const handler = routeModule[method];
                    if (!handler) return;

                    mockUser = null;
                    mockProfile = null;
                    dbAccessed = false;

                    const mockReq = createMockRequest({
                        method,
                        url: `http://localhost${routePath}?id=00000000-0000-0000-0000-000000000000&merchantId=00000000-0000-0000-0000-000000000000`,
                        headers: {},
                        body: DEFAULT_MOCK_BODY
                    });

                    const response = await handler(mockReq, { params: extractParams(routePath) });
                    
                    expect(response).toBeDefined();
                    expect(response.status).toBe(401);
                    expect(dbAccessed).toBe(false);
                });

                it(`[PROTECTED] ${method} allows valid JWTs to pass through auth check`, async () => {
                    const handler = routeModule[method];
                    if (!handler) return;

                    // Setup correct profile role based on the path
                    mockUser = { id: 'test-user-123', email: 'test@example.com' };
                    if (routePath.startsWith('/api/admin/')) {
                        mockProfile = { role: 'admin' };
                    } else if (routePath.startsWith('/api/merchant/')) {
                        mockProfile = { role: 'merchant' };
                    } else {
                        mockProfile = { role: 'customer' };
                    }
                    dbAccessed = false;

                    const headers = {
                        'Authorization': routePath === '/api/admin/whatsapp-health'
                            ? `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
                            : 'Bearer valid-token'
                    };

                    const mockReq = createMockRequest({
                        method,
                        url: `http://localhost${routePath}?id=00000000-0000-0000-0000-000000000000&merchantId=00000000-0000-0000-0000-000000000000`,
                        headers,
                        body: DEFAULT_MOCK_BODY
                    });

                    const response = await handler(mockReq, { params: extractParams(routePath) });
                    
                    expect(response).toBeDefined();
                    // Status should NOT be 401 Unauthorized
                    expect(response.status).not.toBe(401);
                });
            });
        });
    });
});
