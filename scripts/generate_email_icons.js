const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../public/email-templates/icons');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const icons = [
    {
        name: 'badge-key.png',
        width: 72,
        height: 72,
        svg: `<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="72" height="72" rx="18" fill="#F3E8FF"/>
            <g transform="translate(18, 18) scale(1.5)">
                <circle cx="7.5" cy="15.5" r="4.5" stroke="#9333EA" stroke-width="2.2" fill="none"/>
                <path d="M21 2L10.5 12.5" stroke="#9333EA" stroke-width="2.2" stroke-linecap="round"/>
                <path d="M15.5 7.5L18.5 10.5L21 8" stroke="#9333EA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`
    },
    {
        name: 'badge-mail.png',
        width: 72,
        height: 72,
        svg: `<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="72" height="72" rx="18" fill="#DBEAFE"/>
            <g transform="translate(18, 18) scale(1.5)">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke="#2563EB" stroke-width="2.2" fill="none"/>
                <path d="M2 7L12 13.5L22 7" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`
    },
    {
        name: 'badge-reply.png',
        width: 72,
        height: 72,
        svg: `<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="72" height="72" rx="18" fill="#DCFCE7"/>
            <g transform="translate(18, 18) scale(1.5)">
                <polyline points="9 17 4 12 9 7" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 18V16C20 13.7909 18.2091 12 16 12H4" stroke="#16A34A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`
    },
    {
        name: 'badge-clock.png',
        width: 72,
        height: 72,
        svg: `<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="72" height="72" rx="18" fill="#FEF3C7"/>
            <g transform="translate(18, 18) scale(1.5)">
                <circle cx="12" cy="12" r="9" stroke="#D97706" stroke-width="2.2" fill="none"/>
                <polyline points="12 7 12 12 15.5 14" stroke="#D97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`
    },
    {
        name: 'badge-shield.png',
        width: 48,
        height: 48,
        svg: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="#EFF6FF"/>
            <g transform="translate(12, 12)">
                <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </g>
        </svg>`
    },
    {
        name: 'badge-check.png',
        width: 80,
        height: 80,
        svg: `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="38" fill="#16A34A"/>
            <path d="M25 40L35 50L55 30" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    },
    {
        name: 'badge-verified.png',
        width: 36,
        height: 36,
        svg: `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="17" fill="#22C55E"/>
            <path d="M11 18L16 23L25 14" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    },
    {
        name: 'paper-plane.png',
        width: 120,
        height: 120,
        svg: `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M110 10L50 70M110 10L75 110L50 70M110 10L10 45L50 70" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M50 70V100L65 85" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>`
    }
];

async function generate() {
    for (const icon of icons) {
        const filePath = path.join(outDir, icon.name);
        await sharp(Buffer.from(icon.svg))
            .resize(icon.width, icon.height)
            .png()
            .toFile(filePath);
        console.log(`Generated: ${icon.name} (${icon.width}x${icon.height})`);
    }

    // Generate self-contained white logo badge (no HTML wrapper/border needed)
    const bgSvg = Buffer.from(`
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="96" height="96" rx="22" fill="#FFFFFF"/>
        </svg>
    `);

    const logoBuffer = await sharp(path.join(__dirname, '../public/icons/intrustLogo.png'))
        .resize(68, 68, { fit: 'inside' })
        .toBuffer();

    const badgeBuffer = await sharp(bgSvg)
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png()
        .toBuffer();

    fs.writeFileSync(path.join(outDir, 'logo-badge.png'), badgeBuffer);
    fs.writeFileSync(path.join(__dirname, '../public/email-templates/intrustLogoWhiteBg.png'), badgeBuffer);
    fs.writeFileSync(path.join(__dirname, '../public/icons/intrustLogoWhiteBg.png'), badgeBuffer);
    console.log('Generated: logo-badge.png (96x96) and synchronized intrustLogoWhiteBg.png');
}

generate().catch(console.error);

