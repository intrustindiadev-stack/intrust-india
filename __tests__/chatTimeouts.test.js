import { buildUserContext } from '../lib/chat/buildContext';
import { buildMerchantContext } from '../lib/chat/merchantBuildContext';

describe('Context Build Timeouts', () => {
  let mockAdminClient;

  beforeEach(() => {
    mockAdminClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => {
        // Return a promise that takes a long time
        return new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 10000));
      }),
      maybeSingle: jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 10000));
      }),
    };
  });

  it('should resolve buildUserContext with partial context after 5 seconds timeout', async () => {
    const startTime = Date.now();
    const context = await buildUserContext(mockAdminClient, 'test-user');
    const duration = Date.now() - startTime;
    expect(duration).toBeGreaterThanOrEqual(5000);
    expect(duration).toBeLessThan(5500);
    expect(context).toHaveProperty('firstName');
    expect(context.firstName).toBe('Customer');
  }, 10000);

  it('should resolve buildMerchantContext with partial context after 5 seconds timeout', async () => {
    const startTime = Date.now();
    const context = await buildMerchantContext(mockAdminClient, 'test-merchant');
    const duration = Date.now() - startTime;
    expect(duration).toBeGreaterThanOrEqual(5000);
    expect(duration).toBeLessThan(5500);
    expect(context).toHaveProperty('firstName');
    expect(context.firstName).toBe('Merchant');
  }, 10000);
});
