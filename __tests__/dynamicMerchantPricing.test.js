import { buildMerchantSubscriptionPlans, resolveMerchantPlanPaise } from '@/lib/merchant/subscriptionPricing';
import { validatePricingSettings } from '@/lib/pricing/validate';
import { MERCHANT_SUBSCRIPTION_PLANS } from '@/lib/constants';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';
import { POST } from '@/app/api/sabpaisa/initiate/route';

// Mocks
jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn()
}));

jest.mock('@supabase/supabase-js', () => {
    return {
        createClient: jest.fn()
    };
});

jest.mock('@/lib/sabpaisa/payload', () => ({
    buildEncryptedPayload: jest.fn().mockReturnValue('mock_encrypted_data')
}));

jest.mock('@/lib/sabpaisa/config', () => ({
    sabpaisaConfig: { initUrl: 'http://test', clientCode: 'TEST' },
    validateCallbackConfig: jest.fn().mockReturnValue(null)
}));

jest.mock('@/lib/merchant/validatePayerContact', () => ({
    validatePayerContact: jest.fn().mockReturnValue({ errors: {} })
}));

// We mock getPricingSettings explicitly for the initiate route test
jest.mock('@/app/(admin)/admin/settings/actions', () => {
    const originalModule = jest.requireActual('@/app/(admin)/admin/settings/actions');
    return {
        __esModule: true,
        ...originalModule,
        getPricingSettings: jest.fn()
    };
});

// Provide standard Node Request/Response objects if missing in test env
if (typeof Request === 'undefined') {
    global.Request = class Request {
        constructor(url, options) {
            this.url = url;
            this.method = options.method;
            this.headers = new Map(Object.entries(options.headers || {}));
            this.headers.get = (k) => options.headers[k];
            this._body = options.body;
        }
        async json() { return JSON.parse(this._body); }
    };
}
if (typeof Response === 'undefined') {
    global.Response = class Response {
        constructor(body, options) {
            this._body = body;
            this.status = options?.status || 200;
        }
        async json() { return typeof this._body === 'string' ? JSON.parse(this._body) : this._body; }
    };
}

// Next.js NextResponse mock
jest.mock('next/server', () => ({
    NextResponse: {
        json: (body, init) => ({
            status: init?.status || 200,
            json: async () => body
        })
    }
}));

// Setting env vars for the test
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

