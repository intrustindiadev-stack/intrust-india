import { sendTemplateMessage, OTP_TEMPLATE } from '@/lib/omniflow';
import { createAdminClient } from '@/lib/supabaseServer';

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

    const result = await sendTemplateMessage(
      phone,
      OTP_TEMPLATE.name,
      OTP_TEMPLATE.language,
      OTP_TEMPLATE.buildComponents(otp)
    );
    
    if (result.success && result.messageId) {
      const adminClient = createAdminClient();
      await adminClient.from('whatsapp_message_logs').insert({
        wamid: result.messageId,
        user_id: null, // OTP requests happen before login, so no user_id available yet
        channel: 'whatsapp',
        direction: 'outbound',
        status: 'sent',
        content_preview: '[OTP Authentication Template]', // NEVER log the actual OTP
        metadata: {
            template: OTP_TEMPLATE.name,
            original_phone: phone
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[otpWhatsapp] WhatsApp OTP send failed:', error.message);
    return { success: false, error: error.message };
  }
}
