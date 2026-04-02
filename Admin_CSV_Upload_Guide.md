# Admin Guide: How to Fill the Bulk Products CSV

**File to edit:** `bulk_products_template.csv`

Please follow this simple guide to add new products to the system. You can open the CSV file in Excel, Google Sheets, or Numbers.

⚠️ **Important Rule:** Do NOT change, rename, or delete the first row (the header row). The system needs these exact names to read your data.

---

## 💡 The Most Important Rule: Prices
**ALL prices must be entered in Paise (not Rupees).**
To get the paise value, simply multiply the Rupee amount by 100 (add two zeros).

*   ₹10 = `1000`
*   ₹50 = `5000`
*   ₹150 = `15000`
*   ₹1,200 = `120000`

---

## 📝 Column by Column Guide

### 1. `title` (Required)
The name of the product.
*Example: "Fortune Sunflower Oil 1L"*

### 2. `description` (Optional)
A short sentence describing the product.
*Example: "Refined sunflower cooking oil"*

### 3. `category` (Optional)
The human-readable category name.
*Example: "Groceries"*

### 4. `wholesale_price_paise` (Required)
Your base price / cost price in **paise**.
*Example: `13000` (for ₹130)*

### 5. `suggested_retail_price_paise` (Optional)
The price you suggest selling it for, in **paise**.
*Example: `14500` (for ₹145)*

### 6. `admin_stock` (Required)
How many units you currently have in stock. Type a number.
*Example: `250`*

### 7. `is_active` (Optional)
Type `TRUE` if the product should be visible immediately, or `FALSE` to keep it hidden.
*Example: `TRUE`*

### 8. `category_id` (Optional but highly recommended)
The exact ID of the category in the database. **You must copy and paste one of the exact codes below:**

*   **Beauty:** `e40a18ba-8f35-4534-b69f-937213fe291a`
*   **Electronics:** `73f9d9a4-e6d2-42c6-bf95-57eac5fd25b4`
*   **Fashion:** `3a6f27a6-fb41-4b39-a1ce-b0a58d9cb1ed`
*   **Groceries:** `17d09c62-31c0-4c7e-b6dd-9dc1a97aafb8`
*   **Health:** `7ee79b1c-6239-4625-8b8b-929694e1c0bc`
*   **Home:** `37372747-4d51-4f3a-8158-00865218794c`
*   **Sports:** `978ebc94-bf29-4abb-81c0-aea7fff83a11`
*   **Toys:** `e4caf668-2122-4dbb-abf4-b1638b0dd9f0`

### 9. `mrp_paise` (Optional)
The Maximum Retail Price printed on the box, in **paise**.
*Example: `15500` (for ₹155)*

### 10. `gst_percentage` (Optional)
The tax percentage number. Do not include the % sign.
*Valid options: `0`, `5`, `12`, `18`, or `28`*

### 11. `hsn_code` (Optional)
The tax classification code.
*Example: `9971`*

### 12. `product_images` (Optional)
Leave this completely empty for now. Images can be uploaded later through the admin dashboard.

---

## ✅ Best Practices
1. **Always double-check your zeroes** on prices! A mistake here changes ₹100 into ₹10.
2. Prices should logically be: `wholesale_price` < `suggested_retail_price` < `mrp`
3. Export the file as a **Comma Separated Values (.csv)** file to upload.
