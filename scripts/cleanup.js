const fs = require('fs');
const path = require('path');

const BANNERS_DIR = path.join(__dirname, '..', 'public', 'banners');
const SCRIPTS_DIR = __dirname;

// 1. Clean unused / backup / fake logo banners
const bannersToRemove = [
    'backup_banner_intrust_mart_deals.jpeg',
    'backup_banner_solarsquare_green.jpeg',
    'backup_banner_wallet_pay_save.jpeg',
    'banner_intrust_mart_deals.jpeg',
    'banner_solarsquare_green.jpeg',
    'banner_solarsquare_green_v2.jpeg',
    'banner_wallet_pay_save.jpeg'
];

for (const f of bannersToRemove) {
    const p = path.join(BANNERS_DIR, f);
    if (fs.existsSync(p)) {
        try {
            fs.unlinkSync(p);
            console.log(`Removed banner: ${f}`);
        } catch (e) {
            console.error(`Failed to remove ${f}:`, e.message);
        }
    }
}

// 2. Clean temporary scripts
const scriptsToRemove = [
    'setup_banners.js',
    'update_banners.js',
    'update_banners.py',
    'find_logo_coords.js',
    'inspect_banners.js',
    'test_wishlist_query.js',
    'test_wishlist_db.py'
];

for (const s of scriptsToRemove) {
    const p = path.join(SCRIPTS_DIR, s);
    if (fs.existsSync(p)) {
        try {
            fs.unlinkSync(p);
            console.log(`Removed script: ${s}`);
        } catch (e) {
            console.error(`Failed to remove ${s}:`, e.message);
        }
    }
}

console.log('Cleanup completed successfully.');

// Self-delete
try {
    fs.unlinkSync(__filename);
    console.log('Cleanup script removed itself.');
} catch (e) {}
