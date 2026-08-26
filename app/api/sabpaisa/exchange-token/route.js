import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import crypto from 'crypto';

// Use Node.js runtime for crypto.timingSafeEqual and Buffer
export const runtime = 'nodejs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { txnId } = body;
        const tokenCookie = request.cookies.get('payment_recovery_token');
        const token = tokenCookie?.value;

        if (!token || !txnId) {
            return NextResponse.json({ error: 'Missing token or txnId' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Fetch the recovery row using the service role key (bypassing RLS)
        const { data: dbRow, error } = await supabaseAdmin
            .from('payment_session_recovery')
            .select('*')
            .eq('txn_id', txnId)
            .single();

        if (error || !dbRow) {
            console.error(`[Exchange Token] Recovery row not found for txnId: ${txnId}`);
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        if (!dbRow.recovery_token_hash || !dbRow.token_expires_at) {
            console.error(`[Exchange Token] Recovery token not generated for txnId: ${txnId}`);
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }

        // Check strict expiry
        if (new Date() > new Date(dbRow.token_expires_at)) {
            console.error(`[Exchange Token] Token expired for txnId: ${txnId}`);
            // Cleanup expired row
            await supabaseAdmin.from('payment_session_recovery').delete().eq('txn_id', txnId);
            return NextResponse.json({ error: 'Token expired' }, { status: 401 });
        }

        // Timing-safe equality check on SHA-256 hashes
        const inputHashStr = crypto.createHash('sha256').update(token).digest('hex');
        const inputBuffer = Buffer.from(inputHashStr, 'hex');
        const storedBuffer = Buffer.from(dbRow.recovery_token_hash, 'hex');
        
        // Ensure buffers are of the same length before timingSafeEqual
        if (inputBuffer.length !== storedBuffer.length || !crypto.timingSafeEqual(inputBuffer, storedBuffer)) {
            console.error(`[Exchange Token] Token mismatch for txnId: ${txnId}`);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Token is valid! 
        // Single-use: delete immediately before responding
        const { error: delError } = await supabaseAdmin
            .from('payment_session_recovery')
            .delete()
            .eq('txn_id', txnId);

        if (delError) {
            console.error(`[Exchange Token] Failed to delete recovery row for txnId: ${txnId}`, delError);
            // We should still proceed if delete fails, but it's a critical error
        }

        // Decrypt the session credentials
        let sessionPayload;
        try {
            const parts = dbRow.encrypted_session_data.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedText = parts[2];
            
            const keyHash = crypto.createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY).digest();
            const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            sessionPayload = JSON.parse(decrypted);
        } catch (decryptErr) {
            console.error(`[Exchange Token] Failed to decrypt session data:`, decryptErr);
            return NextResponse.json({ error: 'Session restoration failed' }, { status: 500 });
        }

        // Establish the session using SSR cookies
        const supabaseServer = await createServerSupabaseClient();
        const { data: sessionData, error: sessionErr } = await supabaseServer.auth.setSession({
            access_token: sessionPayload.access_token,
            refresh_token: sessionPayload.refresh_token
        });

        if (sessionErr || !sessionData.session) {
            console.error(`[Exchange Token] Failed to set session:`, sessionErr);
            return NextResponse.json({ error: 'Session restoration failed' }, { status: 500 });
        }

        console.log(`[Exchange Token] Successfully recovered session for txnId: ${txnId}`);

        // Clear the recovery token cookie
        const response = NextResponse.json({ success: true });
        response.cookies.set('payment_recovery_token', '', {
            maxAge: 0,
            path: '/api/sabpaisa/exchange-token'
        });

        return response;

    } catch (err) {
        console.error('[Exchange Token] Internal error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
