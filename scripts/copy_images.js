const fs = require('fs');
const path = require('path');

const srcDir = `C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\3bac1337-11d9-4fd1-9972-73c0fbdda786`;
const destDir = path.join(__dirname, '..', 'public', 'images', 'onboarding');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const map = {
  'mystery_targets_prizes_1790196440010.jpg': 'mystery_targets_prizes.jpg',
  'product_marketing_earn_1790196458861.jpg': 'product_marketing_earn.jpg',
  'daily_trivia_streak_1790196478117.jpg': 'daily_trivia_streak.jpg',
  'merchant_sponsorship_billboard_1790196508402.jpg': 'merchant_sponsorship_billboard.jpg'
};

for (const [src, dest] of Object.entries(map)) {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(destDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${destPath}`);
  } else {
    console.error(`Missing ${src}`);
  }
}
