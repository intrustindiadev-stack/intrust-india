import { NextResponse } from 'next/server';
import { getAllTemplateStatuses } from '@/lib/omniflow';

/**
 * GET /api/admin/whatsapp-health
 * Admin-only health check for the WhatsApp/Omniflow integration.
 * Verifies env configuration and checks that the OTP template is Meta-approved.
 *
 * Authentication: pass the Supabase service-role key as a Bearer token.
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Example:
 *   curl https://intrustindia.com/api/admin/whatsapp-health \
 *     -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
 */
export async function GET(req) {
  // Admin-only: verify service role key header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const templateStatus = await getAllTemplateStatuses();

  return NextResponse.json({
    omniflow_configured: !!process.env.OMNIFLOW_API_TOKEN,
    meta_waba_configured:
      !!process.env.META_WABA_ID &&
      process.env.META_WABA_ID !== 'your_waba_id_here',
    meta_phone_configured:
      !!process.env.META_PHONE_NUMBER_ID &&
      process.env.META_PHONE_NUMBER_ID !== 'your_phone_number_id_here',
    meta_token_configured:
      !!process.env.META_ACCESS_TOKEN &&
      process.env.META_ACCESS_TOKEN !== 'your_permanent_access_token_here',
    otp_template: templateStatus,
  });
}
