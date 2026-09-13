const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BANNERS_DIR = path.join(PUBLIC_DIR, 'banners');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

async function processBanners() {
    console.log('--- InTrust Automated Pixel-Accurate Banner Logo Replacement ---');

    const logoPath = path.join(ICONS_DIR, 'intrustLogo.png');
    if (!fs.existsSync(logoPath)) {
        console.error('InTrust logo not found at:', logoPath);
        return;
    }

    const files = [
        'banner_intrust_mart_deals.jpeg',
        'banner_wallet_pay_save.jpeg',
        'banner_solarsquare_green.jpeg'
    ];

    for (const filename of files) {
        const filePath = path.join(BANNERS_DIR, filename);
        const backupPath = path.join(BANNERS_DIR, `backup_${filename}`);

        // Always restore from clean original backup
        if (!fs.existsSync(backupPath)) {
            if (fs.existsSync(filePath)) {
                fs.copyFileSync(filePath, backupPath);
            } else {
                continue;
            }
        }

        const { data, info } = await sharp(backupPath).raw().toBuffer({ resolveWithObject: true });
        console.log(`Analyzing ${filename} (${info.width}x${info.height})...`);

        // 1. Automatically detect blue logo pixels in top-left region (x: 40..250, y: 25..160)
        let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
        let bluePixelCount = 0;

        for (let y = 25; y < 160; y++) {
            for (let x = 40; x < 250; x++) {
                const idx = (y * info.width + x) * info.channels;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                // Strong blue channel relative to red & green
                if (b > 110 && (b - r > 25) && (b - g > 15)) {
                    bluePixelCount++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (bluePixelCount < 50) {
            console.warn(`Could not reliably detect blue logo mark in ${filename}`);
            continue;
        }

        const boxW = maxX - minX + 1;
        const boxH = maxY - minY + 1;
        const cx = Math.round((minX + maxX) / 2);
        const cy = Math.round((minY + maxY) / 2);
        console.log(`  Found blue mark: center=(${cx}, ${cy}), size=${boxW}x${boxH} (${bluePixelCount} px)`);

        // Erase padding around mark
        const pad = 4;
        const eraseLeft = Math.max(0, minX - pad);
        const eraseTop = Math.max(0, minY - pad);
        const eraseW = boxW + pad * 2;
        const eraseH = boxH + pad * 2;

        // Sample clean background 20px to the left
        const sampleLeft = Math.max(0, eraseLeft - eraseW - 10);
        const sampleTop = eraseTop;
        const sampleW = eraseW;
        const sampleH = eraseH;

        const samplePatch = await sharp(backupPath)
            .extract({ left: sampleLeft, top: sampleTop, width: sampleW, height: sampleH })
            .blur(3)
            .toBuffer();

        // Target size for official logo
        const logoTargetSize = Math.round(Math.max(boxW, boxH) * 1.05);
        const resizedLogo = await sharp(logoPath)
            .resize({ width: logoTargetSize, height: logoTargetSize, fit: 'contain' })
            .toBuffer();

        const logoLeft = Math.round(cx - logoTargetSize / 2);
        const logoTop = Math.round(cy - logoTargetSize / 2);

        const compositeOps = [
            { input: samplePatch, left: eraseLeft, top: eraseTop },
            { input: resizedLogo, left: logoLeft, top: logoTop }
        ];

        // Apply and write out clean high-quality JPEG
        const output = await sharp(backupPath)
            .composite(compositeOps)
            .jpeg({ quality: 98, mozjpeg: true })
            .toBuffer();

        fs.writeFileSync(filePath, output);
        console.log(`✅ Automatically replaced logo in ${filename} perfectly!`);
    }

    console.log('--- All banners updated with mathematical pixel perfection ---');
}

processBanners().catch(console.error);
