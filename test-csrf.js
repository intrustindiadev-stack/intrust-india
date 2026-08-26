async function test() {
    const randomValue = crypto.randomUUID();
    const secret = 'fallback_secret';
    const encoder = new TextEncoder();
    const identity = 'anonymous';
    const message = `${identity}:${randomValue}`;
    
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log(`${randomValue}.${signature}`);
}
test();
