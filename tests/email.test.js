/**
 * tests/email.test.js
 *
 * Comprehensive unit and regression test suite for InTrust India's
 * centralized transactional email architecture.
 */

// Mock server-only so tests can run in standard Jest Node environment
jest.mock('server-only', () => ({}), { virtual: true });

// Mock nodemailer
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockClose = jest.fn();

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: mockSendMail,
        verify: mockVerify,
        close: mockClose,
    })),
}));

import nodemailer from 'nodemailer';
import {
    getEmailConfig,
    validateEmailConfig,
    EMAIL_SENDERS,
    ALLOWED_SENDER_KEYS,
    isValidSenderKey,
    resolveSenderIdentity,
} from '../lib/email/emailConfig.js';
import {
    getMailTransporter,
    resetMailTransporter,
    verifySmtpConnection,
} from '../lib/email/mailClient.js';
import {
    sendEmail,
    EmailError,
    maskEmail,
} from '../lib/email/sendEmail.js';
import {
    contactNotificationTemplate,
} from '../lib/email/templates/contactNotification.js';
import {
    sendContactNotification,
} from '../lib/email/sendContactNotification.js';
import {
    getMailTransporter as mailerGetTransporter,
    resetMailTransporter as mailerResetTransporter,
    verifySmtpConnection as mailerVerifySmtp,
} from '../lib/email/mailer.js';
import {
    fireAndForgetEmail,
    safeEmail,
} from '../lib/email/dispatch.js';
import {
    baseEmailLayout,
    escapeHtml,
} from '../lib/email/templates/layout.js';
import {
    sendCustomerOrderEmail,
    sendMerchantAlert,
    sendAdminAlert,
    sendHRMAlert,
    sendEmployeeAlert,
    sendCRMAlert,
    sendAuthEmail,
} from '../lib/email/index.js';

