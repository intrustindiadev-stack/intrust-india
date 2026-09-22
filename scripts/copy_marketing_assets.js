const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\25ce11f0-8ddd-4fb8-8094-f8cbb8b10c89';
const destDir = path.join(__dirname, '..', 'public', 'marketing');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const mappings = [
    { match: 'hero_banner_art_', target: 'hero_banner_art.jpg' },
    { match: 'cashback_coins_stack_', target: 'cashback_coins_stack.jpg' },
    { match: 'giftbox_closed_', target: 'giftbox_closed.jpg' },
    { match: 'giftbox_open_', target: 'giftbox_open.jpg' },
    { match: 'challenge_trophy_', target: 'challenge_trophy.jpg' }
];

const files = fs.readdirSync(srcDir);

mappings.forEach(({ match, target }) => {
    const file = files.find(f => f.startsWith(match) && f.endsWith('.jpg'));
    if (file) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, target));
        console.log(`Copied ${file} -> public/marketing/${target}`);
    } else {
        console.warn(`Could not find file matching ${match}`);
    }
});

// Copy uploaded mystery box spectrum
const uploadedMysteryBox = 'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\7b5bca05-7373-45c9-8ae4-856cdee5de5a\\.user_uploaded\\media_1789997450429.png';
if (fs.existsSync(uploadedMysteryBox)) {
    fs.copyFileSync(uploadedMysteryBox, path.join(destDir, 'mystery_box_spectrum.png'));
    console.log('Copied mystery_box_spectrum.png to public/marketing');
}

