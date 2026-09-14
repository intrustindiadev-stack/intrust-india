import { getAdminNotificationSettings, sendAdminWhatsAppNotification } from '../lib/notifications/adminAlerts';
import * as omniflow from '../lib/omniflow';

jest.mock('../lib/omniflow', () => ({
    sendWhatsAppMessage: jest.fn().mockResolvedValue({ messageId: 'wa-msg-123' }),
    normalisePhone: jest.fn(phone => (phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`)),
}));

jest.mock('../lib/supabaseServer', () => ({
    createAdminClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
                data: [
                    { key: 'admin_notification_email', value: 'kapildubey0626@gmail.com' },
                    { key: 'admin_notification_phone', value: '+919755900467' },
                    { key: 'admin_whatsapp_alerts_enabled', value: 'true' },
                    { key: 'admin_email_alerts_enabled', value: 'true' },
                ],
            }),
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
    })),
}));

describe('Admin Alerts Notification Infrastructure', () => {
    it('retrieves dedicated admin notification settings correctly', async () => {
        const config = await getAdminNotificationSettings();
        expect(config.email).toBe('kapildubey0626@gmail.com');
        expect(config.phone).toBe('+919755900467');
        expect(config.whatsappEnabled).toBe(true);
        expect(config.emailEnabled).toBe(true);
    });

    it('dispatches admin WhatsApp alert with formatted details', async () => {
        const result = await sendAdminWhatsAppNotification({
            title: 'New Shopping Order Placed',
            details: {
                'Order ID': 'ORD12345',
                'Amount': '₹1,499.00',
                'Customer': 'Test Customer',
            },
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe('wa-msg-123');
        expect(omniflow.sendWhatsAppMessage).toHaveBeenCalledWith(
            '+919755900467',
            expect.stringContaining('New Shopping Order Placed')
        );
        expect(omniflow.sendWhatsAppMessage).toHaveBeenCalledWith(
            '+919755900467',
            expect.stringContaining('ORD12345')
        );
    });
});
