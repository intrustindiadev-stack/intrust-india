const fs = require('fs');
const path = require('path');

const BANNERS_DIR = path.join(__dirname, '..', 'public', 'banners');
const ARTIFACT_DIR = path.join('C:', 'Users', 'yoges', '.gemini', 'antigravity-ide', 'brain', 'cb127022-9acd-497e-86b2-37bb42fcc8ea');

function setup() {
    console.log('--- Deploying InTrust India Customer Carousel Banners ---');

    const bannerMappings = [
        { artifactPrefix: 'intrust_india_brands_v4', target: 'banner_official_brands_v2.jpeg' },
        { artifactPrefix: 'solar_banner_v2', target: 'banner_solarsquare_v2.jpeg' },
        { artifactPrefix: 'intrust_india_rewards_v4', target: 'banner_rewards_offers_v2.jpeg' }
    ];

    if (fs.existsSync(ARTIFACT_DIR)) {
        const artifactFiles = fs.readdirSync(ARTIFACT_DIR);
        for (const item of bannerMappings) {
            const matches = artifactFiles.filter(f => f.startsWith(item.artifactPrefix) && f.endsWith('.jpg'));
            if (matches.length > 0) {
                matches.sort();
                const latest = matches[matches.length - 1];
                const src = path.join(ARTIFACT_DIR, latest);
                const dest = path.join(BANNERS_DIR, item.target);
                fs.copyFileSync(src, dest);
                console.log(`✅ Deployed ${item.target} (from ${latest})`);
            } else {
                console.warn(`Could not find artifact matching ${item.artifactPrefix}`);
            }
        }
    }

    console.log('--- All 5 InTrust India banners are ready in public/banners/ ---');
}

setup();
