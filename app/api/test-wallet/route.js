import { NextResponse } from 'next/server';

/**
 * /api/test-wallet — REMOVED
 * 
 * This endpoint was a development/test route that used the service-role key
 * without any authentication. It has been permanently removed as part of the
 * Aug 12, 2026 security hardening (VULN-05).
 * 
 * If you need to test merchant transactions, use the admin panel or a
 * properly authenticated API route.
 */
export async function GET() {
    return NextResponse.json(
        { error: 'This endpoint has been removed.' },
        { status: 410 } // 410 Gone
    );
}
