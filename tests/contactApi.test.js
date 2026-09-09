/**
 * tests/contactApi.test.js
 *
 * Verifies that POST /api/contact validates inputs, saves to Supabase,
 * and calls the migrated sendContactNotification helper.
 */

jest.mock('server-only', () => ({}), { virtual: true });

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();

jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(() => ({
        from: jest.fn((table) => {
            if (table === 'contact_messages') {
                return {
                    insert: mockInsert.mockReturnValue({
                        select: jest.fn().mockReturnValue({
                            maybeSingle: jest.fn().mockResolvedValue({
                                data: { id: 'msg-uuid-123' },
                                error: null,
                            }),
                        }),
                    }),
                    update: mockUpdate.mockReturnValue({
                        eq: mockEq.mockResolvedValue({ error: null }),
                    }),
                };
            }
            return {};
        }),
    })),
}));

const mockSendContactNotification = jest.fn();
jest.mock('@/lib/email/sendContactNotification', () => ({
    sendContactNotification: (...args) => mockSendContactNotification(...args),
}));

import { POST } from '../app/api/contact/route.js';

describe('POST /api/contact API Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rejects submissions with missing fields', async () => {
        const req = new Request('http://localhost:3000/api/contact', {
            method: 'POST',
            body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toContain('All fields are required');
        expect(mockSendContactNotification).not.toHaveBeenCalled();
    });

    it('rejects invalid email formats', async () => {
        const req = new Request('http://localhost:3000/api/contact', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Test',
                email: 'invalid-email',
                subject: 'Help',
                message: 'Hello',
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Invalid email address.');
        expect(mockSendContactNotification).not.toHaveBeenCalled();
    });

    it('silently ignores honeypot submissions from bots', async () => {
        const req = new Request('http://localhost:3000/api/contact', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Bot',
                email: 'bot@example.com',
                subject: 'Spam',
                message: 'Spam content',
                company: 'Bot Inc',
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockInsert).not.toHaveBeenCalled();
        expect(mockSendContactNotification).not.toHaveBeenCalled();
    });

    it('saves valid submission to database and dispatches notification email', async () => {
        mockSendContactNotification.mockResolvedValueOnce({
            success: true,
            messageId: '<test-msg-id@intrust>',
        });

        const req = new Request('http://localhost:3000/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Ananya Roy',
                email: 'ANANYA@Example.com ',
                subject: 'Project Consultation',
                message: 'I would like to discuss a solar rooftop installation.',
            }),
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Ananya Roy',
                email: 'ananya@example.com',
                subject: 'Project Consultation',
                message: 'I would like to discuss a solar rooftop installation.',
            })
        );

        expect(mockSendContactNotification).toHaveBeenCalledWith({
            name: 'Ananya Roy',
            email: 'ananya@example.com',
            subject: 'Project Consultation',
            message: 'I would like to discuss a solar rooftop installation.',
        });

        expect(mockUpdate).toHaveBeenCalledWith({ email_sent: true });
    });
});
