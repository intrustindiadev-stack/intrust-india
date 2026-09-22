const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\7b5bca05-7373-45c9-8ae4-856cdee5de5a';
const destDir = path.join(__dirname, '..', 'public', 'marketing', 'prizes');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const mapping = {
    'prize_smartwatch_1789995343687.jpg': 'smartwatch.jpg',
    'prize_gold_coin_1789995484403.jpg': 'gold_coin.jpg',
    'prize_anc_earbuds_1789995503371.jpg': 'anc_earbuds.jpg',
    'prize_executive_kit_1789995523632.jpg': 'executive_kit.jpg'
};

for (const [srcName, destName] of Object.entries(mapping)) {
    const srcPath = path.join(srcDir, srcName);
    const destPath = path.join(destDir, destName);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${srcName} -> ${destName}`);
    } else {
        console.log(`Source not found: ${srcPath}`);
    }
}
