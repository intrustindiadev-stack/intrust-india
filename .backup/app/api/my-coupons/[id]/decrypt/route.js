import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function GET(request, { params }) {
    try {
        const supabase = await createServerSupabaseClient()
        const { id } = await params

        // Verify user is authenticated
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Call the get_my_coupon_code function
        // This function verifies ownership before returning encrypted code
        const { data: encryptedCode, error } = await supabase.rpc('get_my_coupon_code', {
            p_coupon_id: id,
        })

        if (error) {
            console.error('Error fetching coupon code:', error)
            return NextResponse.json(
                { error: error.message || 'Failed to fetch coupon code' },
                { status: 400 }
            )
        }

        // For now, return the encrypted code
        // In production, you would decrypt it here using service role
        // Example with Supabase Vault:
        // const { data: decryptedCode } = await supabaseAdmin.rpc('vault_decrypt', {
        //   secret: encryptedCode,
        //   key_id: 'coupon_encryption_key'
        // })

        return NextResponse.json(
            {
                encrypted_code: encryptedCode,
                // In production, return decrypted code:
                // code: decryptedCode
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Unexpected error in decrypt API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
