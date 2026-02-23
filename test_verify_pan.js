import { sprintVerify } from './lib/sprintVerify.js';

sprintVerify.jwtKey = process.env.SPRINT_VERIFY_JWT_KEY;
sprintVerify.authorizedKey = process.env.SPRINT_VERIFY_AUTHORIZED_KEY;
sprintVerify.partnerId = process.env.SPRINT_VERIFY_PARTNER_ID;
sprintVerify.baseUrl = process.env.SPRINT_VERIFY_BASE_URL || 'https://api.paysprint.in/api/v1';

async function test() {
    console.log("Testing verifyPAN method with whitelisted IP...");
    try {
        const panResult = await sprintVerify.verifyPAN('ABCDE1234F');
        console.log("============== RESULT ==============");
        console.log(JSON.stringify(panResult, null, 2));
    } catch (e) {
        console.error("============== ERROR ==============\n", e);
    }
}

test();
