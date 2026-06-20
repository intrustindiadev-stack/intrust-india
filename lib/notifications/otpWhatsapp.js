import { sendTemplateMessage, OTP_TEMPLATE } from '@/lib/omniflow';

/**
 * Send an OTP via WhatsApp using the intrust_otp_verification Authentication template.
 *
 * Returns the **same shape** as `sendOTP` in lib/smsClient.js:
 *   - { success: true }
 *   - { success: false, error: string }
 *
 * Non-throwing: catches all errors and converts them to the error shape
 * so the route can treat both channels uniformly.
 *
 * @param {string} phone - Recipient phone (any format; normalised by omniflow).
 * @param {string} otp   - The one-time password to deliver. NOT logged.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendWhatsAppOtp(phone, otp) {
  try {
    console.log('[otpWhatsapp] Sending OTP via WhatsApp to:', phone);
    // NOTE: OTP value is intentionally NOT logged for security

    await sendTemplateMessage(
      phone,
      OTP_TEMPLATE.name,
      OTP_TEMPLATE.language,
      OTP_TEMPLATE.buildComponents(otp)
    );

    return { success: true };
  } catch (error) {
    console.error('[otpWhatsapp] WhatsApp OTP send failed:', error.message);
    return { success: false, error: error.message };
  }
}
