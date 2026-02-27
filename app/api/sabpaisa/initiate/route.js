import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';

export async function POST(request) {
    try {
        const orderData = await request.json();
        console.log('[SabPaisa API] Initiating with:', {
            txnId: orderData.clientTxnId,
            amount: orderData.amount,
            callback: sabpaisaConfig.callbackUrl
        });

        // Build the encrypted payload string using AES-128-CBC
        const encData = buildEncryptedPayload(orderData);

        if (!encData) {
            return NextResponse.json(
                { error: 'Failed to build encrypted payload' },
                { status: 500 }
            );
        }

        // Returns an auto-submitting HTML form as requested
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting to Payment Gateway...</title>
            </head>
            <body onload="document.forms[0].submit()">
                <form method="POST" action="${sabpaisaConfig.initUrl}">
                    <input type="hidden" name="encData" value="${encData}" />
                    <input type="hidden" name="clientCode" value="${sabpaisaConfig.clientCode}" />
                </form>
                <p>Please wait while we redirect you to the secure payment gateway...</p>
            </body>
            </html>
        `;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (error) {
        console.error('API Initiate Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}

