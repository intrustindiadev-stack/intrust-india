const APP_URL = 'http://localhost:3000';

async function testApi() {
    console.log('Testing /api/shopping/trending-products...');
    try {
        const res = await fetch(`${APP_URL}/api/shopping/trending-products`);
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(data, null, 2));

        if (data.products && Array.isArray(data.products)) {
            console.log('✅ Success: Received products array');
            console.log('Count:', data.products.length);
        } else {
            console.error('❌ Failure: Did not receive products array');
        }
    } catch (err) {
        console.error('❌ Error fetching API:', err.message);
    }
}

testApi();
