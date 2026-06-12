import { ensureWhatsAppBinding } from '../lib/whatsapp/ensureBinding';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendWhatsAppWelcomeOnLink } from '@/lib/notifications/authWhatsapp';

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/notifications/authWhatsapp', () => ({
  sendWhatsAppWelcomeOnLink: jest.fn(),
}));

describe('ensureWhatsAppBinding Unit Tests', () => {
  let mockSupabase;
  let mockState;

  beforeEach(() => {
    jest.clearAllMocks();

    mockState = {
      user_profiles: [],
      merchants: [],
      user_channel_bindings: [],
      merchant_notification_settings: [],
      upserts: {},
    };

    const makeQueryBuilder = (tableName) => {
      const builder = {};
      const filters = {};

      builder.select = jest.fn().mockReturnValue(builder);
      builder.eq = jest.fn().mockImplementation((col, val) => {
        filters[col] = val;
        return builder;
      });

      builder.single = jest.fn().mockImplementation(async () => {
        const list = mockState[tableName] || [];
        const found = list.find((row) =>
          Object.entries(filters).every(([col, val]) => row[col] === val)
        );
        if (!found) {
          return { data: null, error: new Error(`${tableName} row not found`) };
        }
        return { data: found, error: null };
      });

      builder.maybeSingle = jest.fn().mockImplementation(async () => {
        const list = mockState[tableName] || [];
        const found = list.find((row) =>
          Object.entries(filters).every(([col, val]) => row[col] === val)
        );
        return { data: found || null, error: null };
      });

      builder.upsert = jest.fn().mockImplementation(async (payload) => {
        if (!mockState.upserts[tableName]) {
          mockState.upserts[tableName] = [];
        }
        mockState.upserts[tableName].push(payload);
        return { error: null };
      });

      return builder;
    };

    mockSupabase = {
      from: jest.fn().mockImplementation((tableName) => makeQueryBuilder(tableName)),
    };

    createAdminClient.mockReturnValue(mockSupabase);
  });

  it('Case 1: Customer role, brand-new binding -> triggers welcome', async () => {
    mockState.user_profiles.push({
      id: 'user-c1',
      role: 'customer',
      phone: '+919999988888',
    });

    const res = await ensureWhatsAppBinding({ userId: 'user-c1' });

    expect(res).toEqual({
      linked: true,
      phone: '+919999988888',
      audience: 'customer',
      isNewLink: true,
    });

    expect(sendWhatsAppWelcomeOnLink).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppWelcomeOnLink).toHaveBeenCalledWith({
      userId: 'user-c1',
      audience: 'customer',
      phone: '+919999988888',
    });
  });

  it('Case 2: Customer role, existing binding -> does NOT trigger welcome', async () => {
    mockState.user_profiles.push({
      id: 'user-c1',
      role: 'customer',
      phone: '+919999988888',
    });
    mockState.user_channel_bindings.push({
      user_id: 'user-c1',
      audience: 'customer',
      phone: '+919999988888',
    });

    const res = await ensureWhatsAppBinding({ userId: 'user-c1' });

    expect(res).toEqual({
      linked: true,
      phone: '+919999988888',
      audience: 'customer',
      isNewLink: false,
    });

    expect(sendWhatsAppWelcomeOnLink).not.toHaveBeenCalled();
  });

  it('Case 3: Merchant role, brand-new binding -> triggers merchant welcome with business phone', async () => {
    mockState.user_profiles.push({
      id: 'user-m1',
      role: 'merchant',
      phone: '+919999988888',
    });
    mockState.merchants.push({
      id: 'merchant-1',
      user_id: 'user-m1',
      business_phone: '0987654321', // normalises to +910987654321 or similar E.164 depending on local helper rules
    });

    const res = await ensureWhatsAppBinding({ userId: 'user-m1' });

    expect(res).toEqual({
      linked: true,
      phone: '+910987654321',
      audience: 'merchant',
      isNewLink: true,
    });

    expect(sendWhatsAppWelcomeOnLink).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppWelcomeOnLink).toHaveBeenCalledWith({
      userId: 'user-m1',
      audience: 'merchant',
      phone: '+910987654321',
    });

    // Check that merchant notification settings upsert was called
    expect(mockState.upserts.merchant_notification_settings).toHaveLength(1);
    expect(mockState.upserts.merchant_notification_settings[0]).toMatchObject({
      merchant_id: 'merchant-1',
      whatsapp_order_alerts: true,
    });
  });

  it('Case 4: Early returns and failures return isNewLink=false', async () => {
    // 4A: Profile not found
    const resNoProfile = await ensureWhatsAppBinding({ userId: 'non-existent' });
    expect(resNoProfile).toEqual({
      linked: false,
      phone: null,
      audience: null,
      isNewLink: false,
    });

    // 4B: Profile has no phone
    mockState.user_profiles.push({
      id: 'user-no-phone',
      role: 'customer',
      phone: null,
    });
    const resNoPhone = await ensureWhatsAppBinding({ userId: 'user-no-phone' });
    expect(resNoPhone).toEqual({
      linked: false,
      phone: null,
      audience: 'customer',
      isNewLink: false,
    });
  });

  it('Case 5: Welcome function throws error -> function does not throw', async () => {
    mockState.user_profiles.push({
      id: 'user-c1',
      role: 'customer',
      phone: '+919999988888',
    });

    sendWhatsAppWelcomeOnLink.mockRejectedValueOnce(new Error('Omniflow send failed'));

    const res = await ensureWhatsAppBinding({ userId: 'user-c1' });

    expect(res).toEqual({
      linked: true,
      phone: '+919999988888',
      audience: 'customer',
      isNewLink: true,
    });

    expect(sendWhatsAppWelcomeOnLink).toHaveBeenCalledTimes(1);
  });
});
