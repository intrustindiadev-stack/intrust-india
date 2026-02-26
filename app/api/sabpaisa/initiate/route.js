import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';

export async function POST(request) {
    try {
        const orderData = await request.json();

        // Basic validation
        if (!orderData.amount || !orderData.clientTxnId) {
            return NextResponse.json(
                { error: 'Missing required fields: amount, clientTxnId' },
                { status: 400 }
            );
        }

        // Build the encrypted payload string using AES-128-CBC
        const encData = buildEncryptedPayload(orderData);

        if (!encData) {
            return NextResponse.json(
                { error: 'Failed to build encrypted payload' },
                { status: 500 }
            );
        }

        // Return the SabPaisa requirements back to the client
        return NextResponse.json({
            encData: encData,
            clientCode: sabpaisaConfig.clientCode,
            paymentUrl: sabpaisaConfig.initUrl
        });

    } catch (error) {
        console.error('API Initiate Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
