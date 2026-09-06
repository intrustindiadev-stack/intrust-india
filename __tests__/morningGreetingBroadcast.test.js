import { broadcastMorningGreeting } from '../lib/notifications/userWhatsapp';
import {
  SYSTEM_BROADCAST_PHONE_HASH,
  FALLBACK_DAILY_QUOTES,
  getFallbackDailyQuote,
} from '../lib/notifications/whatsappConstants';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendTemplateMessage } from '@/lib/omniflow';

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/omniflow', () => {
  const original = jest.requireActual('@/lib/omniflow');
  return {
    ...original,
    sendTemplateMessage: jest.fn(),
  };
});

describe('Good Morning WhatsApp Broadcast Complete Workflow', () => {
  let mockSupabase;
  let mockInsert;
  let mockUpdate;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    sendTemplateMessage.mockResolvedValue({
      success: true,
      messageId: 'mock-wamid-gm-123',
    });
  });

  it('verifies that SYSTEM_BROADCAST_PHONE_HASH cannot collide with SHA-256 phone hashes', () => {
    expect(SYSTEM_BROADCAST_PHONE_HASH).toBe('SYSTEM_BROADCAST_AUDIT');
    // Real SHA-256 is 64 lowercase hex characters
    expect(SYSTEM_BROADCAST_PHONE_HASH).not.toMatch(/^[0-9a-f]{64}$/);
    expect(SYSTEM_BROADCAST_PHONE_HASH.length).not.toBe(64);
  });

  it('executes broadcast using fallback quote when daily_quotes has no scheduled row', async () => {
    const mockBindings = [
      { user_id: 'user-1', phone: '+919876543210', audience: 'customer' },
      { user_id: 'user-2', phone: '+919876543211', audience: 'merchant' },
    ];

    const mockProfiles = [
      { id: 'user-1', full_name: 'Aditi Sharma' },
    ];
    const mockMerchants = [
      { id: 'user-2', business_name: 'Sharma Traders' },
    ];

    mockSupabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table === 'daily_quotes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            update: mockUpdate,
          };
        }
        if (table === 'user_channel_bindings') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation((col, val) => {
              return {
                eq: jest.fn().mockResolvedValue({ data: mockBindings, error: null }),
              };
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        if (table === 'merchants') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: mockMerchants, error: null }),
          };
        }
        if (table === 'whatsapp_message_logs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockInsert,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: mockInsert,
        };
      }),
    };

    createAdminClient.mockReturnValue(mockSupabase);

    const result = await broadcastMorningGreeting();

    expect(result.quote_id).toBe('fallback');
    expect(result.sent).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);

    // Verify sendTemplateMessage called with intrust_gm_quote_v1
    expect(sendTemplateMessage).toHaveBeenCalledTimes(2);
    expect(sendTemplateMessage).toHaveBeenCalledWith(
      '+919876543210',
      'intrust_gm_quote_v1',
      'en_US',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'body',
          parameters: expect.arrayContaining([
            { type: 'text', text: 'Aditi' },
            expect.objectContaining({ type: 'text' }),
          ]),
        }),
      ])
    );

    // daily_quotes should NOT be marked as sent because fallback was used
    expect(mockUpdate).not.toHaveBeenCalled();

    // Verify system audit row was inserted with SYSTEM_BROADCAST_PHONE_HASH
    const auditRows = mockInsert.mock.calls
      .map(c => c[0])
      .filter(row => row.phone_hash === SYSTEM_BROADCAST_PHONE_HASH);
    expect(auditRows.length).toBe(1);
    expect(auditRows[0].status).toBe('sent');
    expect(auditRows[0].user_id).toBeNull();
  });

  it('executes broadcast using scheduled quote when daily_quotes has a scheduled row and marks it sent', async () => {
    const scheduledQuote = {
      id: 'scheduled-uuid-999',
      quote_text: 'Courage is grace under pressure.',
    };

    const mockBindings = [
      { user_id: 'user-1', phone: '+919876543210', audience: 'customer' },
    ];

    const mockUpdateFn = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table === 'daily_quotes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: scheduledQuote, error: null }),
            update: mockUpdateFn,
          };
        }
        if (table === 'user_channel_bindings') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockResolvedValue({ data: mockBindings, error: null }),
            })),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [{ id: 'user-1', full_name: 'Rahul Kumar' }], error: null }),
          };
        }
        if (table === 'merchants') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'whatsapp_message_logs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockInsert,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: mockInsert,
        };
      }),
    };

    createAdminClient.mockReturnValue(mockSupabase);

    const result = await broadcastMorningGreeting();

    expect(result.quote_id).toBe('scheduled-uuid-999');
    expect(result.sent).toBe(1);

    // Verify daily_quotes was updated to 'sent'
    expect(mockUpdateFn).toHaveBeenCalledWith({ status: 'sent' });

    // Verify Omniflow called with the custom quote text
    expect(sendTemplateMessage).toHaveBeenCalledWith(
      '+919876543210',
      'intrust_gm_quote_v1',
      'en_US',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'body',
          parameters: [
            { type: 'text', text: 'Rahul' },
            { type: 'text', text: 'Courage is grace under pressure.' },
          ],
        }),
      ])
    );
  });

  it('deduplicates and skips recipients who already received the broadcast today', async () => {
    const mockBindings = [
      { user_id: 'user-1', phone: '+919876543210', audience: 'customer' },
    ];

    mockSupabase = {
      from: jest.fn().mockImplementation((table) => {
        if (table === 'daily_quotes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            update: mockUpdate,
          };
        }
        if (table === 'user_channel_bindings') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockResolvedValue({ data: mockBindings, error: null }),
            })),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'whatsapp_message_logs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            // Simulate existing send for today!
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-log-123' }, error: null }),
            insert: mockInsert,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: mockInsert,
        };
      }),
    };

    createAdminClient.mockReturnValue(mockSupabase);

    const result = await broadcastMorningGreeting();

    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    // sendTemplateMessage should NOT have been called
    expect(sendTemplateMessage).not.toHaveBeenCalled();
  });
});
