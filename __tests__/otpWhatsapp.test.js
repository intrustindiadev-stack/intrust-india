import { sendWhatsAppOtp } from '../lib/notifications/otpWhatsapp.js';
import * as omniflow from '../lib/omniflow.js';

jest.mock('../lib/omniflow.js', () => ({
  sendTemplateMessage: jest.fn(),
  OTP_TEMPLATE: {
    name: 'intrust_otp_verification',
    language: 'en_US',
    buildComponents: jest.fn((otp) => [{ type: 'body', parameters: [{ type: 'text', text: otp }] }])
  }
}));

describe('sendWhatsAppOtp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return { success: true } on successful send', async () => {
    omniflow.sendTemplateMessage.mockResolvedValueOnce({ success: true, messageId: '123' });

    const result = await sendWhatsAppOtp('9999999999', '123456');

    expect(result).toEqual({ success: true });
    expect(omniflow.sendTemplateMessage).toHaveBeenCalledWith(
      '9999999999',
      'intrust_otp_verification',
      'en_US',
      [{ type: 'body', parameters: [{ type: 'text', text: '123456' }] }]
    );
  });

  it('should return { success: false, error } on throw and not throw exception', async () => {
    const error = new Error('Omniflow network error');
    omniflow.sendTemplateMessage.mockRejectedValueOnce(error);

    const result = await sendWhatsAppOtp('9999999999', '123456');

    expect(result).toEqual({ success: false, error: 'Omniflow network error' });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[otpWhatsapp] WhatsApp OTP send failed:'), 'Omniflow network error');
  });
});