describe('Dynamic Merchant Pricing Engine', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('subscriptionPricing helper', () => {
        const mockPricing = {
            sub1m: 100,
            sub6m: 500,
            sub12m: 900
        };

        it('buildMerchantSubscriptionPlans maps DB prices correctly while preserving static data', () => {
            const plans = buildMerchantSubscriptionPlans(mockPricing);
            expect(plans.length).toBe(3);
            expect(plans[0].price).toBe(100);
            expect(plans[0].priceFormatted).toBe('100.00');
            expect(plans[0].key).toBe(MERCHANT_SUBSCRIPTION_PLANS[0].key);
            expect(plans[0].label).toBe(MERCHANT_SUBSCRIPTION_PLANS[0].label);
            expect(plans[0].durationDays).toBe(MERCHANT_SUBSCRIPTION_PLANS[0].durationDays);
        });

        it('resolveMerchantPlanPaise returns correct paise and null for unknown', () => {
            expect(resolveMerchantPlanPaise(mockPricing, 'MSUB_1M')).toBe(10000);
            expect(resolveMerchantPlanPaise(mockPricing, 'MSUB_6M')).toBe(50000);
            expect(resolveMerchantPlanPaise(mockPricing, 'UNKNOWN')).toBeNull();
        });
    });

    describe('validatePricingSettings', () => {
        it('accepts valid input', () => {
            const valid = { sub1m: 100, sub6m: 500, sub12m: 900, autoFirst: 100, autoRenewal: 200, merchantReferralPrize: 50 };
            expect(validatePricingSettings(valid)).toBeNull();
        });

        it('rejects negative, zero, non-integer, and out-of-bounds', () => {
            const base = { sub1m: 100, sub6m: 500, sub12m: 900, autoFirst: 100, autoRenewal: 200, merchantReferralPrize: 50 };
            expect(validatePricingSettings({ ...base, sub1m: 0 })).toContain('greater than 0');
            expect(validatePricingSettings({ ...base, sub6m: -10 })).toContain('greater than 0');
            expect(validatePricingSettings({ ...base, sub12m: 10.5 })).toContain('whole number');
            expect(validatePricingSettings({ ...base, sub1m: 200000 })).toContain('cannot exceed');
            expect(validatePricingSettings({ ...base, merchantReferralPrize: -1 })).toContain('between 0 and 10000');
            expect(validatePricingSettings({ ...base, merchantReferralPrize: 20000 })).toContain('between 0 and 10000');
        });
    });

    describe('getPricingSettings', () => {
        const { createAdminClient } = require('@/lib/supabaseServer');

        it('respects an explicit 0 but falls back on missing/NaN', async () => {
            const mockSelect = jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                    data: [
                        { key: 'merchant_sub_price_1m', value: '150' },
                        { key: 'auto_mode_price_first', value: '0' },
                        { key: 'merchant_sub_price_6m', value: 'INVALID' }
                    ],
                    error: null
                })
            });
            createAdminClient.mockReturnValue({
                from: jest.fn().mockReturnValue({ select: mockSelect })
            });

            // Require actual getPricingSettings to test its real logic
            const actualActions = jest.requireActual('@/app/(admin)/admin/settings/actions');
            const pricing = await actualActions.getPricingSettings();

            expect(pricing.sub1m).toBe(150);
            expect(pricing.autoFirst).toBe(0); // explicit 0 respected
            expect(pricing.sub6m).toBe(1999); // NaN fallbacks to default
            expect(pricing.sub12m).toBe(3999); // missing fallbacks to default
        });
    });

    describe('SabPaisa Initiate Route', () => {
        const { createClient } = require('@supabase/supabase-js');
        const { getPricingSettings } = require('@/app/(admin)/admin/settings/actions');

        it('stamps expected_amount_paise from admin-set value, not constant', async () => {
            const mockDynamicPriceRupees = 777;
            const expectedPaise = 77700;

            getPricingSettings.mockResolvedValue({
                sub1m: mockDynamicPriceRupees,
                sub6m: 500,
                sub12m: 900
            });

            // Mock context client
            const mockContextClient = {
                auth: {
                    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_123' } }, error: null })
                }
            };

            // Mock admin client
            const mockSingle = jest.fn();
            const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
            const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
            const mockInsert = jest.fn().mockResolvedValue({ error: null });
            
            const mockAdminClient = {
                from: jest.fn((table) => {
                    if (table === 'merchants') {
                        // Return the owner
                        mockSingle.mockResolvedValueOnce({ data: { user_id: 'user_123' }, error: null });
                        return { select: mockSelect };
                    }
                    if (table === 'transactions') {
                        return { insert: mockInsert };
                    }
                    return { select: mockSelect, insert: mockInsert };
                })
            };

            createClient.mockImplementation((url, key) => {
                if (key === 'service') return mockAdminClient;
                return mockContextClient;
            });

            const req = new Request('http://localhost/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer test_token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    udf1: 'MERCHANT_SUBSCRIPTION',
                    udf2: 'merch_123',
                    udf3: 'MSUB_1M',
                    payerEmail: 'test@example.com',
                    payerMobile: '9999999999',
                    clientTxnId: 'TXN_TEST_123',
                    amount: '1.00' // Gateway amount, gets overridden
                })
            });

            const res = await POST(req);
            const json = await res.json();
            
            expect(res.status).toBe(200);
            expect(json.encData).toBe('mock_encrypted_data');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    expected_amount_paise: expectedPaise,
                    udf1: 'MERCHANT_SUBSCRIPTION',
                    udf3: 'MSUB_1M'
                })
            );

            // Expect getPricingSettings was called
            expect(getPricingSettings).toHaveBeenCalled();
        });
        
        it('rejects unknown plan keys', async () => {
            getPricingSettings.mockResolvedValue({ sub1m: 100 });
            
            const mockContextClient = {
                auth: {
                    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_123' } }, error: null })
                }
            };
            const mockSingle = jest.fn().mockResolvedValue({ data: { user_id: 'user_123' }, error: null });
            const mockAdminClient = {
                from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) }) })
            };
            createClient.mockImplementation((url, key) => key === 'service' ? mockAdminClient : mockContextClient);

            const req = new Request('http://localhost/api/sabpaisa/initiate', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer test_token',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    udf1: 'MERCHANT_SUBSCRIPTION',
                    udf2: 'merch_123',
                    udf3: 'MSUB_INVALID',
                    payerEmail: 'test@example.com',
                    payerMobile: '9999999999',
                    clientTxnId: 'TXN_TEST_123',
                    amount: '1.00'
                })
            });

            const res = await POST(req);
            const json = await res.json();
            
            expect(res.status).toBe(400);
            expect(json.error).toBe('Invalid subscription plan selection.');
        });
    });
});
