const fs = require('fs');
const path = require('path');

const srcDir = `C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\42458cc6-9536-4f3d-aef4-ba56da307472`;
const destDir = path.join(__dirname, '..', 'public', 'images');

const map = {
  'welcome_team_art_1784543607744.png': 'welcome-team-art.png',
  'employee_workspace_banner_1784543620832.png': 'employee-workspace-banner.png',
  'crm_sales_banner_1784543633790.png': 'crm-sales-banner.png',
  'admin_hiring_banner_1784543646832.png': 'admin-hiring-banner.png'
};

for (const [src, dest] of Object.entries(map)) {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(destDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.error(`Missing ${src}`);
  }
}
