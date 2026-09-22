import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
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

    // ── Decoupled save ──────────────────────────────────────────────
    // Delivery identity (name/address + free-form delivery phone) must NEVER
    // hard-fail the checkout because of the globally-unique
    // user_profiles_normalized_phone_idx constraint. The delivery phone may
    // legitimately belong to a family member / different account, or collide
    // with another profile's normalized last-10 digits.
    //
    // Strategy:
    //   1. Persist non-phone profile fields first (name/address). This is the
    //      primary save and must succeed for checkout to proceed. Strictly
    //      scoped with .eq('id', user.id).
    //   2. Attempt the phone sync to user_profiles in an ISOLATED query wrapped
    //      in its own error handling. A 23505 (unique_violation) is caught
    //      gracefully: we log the collision and proceed, returning the
    //      delivery phone separately so the order/checkout context can use it
    //   3. Best-effort: propagate the delivery snapshot to the customer's
    //      pending shopping_order_groups (customer_name / customer_phone /
    //      delivery_address). Failures here are non-fatal.

    const { data: updatedProfile, error: addressError } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        address: combinedAddress,
        city: city,
        state: state,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, full_name, phone, address, city, state, email')
      .single();

    if (addressError) {
      console.error('[API /api/customer/address] Address update error:', addressError);
      return NextResponse.json(
        { error: addressError.message || 'Failed to save address in database' },
        { status: 400 }
      );
    }

    // ── Best-effort phone sync (isolated from the primary save) ─────
    let phoneCollision = false;
    let syncedPhone = updatedProfile?.phone ?? null;

    try {
      const { data: phoneRow, error: phoneError } = await supabase
        .from('user_profiles')
        .update({
          phone: normalizedPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('phone')
        .single();

      if (phoneError) {
        // PostgREST surfaces PG codes on the error object (code === '23505'
        // for unique_violation). Also defensively match the index name in the
        // message in case the driver only forwards text.
        const code = phoneError?.code;
        const msg = `${phoneError?.message || ''} ${phoneError?.details || ''} ${phoneError?.hint || ''}`;
        const isUniqueViolation =
          code === '23505' ||
          msg.includes('23505') ||
          msg.includes('user_profiles_normalized_phone_idx') ||
          msg.toLowerCase().includes('duplicate key value');

        if (isUniqueViolation) {
          phoneCollision = true;
          console.warn(
            '[API /api/customer/address] Phone collision — delivery phone already belongs to another account. ' +
            'Proceeding with checkout using delivery-scoped phone. ' +
            `user_id=${user.id} normalized_phone=${normalizedPhone}`
          );
        } else {
          // Non-collision phone error: log but do NOT fail the request —
          // the delivery phone is still usable at the order scope.
          console.warn('[API /api/customer/address] Non-fatal phone sync error:', phoneError);
        }
      } else if (phoneRow?.phone) {
        syncedPhone = phoneRow.phone;
      }
    } catch (phoneThrow) {
      const thrownMsg = phoneThrow?.message || String(phoneThrow);
      console.warn(
        '[API /api/customer/address] Phone sync threw (non-fatal, checkout proceeds):',
        thrownMsg
      );
      if (thrownMsg.includes('23505') || thrownMsg.includes('user_profiles_normalized_phone_idx')) {
        phoneCollision = true;
      }
    }

    // Effective delivery phone: synced profile phone when available, otherwise
    // the validated delivery phone from this request (order-scoped).
    const deliveryPhone = phoneCollision ? normalizedPhone : (syncedPhone || normalizedPhone);

    // Best-effort order-group propagation (non-fatal). Delivery
    // phone/address belong to the ORDER, so push the snapshot onto the
    // caller's own pending groups. Scoped via customer_id + status.
    try {
      const admin = createAdminClient();
      const { error: groupErr } = await admin
        .from('shopping_order_groups')
        .update({
          customer_name: fullName,
          customer_phone: deliveryPhone,
          delivery_address: combinedAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', user.id)
        .eq('status', 'pending');
      if (groupErr) {
        console.warn('[API /api/customer/address] Non-fatal group sync:', groupErr);
      }
    } catch (groupThrow) {
      console.warn(
        '[API /api/customer/address] Group sync threw (non-fatal):',
        groupThrow?.message || String(groupThrow)
      );
    }

    return NextResponse.json({
      success: true,
      message: phoneCollision
        ? 'Delivery address saved successfully. Note: this delivery phone is already linked to another account, so it was kept for this order only.'
        : 'Delivery address saved successfully',
      profile: {
        ...(updatedProfile || {}),
        // Keep `phone` as the stored profile value for identity display, but
        // always expose the order-scoped number separately.
        phone: syncedPhone || updatedProfile?.phone || null,
      },
      deliveryPhone,
      phoneCollision,
    });
  } catch (err) {
    console.error('[API /api/customer/address] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while saving address' },
      { status: 500 }
    );
  }
}
