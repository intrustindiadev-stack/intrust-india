const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/api/admin/shopping/bulk-upload/route.js');
const buffer = fs.readFileSync(filePath);

console.log('First few bytes of file:', buffer.slice(0, 10));

if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    console.log('UTF-8 BOM detected! Removing BOM...');
    const cleanBuffer = buffer.slice(3);
    fs.writeFileSync(filePath, cleanBuffer);
    console.log('BOM removed successfully.');
} else {
    console.log('No UTF-8 BOM detected.');
}
