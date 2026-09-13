const sharp = require('sharp');
const path = require('path');

async function main() {
    const bannerDir = path.join(__dirname, '..', 'public', 'banners');
    const files = [
        'banner_intrust_mart_deals.jpeg',
        'banner_wallet_pay_save.jpeg',
        'banner_solarsquare_green.jpeg'
    ];

    for (const f of files) {
        const meta = await sharp(path.join(bannerDir, f)).metadata();
        console.log(`${f}: ${meta.width}x${meta.height}, format=${meta.format}`);
    }

    const logoMeta = await sharp(path.join(__dirname, '..', 'public', 'icons', 'intrustLogo.png')).metadata();
    console.log(`intrustLogo.png: ${logoMeta.width}x${logoMeta.height}, format=${logoMeta.format}`);
}

main().catch(console.error);
