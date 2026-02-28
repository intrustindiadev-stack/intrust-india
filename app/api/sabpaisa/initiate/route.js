import { NextResponse } from 'next/server';
import { buildEncryptedPayload } from '@/lib/sabpaisa/payload';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';
import fs from 'fs';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request) {
    const orderData = await request.json().catch(() => null);

    if (!orderData) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Log incoming request immediately
    const incomingLog = `
--- SABPAISA INIT FULL DEBUG ---
Time: ${new Date().toISOString()}
Incoming Order Data: ${JSON.stringify(orderData, null, 2)}
Config Used: ${JSON.stringify({
        clientCode: sabpaisaConfig.clientCode,
        username: sabpaisaConfig.username,
        password: sabpaisaConfig.password ? 'LOADED' : 'MISSING',
        authKeyLength: sabpaisaConfig.authKey?.length || 0,
        initUrl: sabpaisaConfig.initUrl
    }, null, 2)}
--------------------------------\n`;

    if (isDev) {
        console.log(incomingLog);
        try { fs.appendFileSync('sabpaisa-debug.log', incomingLog); } catch (_) { }
    }

    try {
        const encData = buildEncryptedPayload(orderData);

        if (!encData) {
            const errMsg = 'buildEncryptedPayload returned null';
            if (isDev) {
                try { fs.appendFileSync('sabpaisa-debug.log', `\nERROR: ${errMsg}\n`); } catch (_) { }
            }
            return NextResponse.json({ error: errMsg }, { status: 500 });
        }

        return NextResponse.json({
            paymentUrl: sabpaisaConfig.initUrl,
            encData: encData,
            clientCode: sabpaisaConfig.clientCode
        });

    } catch (error) {
        const errMsg = `Encryption error: ${error.message}\n${error.stack}`;
        console.error('[SabPaisa API] Error:', errMsg);
        if (isDev) {
            try { fs.appendFileSync('sabpaisa-debug.log', `\nCRASH: ${errMsg}\n`); } catch (_) { }
        }
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
