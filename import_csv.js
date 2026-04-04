const fs = require('fs');

const csv = fs.readFileSync('NEWdmart_grocery_products.csv', 'utf8');
const lines = csv.trim().split('\n').slice(1); // skip header

let values = [];
const CATEGORY_ID = '17d09c62-31c0-4c7e-b6dd-9dc1a97aafb8';

for (let line of lines) {
  // Simple CSV parsing that handles quotes if necessary. 
  // None of the lines above seem to have embedded quotes causing commas to break, 
  // but let's just do a simple split since there are no commas in the strings 
  // based on the preview, wait, there are no quotes in the preview.
  
  // Actually, some names might have commas. Let's do a fast regex split.
  const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
  
  // A more robust split:
  let parts = [];
  let inQuotes = false;
  let currentPart = '';
  for(let i = 0; i < line.length; i++) {
    if(line[i] === '"') {
      inQuotes = !inQuotes;
    } else if(line[i] === ',' && !inQuotes) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += line[i];
    }
  }
  parts.push(currentPart);

  let [
    title, description, category, wholesale_price_paise, suggested_retail_price_paise, 
    admin_stock, is_active, category_id, mrp_paise, gst_percentage, hsn_code, product_images
  ] = parts;

  // Escape quotes
  title = title.replace(/'/g, "''");
  description = description ? description.replace(/'/g, "''") : '';
  
  // Fallbacks
  suggested_retail_price_paise = suggested_retail_price_paise || 'NULL';
  mrp_paise = mrp_paise || 'NULL';
  gst_percentage = gst_percentage || '0';
  hsn_code = hsn_code ? `'${hsn_code}'` : 'NULL';
  
  values.push(`('${title}', '${description}', '${category}', ${wholesale_price_paise}, ${suggested_retail_price_paise}, ${admin_stock}, ${is_active}, '${CATEGORY_ID}', ${mrp_paise}, ${gst_percentage}, ${hsn_code}, '{}')`);
}

const sql = `
INSERT INTO public.shopping_products (
  title, description, category, wholesale_price_paise, suggested_retail_price_paise, 
  admin_stock, is_active, category_id, mrp_paise, gst_percentage, hsn_code, product_images
) VALUES 
${values.join(',\n')};
`;

fs.writeFileSync('import_products.sql', sql);
console.log('SQL generated successfully.');
