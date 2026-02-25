import { sprintVerify } from './lib/sprintVerify.js';
(async () => {
    try {
        const pan = await sprintVerify.verifyPAN('HOHPM4570R');
        console.log('PAN Result:', JSON.stringify(pan, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
})();
