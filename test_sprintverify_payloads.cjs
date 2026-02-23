const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

const jwtKey = process.env.SPRINT_VERIFY_JWT_KEY;
const authorizedKey = process.env.SPRINT_VERIFY_AUTHORIZED_KEY;
const partnerId = process.env.SPRINT_VERIFY_PARTNER_ID;

const timestamp = Math.floor(Date.now() / 1000);
const payload = {
    timestamp: timestamp,
    partnerId: partnerId,
    reqid: Date.now().toString()
};

const token = jwt.sign(payload, jwtKey, { algorithm: 'HS256' });

async function run() {
    console.log("Testing OCR...");
    try {
        const ocrRes = await fetch('https://uat.paysprint.in/sprintverify-uat/api/v1/verification/ocr_doc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Token': token,
                'authorisedkey': authorizedKey
            },
            body: JSON.stringify({})
        });
        console.log("OCR Response:", await ocrRes.text());
    } catch (e) { console.error(e); }

    console.log("\nTesting Face Match...");
    try {
        const faceRes = await fetch('https://uat.paysprint.in/sprintverify-uat/api/v1/verification/face_match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Token': token,
                'authorisedkey': authorizedKey
            },
            body: JSON.stringify({})
        });
        console.log("Face Match Response:", await faceRes.text());
    } catch (e) { console.error(e); }
}

run();
