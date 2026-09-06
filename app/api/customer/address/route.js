import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { deliveryAddressSchema, sanitizeAndNormalizePhone } from '@/lib/customer/addressValidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to save your delivery address.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = deliveryAddressSchema.safeParse(body);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      const errorMessage = firstIssue ? firstIssue.message : 'Invalid address data';
      return NextResponse.json(
        { error: errorMessage, issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { fullName, address, city, state, pincode, phone } = validation.data;
    const normalizedPhone = sanitizeAndNormalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please provide a 10 to 14 digit mobile number.' },
        { status: 400 }
      );
    }

    const combinedAddress = [address, city, state, pincode]
      .filter(Boolean)
      .join(', ');

    const { data: updatedProfile, error: dbError } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        address: combinedAddress,
        city: city,
        state: state,
        phone: normalizedPhone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, full_name, phone, address, city, state, email')
      .single();

    if (dbError) {
      console.error('[API /api/customer/address] Database update error:', dbError);
      return NextResponse.json(
        { error: dbError.message || 'Failed to save address in database' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery address saved successfully',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('[API /api/customer/address] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while saving address' },
      { status: 500 }
    );
  }
}
