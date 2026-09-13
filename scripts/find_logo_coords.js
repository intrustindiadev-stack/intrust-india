const sharp = require('sharp');
const path = require('path');

async function findCoords() {
    const backupPath = path.join(__dirname, '..', 'public', 'banners', 'backup_banner_intrust_mart_deals.jpeg');
    const { data, info } = await sharp(backupPath).raw().toBuffer({ resolveWithObject: true });
    
    // Scan top-left region: x from 40 to 180, y from 30 to 120
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    let bluePixelCount = 0;

    for (let y = 30; y < 140; y++) {
        for (let x = 40; x < 160; x++) {
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Detect blue logo pixels (strong blue, lower red/green)
            if (b > 130 && b > r + 30 && b > g + 20) {
                bluePixelCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    console.log(`Blue Logo Mark: pixels=${bluePixelCount}, box: x=${minX}..${maxX} (w=${maxX - minX + 1}), y=${minY}..${maxY} (h=${maxY - minY + 1})`);

    // Also find "InTrust" text start
    let textMinX = info.width;
    for (let y = 40; y < 90; y++) {
        for (let x = maxX + 1; x < maxX + 80; x++) {
            const idx = (y * info.width + x) * info.channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // Dark text pixels
            if (r < 50 && g < 50 && b < 50) {
                if (x < textMinX) textMinX = x;
            }
        }
    }
    console.log(`Text "InTrust" starts at x=${textMinX}`);
}

findCoords().catch(console.error);
