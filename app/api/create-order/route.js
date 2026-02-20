import { NextResponse } from 'next/server';

// This route previously handled Razorpay order creation.
// Razorpay has been removed. Payment is now handled via Sabpaisa.
// This route is kept as a stub to avoid 404s from any cached references.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'Razorpay has been removed. Please use the Sabpaisa payment flow.' },
    { status: 410 }
  );
}
