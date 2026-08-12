const fs = require('fs');
const path = require('path');

const srcFiles = [
    'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\08d129ea-f196-4441-b758-aae4ddb1c34c\\promo_elite_gold_1786562446938.png',
    'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\08d129ea-f196-4441-b758-aae4ddb1c34c\\promo_flash_sale_1786562466085.png',
    'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\08d129ea-f196-4441-b758-aae4ddb1c34c\\promo_solar_1786562485049.png'
];

const destNames = ['gold.png', 'flash.png', 'solar.png'];
const destDir = 'e:\\Intrust\\intrust-india-74df39793a8c941a0f23d6a2e34189a94ae7bd8f\\public\\images\\promos';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

srcFiles.forEach((src, i) => {
    fs.copyFileSync(src, path.join(destDir, destNames[i]));
});
console.log('Done');
