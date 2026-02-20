import { NextResponse } from 'next/server';

// This route previously handled Razorpay payment verification.
// Razorpay has been removed. Payment is now handled via Sabpaisa.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
    return NextResponse.json(
        { error: 'Razorpay has been removed. Please use the Sabpaisa payment flow.' },
        { status: 410 }
    );
}
