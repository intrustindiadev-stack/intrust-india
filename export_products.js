const fs = require('fs');

async function exportCSV() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const envMap = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)/);
    if (match) {
      envMap[match[1].trim()] = match[2].trim();
    }
  });

  const SUPABASE_URL = envMap['NEXT_PUBLIC_SUPABASE_URL'];
  const SUPABASE_KEY = envMap['SUPABASE_SERVICE_ROLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_KEY) {
     console.error('Missing Supabase credentials');
     return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/shopping_products?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  if (!response.ok) {
     console.error('Failed to fetch:', await response.text());
     return;
  }

  const data = await response.json();
  if (data.length === 0) {
     console.log('No data found');
     return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header] === null ? '' : row[header];
      if (typeof val === 'object') {
          val = JSON.stringify(val);
      }
      const strVal = String(val);
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
         return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    });
    csvRows.push(values.join(','));
  }

  fs.writeFileSync('current_shopping_products.csv', csvRows.join('\n'));
  console.log('Exported ' + data.length + ' products to current_shopping_products.csv');
}

exportCSV();