describe('Transactional Email Infrastructure', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        resetMailTransporter();
        process.env = { ...originalEnv };
        // Default clean state
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_PORT;
        delete process.env.SMTP_SECURE;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
        delete process.env.MAIL_FROM_EMAIL;
        delete process.env.MAIL_FROM_NAME;
        delete process.env.MAIL_REPLY_TO;
        delete process.env.CONTACT_FROM_EMAIL;
        delete process.env.CONTACT_NOTIFICATION_EMAIL;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('1. Configuration Loader & Defaults (emailConfig.js)', () => {
        it('applies professional InTrust India defaults when env vars are missing', () => {
            const config = getEmailConfig();

            expect(config.fromEmail).toBe('hello@intrustindia.com');
            expect(config.fromName).toBe('InTrust India');
            expect(config.replyTo).toBe('hello@intrustindia.com');
            expect(config.contactNotificationEmail).toBe('hello@intrustindia.com');
            expect(config.port).toBe(587);
            expect(config.secure).toBe(false);
            expect(config.host).toBe('');
            expect(config.auth.user).toBe('');
            expect(config.auth.pass).toBe('');
        });

        it('supports port 465 with implicit SSL/TLS', () => {
            process.env.SMTP_PORT = '465';
            const config = getEmailConfig();

            expect(config.port).toBe(465);
            expect(config.secure).toBe(true);
        });

        it('supports explicit SMTP_SECURE=true for TLS', () => {
            process.env.SMTP_PORT = '587';
            process.env.SMTP_SECURE = 'true';
            const config = getEmailConfig();

            expect(config.port).toBe(587);
            expect(config.secure).toBe(true);
        });

        it('preserves backward compatibility with CONTACT_FROM_EMAIL', () => {
            process.env.CONTACT_FROM_EMAIL = 'contact-legacy@intrustindia.com';
            const config = getEmailConfig();

            expect(config.fromEmail).toBe('contact-legacy@intrustindia.com');
        });

        it('MAIL_FROM_EMAIL takes precedence over CONTACT_FROM_EMAIL', () => {
            process.env.CONTACT_FROM_EMAIL = 'contact-legacy@intrustindia.com';
            process.env.MAIL_FROM_EMAIL = 'hello@intrustindia.com';
            const config = getEmailConfig();

            expect(config.fromEmail).toBe('hello@intrustindia.com');
        });

        it('validates required SMTP configuration fields', () => {
            // Missing all
            expect(() => validateEmailConfig()).toThrow('Missing required SMTP configuration: SMTP_HOST, SMTP_USER, SMTP_PASS');

            // Missing only password
            process.env.SMTP_HOST = 'smtp.intrustindia.com';
            process.env.SMTP_USER = 'hello@intrustindia.com';
            expect(() => validateEmailConfig()).toThrow('Missing required SMTP configuration: SMTP_PASS');

            // All present
            process.env.SMTP_PASS = 'secret_password';
            const valid = validateEmailConfig();
            expect(valid.host).toBe('smtp.intrustindia.com');
            expect(valid.auth.user).toBe('hello@intrustindia.com');
            expect(valid.auth.pass).toBe('secret_password');
        });

        it('defines all 8 centralized sender identities correctly', () => {
            expect(ALLOWED_SENDER_KEYS).toEqual([
                'default',
                'info',
                'support',
                'accounts',
                'hr',
                'orders',
                'notifications',
                'security',
            ]);

            expect(EMAIL_SENDERS.default).toEqual({ email: 'hello@intrustindia.com', name: 'InTrust India' });
            expect(EMAIL_SENDERS.info).toEqual({ email: 'info@intrustindia.com', name: 'InTrust India' });
            expect(EMAIL_SENDERS.support).toEqual({ email: 'support@intrustindia.com', name: 'InTrust India Support' });
            expect(EMAIL_SENDERS.accounts).toEqual({ email: 'accounts@intrustindia.com', name: 'InTrust India Accounts' });
            expect(EMAIL_SENDERS.hr).toEqual({ email: 'hr@intrustindia.com', name: 'InTrust India HR' });
            expect(EMAIL_SENDERS.orders).toEqual({ email: 'orders@intrustindia.com', name: 'InTrust India Orders' });
            expect(EMAIL_SENDERS.notifications).toEqual({ email: 'notifications@intrustindia.com', name: 'InTrust India' });
            expect(EMAIL_SENDERS.security).toEqual({ email: 'security@intrustindia.com', name: 'InTrust India Security' });
        });

        it('validates sender identity keys with isValidSenderKey', () => {
            expect(isValidSenderKey('default')).toBe(true);
            expect(isValidSenderKey('info')).toBe(true);
            expect(isValidSenderKey('support')).toBe(true);
            expect(isValidSenderKey('accounts')).toBe(true);
            expect(isValidSenderKey('hr')).toBe(true);
            expect(isValidSenderKey('orders')).toBe(true);
            expect(isValidSenderKey('notifications')).toBe(true);
            expect(isValidSenderKey('security')).toBe(true);

            expect(isValidSenderKey('random')).toBe(false);
            expect(isValidSenderKey('')).toBe(false);
            expect(isValidSenderKey(null)).toBe(false);
            expect(isValidSenderKey(undefined)).toBe(false);
        });

        it('resolves sender identities cleanly with resolveSenderIdentity', () => {
            // Default
            const def = resolveSenderIdentity();
            expect(def.key).toBe('default');
            expect(def.email).toBe('hello@intrustindia.com');
            expect(def.name).toBe('InTrust India');
            expect(def.formatted).toBe('InTrust India <hello@intrustindia.com>');

            // Support
            const supp = resolveSenderIdentity('support');
            expect(supp.key).toBe('support');
            expect(supp.email).toBe('support@intrustindia.com');
            expect(supp.name).toBe('InTrust India Support');
            expect(supp.formatted).toBe('InTrust India Support <support@intrustindia.com>');

            // Info
            const info = resolveSenderIdentity('info');
            expect(info.key).toBe('info');
            expect(info.email).toBe('info@intrustindia.com');
            expect(info.name).toBe('InTrust India');
            expect(info.formatted).toBe('InTrust India <info@intrustindia.com>');

            // Security
            const sec = resolveSenderIdentity('security');
            expect(sec.key).toBe('security');
            expect(sec.email).toBe('security@intrustindia.com');
            expect(sec.name).toBe('InTrust India Security');
            expect(sec.formatted).toBe('InTrust India Security <security@intrustindia.com>');

            // Invalid throws error
            expect(() => resolveSenderIdentity('invalid')).toThrow(/Invalid sender identity key: "invalid"/);
        });
    });

    describe('2. SMTP Client & Transport Verification (mailClient.js)', () => {
        beforeEach(() => {
            process.env.SMTP_HOST = 'smtp.intrustindia.com';
            process.env.SMTP_USER = 'hello@intrustindia.com';
            process.env.SMTP_PASS = 'mock_pass_123';
        });

        it('lazily initializes and caches the nodemailer transporter', () => {
            const t1 = getMailTransporter();
            const t2 = getMailTransporter();

            expect(t1).toBe(t2);
            expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
            expect(nodemailer.createTransport).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'smtp.intrustindia.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'hello@intrustindia.com',
                        pass: 'mock_pass_123',
                    },
                    connectionTimeout: 10000,
                })
            );
        });

        it('verifies SMTP connection successfully when verify() resolves', async () => {
            mockVerify.mockResolvedValueOnce(true);

            const result = await verifySmtpConnection();

            expect(result.success).toBe(true);
            expect(mockVerify).toHaveBeenCalledTimes(1);
        });

        it('safely handles SMTP verification failure without leaking secrets', async () => {
            const authError = new Error('Invalid login credentials: 535 Authentication failed');
            // @ts-ignore
            authError.code = 'EAUTH';
            mockVerify.mockRejectedValueOnce(authError);

            const result = await verifySmtpConnection();

            expect(result.success).toBe(false);
            expect(result.code).toBe('EAUTH');
            expect(result.error).toContain('Invalid login credentials');
            expect(result.error).not.toContain('mock_pass_123');
        });
    });

    describe('3. Core sendEmail Service (sendEmail.js)', () => {
        beforeEach(() => {
            process.env.SMTP_HOST = 'smtp.intrustindia.com';
            process.env.SMTP_USER = 'hello@intrustindia.com';
            process.env.SMTP_PASS = 'mock_pass_123';
        });

        it('masks email addresses for safe audit logging', () => {
            expect(maskEmail('hello@intrustindia.com')).toBe('he***o@intrustindia.com');
            expect(maskEmail('a@b.com')).toBe('a***@b.com');
            expect(maskEmail('')).toBe('***');
            expect(maskEmail(null)).toBe('***');
        });

        it('validates recipient address format', async () => {
            // Empty
            await expect(sendEmail({ to: '', subject: 'Hi', text: 'Hello' }))
                .rejects.toThrow('At least one recipient email address is required');

            // Invalid format
            await expect(sendEmail({ to: 'invalid-email', subject: 'Hi', text: 'Hello' }))
                .rejects.toThrow(/Invalid recipient email address format/);
        });

        it('validates subject line', async () => {
            await expect(sendEmail({ to: 'test@example.com', subject: '   ', text: 'Hello' }))
                .rejects.toThrow('Email subject is required and cannot be empty');
        });

        it('validates body content', async () => {
            await expect(sendEmail({ to: 'test@example.com', subject: 'Test' }))
                .rejects.toThrow('Either html or text content must be provided');
        });

        it('auto-generates plain-text fallback when only HTML is provided', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: '<msg-123@smtp>' });

            const result = await sendEmail({
                to: 'client@example.com',
                subject: 'Welcome',
                html: '<p>Hello <strong>World</strong>!<br>Welcome to InTrust.</p>',
            });

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('<msg-123@smtp>');
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'client@example.com',
                    subject: 'Welcome',
                    html: '<p>Hello <strong>World</strong>!<br>Welcome to InTrust.</p>',
                    text: expect.stringContaining('Hello World!\nWelcome to InTrust.'),
                })
            );
        });

        it('applies default sender identity "InTrust India <hello@intrustindia.com>"', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: '<msg-456@smtp>' });

            await sendEmail({
                to: 'customer@example.com',
                subject: 'Notice',
                text: 'Account update',
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India <hello@intrustindia.com>',
                    replyTo: 'hello@intrustindia.com',
                })
            );
        });

        it('allows overriding sender and replyTo', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: '<msg-789@smtp>' });

            await sendEmail({
                to: 'customer@example.com',
                from: 'InTrust India Support <support@intrustindia.com>',
                replyTo: 'feedback@intrustindia.com',
                subject: 'Feedback Request',
                text: 'Please rate your experience',
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India Support <support@intrustindia.com>',
                    replyTo: 'feedback@intrustindia.com',
                })
            );
        });

        it.each([
            ['info', 'InTrust India <info@intrustindia.com>', 'info@intrustindia.com'],
            ['support', 'InTrust India Support <support@intrustindia.com>', 'support@intrustindia.com'],
            ['accounts', 'InTrust India Accounts <accounts@intrustindia.com>', 'accounts@intrustindia.com'],
            ['hr', 'InTrust India HR <hr@intrustindia.com>', 'hr@intrustindia.com'],
            ['orders', 'InTrust India Orders <orders@intrustindia.com>', 'orders@intrustindia.com'],
            ['notifications', 'InTrust India <notifications@intrustindia.com>', 'notifications@intrustindia.com'],
            ['security', 'InTrust India Security <security@intrustindia.com>', 'security@intrustindia.com'],
        ])('resolves explicit sender: "%s" to "%s"', async (senderKey, expectedFrom, expectedReplyTo) => {
            mockSendMail.mockResolvedValueOnce({ messageId: `<msg-${senderKey}@smtp>` });

            const result = await sendEmail({
                to: 'client@example.com',
                subject: `Update from ${senderKey}`,
                text: 'Hello',
                sender: senderKey,
            });

            expect(result.success).toBe(true);
            expect(result.sender).toBe(senderKey);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: expectedFrom,
                    replyTo: expectedReplyTo,
                })
            );
        });

        it('rejects invalid or unauthorized sender identity keys with ERR_INVALID_SENDER_IDENTITY', async () => {
            await expect(sendEmail({
                to: 'client@example.com',
                subject: 'Test',
                text: 'Hello',
                sender: 'random',
            })).rejects.toThrow(EmailError);

            await expect(sendEmail({
                to: 'client@example.com',
                subject: 'Test',
                text: 'Hello',
                sender: 'attacker@evil.com',
            })).rejects.toMatchObject({
                code: 'ERR_INVALID_SENDER_IDENTITY',
            });
        });

        it('handles multiple recipients (array or comma-separated)', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: '<msg-multi@smtp>' });

            const result = await sendEmail({
                to: ['a@example.com', 'b@example.com'],
                subject: 'Announcement',
                text: 'System upgrade notice',
            });

            expect(result.recipients).toEqual(['a@example.com', 'b@example.com']);
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'a@example.com, b@example.com',
                })
            );
        });

        it('catches provider send failure and throws a structured EmailError', async () => {
            const networkError = new Error('Connection lost to SMTP server');
            // @ts-ignore
            networkError.code = 'ETIMEDOUT';
            mockSendMail.mockRejectedValueOnce(networkError);

            await expect(sendEmail({
                to: 'client@example.com',
                subject: 'Test Failure',
                text: 'Content',
                category: 'alert',
            })).rejects.toThrow(EmailError);
        });
    });

    describe('4. Contact Form Email Template (contactNotification.js)', () => {
        it('renders branded HTML and structured plain text with escaped input', () => {
            const template = contactNotificationTemplate({
                name: 'Rahul <script>alert(1)</script>',
                email: 'rahul@example.com',
                subject: 'Solar Inquiry & Pricing',
                message: 'Hello,\nI need a 5kW solar system.\nThanks.',
                receivedAt: new Date('2026-09-10T12:00:00Z'),
            });

            expect(template.subject).toBe('[Inquiry] Solar Inquiry & Pricing — Rahul <script>alert(1)</script>');
            // Ensure HTML escaping
            expect(template.html).toContain('Rahul &lt;script&gt;alert(1)&lt;/script&gt;');
            expect(template.html).not.toContain('<script>alert(1)</script>');
            expect(template.html).toContain('Solar Inquiry &amp; Pricing');
            expect(template.html).toContain('rahul@example.com');
            expect(template.html).toContain('Hello,<br>I need a 5kW solar system.<br>Thanks.');
            expect(template.html).toContain('InTrust India');

            // Check text fallback
            expect(template.text).toContain('INTRUST INDIA — NEW CONTACT FORM INQUIRY');
            expect(template.text).toContain('From:        Rahul <script>alert(1)</script>');
            expect(template.text).toContain('Email:       rahul@example.com');
            expect(template.text).toContain('I need a 5kW solar system.');
        });
    });

    describe('5. Contact Notification Migration Adapter (sendContactNotification.js)', () => {
        beforeEach(() => {
            process.env.SMTP_HOST = 'smtp.intrustindia.com';
            process.env.SMTP_USER = 'hello@intrustindia.com';
            process.env.SMTP_PASS = 'mock_pass_123';
        });

        it('dispatches contact notification through sendEmail with info@ sender and submitter reply-to', async () => {
            mockSendMail.mockResolvedValueOnce({ messageId: '<contact-msg-1@smtp>' });

            const res = await sendContactNotification({
                name: 'Priya Verma',
                email: 'priya@example.com',
                subject: 'Partnership Inquiry',
                message: 'We would like to partner with InTrust India.',
            });

            expect(res.success).toBe(true);
            expect(res.category).toBe('contact_notification');
            expect(res.sender).toBe('info');
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India <info@intrustindia.com>',
                    to: 'hello@intrustindia.com',
                    replyTo: 'priya@example.com',
                    subject: expect.stringContaining('Partnership Inquiry'),
                    html: expect.stringContaining('Priya Verma'),
                    text: expect.stringContaining('Priya Verma'),
                })
            );
        });

        it('uses custom CONTACT_NOTIFICATION_EMAIL if specified', async () => {
            process.env.CONTACT_NOTIFICATION_EMAIL = 'support@intrustindia.com';
            mockSendMail.mockResolvedValueOnce({ messageId: '<contact-msg-2@smtp>' });

            await sendContactNotification({
                name: 'Amit Kumar',
                email: 'amit@example.com',
                subject: 'Service Question',
                message: 'How do I track my order?',
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'support@intrustindia.com',
                })
            );
        });
    });

    describe('6. Mailer Alias (mailer.js)', () => {
        it('re-exports transporter methods for spec compliance', () => {
            expect(mailerGetTransporter).toBe(getMailTransporter);
            expect(mailerResetTransporter).toBe(resetMailTransporter);
            expect(mailerVerifySmtp).toBe(verifySmtpConnection);
        });
    });

    describe('7. Non-blocking Dispatcher (dispatch.js)', () => {
        it('fireAndForgetEmail executes fn without throwing or blocking caller', async () => {
            let executed = false;
            const res = fireAndForgetEmail(async () => {
                executed = true;
            }, { category: 'test_cat', entityId: '123' });

            expect(res).toBeUndefined();
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(executed).toBe(true);
        });

        it('fireAndForgetEmail swallows simulated SMTP failures without bubbling errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            expect(() => {
                fireAndForgetEmail(async () => {
                    throw new Error('Simulated SMTP connection drop');
                }, { category: 'simulated_failure', entityId: 'entity-999' });
            }).not.toThrow();

            await new Promise(resolve => setTimeout(resolve, 20));
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[EmailDispatch:simulated_failure]'),
                expect.objectContaining({ category: 'simulated_failure', entityId: 'entity-999' })
            );
            consoleSpy.mockRestore();
        });

        it('safeEmail catches synchronous and asynchronous errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            await safeEmail(async () => {
                throw new Error('Async error inside safeEmail');
            }, { category: 'safe_test' });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[EmailDispatch:safeEmail] Caught error:'),
                expect.objectContaining({ context: { category: 'safe_test' } })
            );
            consoleSpy.mockRestore();
        });
    });

    describe('8. Email Layout & Escaping (templates/layout.js)', () => {
        it('escapeHtml properly sanitizes untrusted input', () => {
            expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            expect(escapeHtml('Hello & "World" \'123\'')).toBe('Hello &amp; &quot;World&quot; &#39;123&#39;');
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });

        it('baseEmailLayout wraps body inside InTrust branded responsive HTML container', () => {
            const html = baseEmailLayout({
                title: 'Order Status Update',
                preheader: 'Your package is on its way',
                bodyHtml: '<p>Your order #123 has been shipped.</p>',
                ctaUrl: 'https://intrustindia.com/orders',
                ctaLabel: 'Track Package',
                footerNote: 'Need help? Contact support.',
            });

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('InTrust');
            expect(html).toContain('Order Status Update');
            expect(html).toContain('Your package is on its way');
            expect(html).toContain('Your order #123 has been shipped.');
            expect(html).toContain('Track Package');
            expect(html).toContain('https://intrustindia.com/orders');
            expect(html).toContain('Need help? Contact support.');
        });
    });

    describe('9. Domain Email Wrappers', () => {
        beforeEach(() => {
            process.env.SMTP_HOST = 'smtp.example.com';
            process.env.SMTP_USER = 'smtp-user';
            process.env.SMTP_PASS = 'smtp-pass';
            mockSendMail.mockResolvedValue({ messageId: '<mock-domain-id@smtp>' });
        });

        it('sendCustomerOrderEmail validates type and dispatches with orders sender', async () => {
            await sendCustomerOrderEmail({
                type: 'order_confirmed',
                to: 'customer@example.com',
                data: {
                    customerName: 'Aarav Sharma',
                    orderId: 'grp_9988776655',
                    orderTotalRs: '1,499.00',
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India Orders <orders@intrustindia.com>',
                    to: 'customer@example.com',
                    subject: expect.stringContaining('Order Confirmed'),
                    html: expect.stringContaining('Aarav Sharma'),
                })
            );
        });

        it('sendCustomerOrderEmail rejects unknown type', async () => {
            await expect(sendCustomerOrderEmail({
                type: 'invalid_type',
                to: 'customer@example.com',
                data: {},
            })).rejects.toThrow('Invalid customer order email type');
        });

        it('sendMerchantAlert dispatches with notifications sender', async () => {
            await sendMerchantAlert({
                type: 'application_received',
                to: 'merchant@example.com',
                data: {
                    businessName: 'Apex Electronics',
                    ownerName: 'Rajesh Gupta',
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India <notifications@intrustindia.com>',
                    to: 'merchant@example.com',
                    subject: expect.stringContaining('Application Received'),
                    html: expect.stringContaining('Apex Electronics'),
                })
            );
        });

        it('sendAdminAlert dispatches with notifications sender to ADMIN_NOTIFICATION_EMAIL', async () => {
            process.env.ADMIN_NOTIFICATION_EMAIL = 'admin-ops@intrustindia.com';
            await sendAdminAlert({
                type: 'new_merchant_application',
                data: {
                    businessName: 'Zenith Retail',
                    ownerName: 'Sunita Rao',
                    phone: '+919876543210',
                    email: 'sunita@example.com',
                    applicationId: 'app_123',
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India <notifications@intrustindia.com>',
                    to: 'admin-ops@intrustindia.com',
                    subject: expect.stringContaining('New Merchant Application'),
                    html: expect.stringContaining('Zenith Retail'),
                })
            );
        });

        it('sendHRMAlert dispatches with hr sender', async () => {
            await sendHRMAlert({
                type: 'leave_applied',
                to: 'hr-manager@intrustindia.com',
                data: {
                    employeeName: 'Rohan Mehra',
                    department: 'Engineering',
                    leaveType: 'casual',
                    fromDate: '2026-10-01',
                    toDate: '2026-10-03',
                    reason: 'Personal family event',
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India HR <hr@intrustindia.com>',
                    to: 'hr-manager@intrustindia.com',
                    subject: expect.stringContaining('New Leave Request'),
                    html: expect.stringContaining('Rohan Mehra'),
                })
            );
        });

        it('sendEmployeeAlert dispatches leave and payroll decisions with hr and accounts sender', async () => {
            await sendEmployeeAlert({
                type: 'leave_decision',
                to: 'employee@intrustindia.com',
                data: {
                    employeeName: 'Rohan Mehra',
                    leaveType: 'casual',
                    fromDate: '2026-10-01',
                    toDate: '2026-10-03',
                    action: 'approved',
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India HR <hr@intrustindia.com>',
                    to: 'employee@intrustindia.com',
                    subject: expect.stringContaining('Leave Request Approved'),
                })
            );

            await sendEmployeeAlert({
                type: 'salary_processed',
                to: 'employee@intrustindia.com',
                data: {
                    employeeName: 'Rohan Mehra',
                    monthName: 'September',
                    year: 2026,
                    netSalaryRs: 75000,
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India Accounts <accounts@intrustindia.com>',
                    to: 'employee@intrustindia.com',
                    subject: expect.stringContaining('Payslip Processed'),
                })
            );
        });

        it('sendCRMAlert dispatches with notifications sender', async () => {
            await sendCRMAlert({
                type: 'lead_assigned',
                to: 'rep@intrustindia.com',
                data: {
                    repName: 'Vikram Patel',
                    count: 15,
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India <notifications@intrustindia.com>',
                    to: 'rep@intrustindia.com',
                    subject: expect.stringContaining('Leads Assigned'),
                })
            );
        });

        it('sendAuthEmail dispatches welcome with security sender', async () => {
            await sendAuthEmail({
                type: 'welcome',
                to: 'newuser@example.com',
                data: {
                    fullName: 'Neha Kapoor',
                    email: 'newuser@example.com',
                },
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India Security <security@intrustindia.com>',
                    to: 'newuser@example.com',
                    subject: expect.stringContaining('Welcome to InTrust India'),
                    html: expect.stringContaining('Neha Kapoor'),
                })
            );
        });

        it('sendAuthEmail dispatches login_alert with security sender', async () => {
            await sendAuthEmail({
                type: 'login_alert',
                to: 'ayushmalviya329@gmail.com',
                data: {
                    fullName: 'Ayush Malviya',
                    email: 'ayushmalviya329@gmail.com',
                    loginTime: '14 Sep 2026, 02:20 PM IST',
                    loginMethod: 'Google OAuth',
                    deviceInfo: 'Mozilla/5.0 (X11; Linux x86_64)',
                    ipAddress: '187.124.98.130',
                },
                actorId: 'user_login_test_1',
            });

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: 'InTrust India Security <security@intrustindia.com>',
                    to: 'ayushmalviya329@gmail.com',
                    subject: expect.stringContaining('Security Alert: New Sign-in to InTrust India'),
                    html: expect.stringContaining('Google OAuth'),
                })
            );
        });

        it('sendAuthEmail throttles duplicate login_alert within cooldown window', async () => {
            mockSendMail.mockClear();

            // First call
            const firstRes = await sendAuthEmail({
                type: 'login_alert',
                to: 'cooldown-test@example.com',
                data: {
                    fullName: 'Cooldown User',
                    email: 'cooldown-test@example.com',
                },
                actorId: 'user_cooldown_1',
            });
            expect(firstRes.skipped).toBeUndefined();
            expect(mockSendMail).toHaveBeenCalledTimes(1);

            // Second immediate call with same actorId
            const secondRes = await sendAuthEmail({
                type: 'login_alert',
                to: 'cooldown-test@example.com',
                data: {
                    fullName: 'Cooldown User',
                    email: 'cooldown-test@example.com',
                },
                actorId: 'user_cooldown_1',
            });
            expect(secondRes.skipped).toBe(true);
            // sendMail was not called a second time
            expect(mockSendMail).toHaveBeenCalledTimes(1);
        });
    });
});
