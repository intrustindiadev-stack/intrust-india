import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

import('./lib/omniflow.js').then(omniflow => {
  const phone = '+919999999999'; // We don't have the user's phone, wait.
  // Actually, we can just print the payload that WOULD be sent.
  console.log(JSON.stringify(omniflow.MERCHANT_NEW_ORDER_TEMPLATE.buildComponents('TEST1234', '500.00', '3'), null, 2));
}).catch(err => console.error(err));
