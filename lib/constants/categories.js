import { z } from 'zod';

/**
 * Canonical mapping of all shopping categories to their logical sub-categories.
 * Expands taxonomy platform-wide across storefront, wholesale hub, and admin/merchant forms.
 */
export const CATEGORY_MAP = {
    'Electronics': [
        'Mobiles & Tablets',
        'Laptops & Computers',
        'Audio & Headphones',
        'Cameras',
        'TVs & Displays',
        'Accessories'
    ],
    'Beauty': [
        'Skincare',
        'Makeup',
        'Fragrance',
        'Hair Care',
        'Personal Care'
    ],
    'Beauty & Personal Care': [
        'Skincare',
        'Makeup',
        'Fragrance',
        'Hair Care',
        'Personal Care'
    ],
    'Home': [
        'Kitchen & Dining',
        'Furniture',
        'Decor',
        'Bedding',
        'Cleaning',
        'Tools & Hardware'
    ],
    'Home Furnishing': [
        'Bedding',
        'Curtains & Blinds',
        'Cushions & Covers',
        'Rugs & Carpets',
        'Decor'
    ],
    'Fashion': [
        'Men',
        'Women',
        'Kids'
    ],
    'Groceries': [
        'Staples & Grains',
        'Snacks & Beverages',
        'Dairy & Eggs',
        'Fruits & Vegetables',
        'Spices & Masala',
        'Packaged Food'
    ],
    'Sports': [
        'Fitness Equipment',
        'Sportswear',
        'Outdoor & Adventure',
        'Cricket',
        'Football',
        'Yoga & Wellness'
    ],
    'Toys': [
        'Educational Toys',
        'Action Figures',
        'Board Games',
        'Outdoor Play',
        'Baby & Infant'
    ],
    'Toys & Games': [
        'Educational Toys',
        'Action Figures',
        'Board Games',
        'Outdoor Play',
        'Baby & Infant'
    ],
    'Health': [
        'Medicines & Supplements',
        'Medical Devices',
        'Ayurvedic & Herbal',
        'Nutrition & Diet'
    ],
    'Health & Wellness': [
        'Medicines & Supplements',
        'Medical Devices',
        'Ayurvedic & Herbal',
        'Nutrition & Diet'
    ],
    'Tools & Hardware': [
        'Power Tools',
        'Hand Tools',
        'Hardware Supplies',
        'Safety & Security'
    ],
    'Construction & Fittings': [
        'Electricals',
        'Plumbing',
        'Paints & Wall Treatments',
        'Hardware & Fittings'
    ]
};

/** All canonical primary categories */
export const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

/**
 * Returns the list of sub-categories for a given category name (case-insensitive lookup).
 * Returns empty array if category is not found.
 *
 * @param {string} category
 * @returns {string[]}
 */
export function getSubCategories(category) {
    if (!category || typeof category !== 'string') return [];
    
    // Direct match
    if (CATEGORY_MAP[category]) {
        return CATEGORY_MAP[category];
    }
    
    // Case-insensitive / trimmed match
    const normalized = category.trim().toLowerCase();
    const matchKey = Object.keys(CATEGORY_MAP).find(
        k => k.toLowerCase() === normalized
    );
    
    return matchKey ? CATEGORY_MAP[matchKey] : [];
}

/**
 * Checks whether a given sub-category is valid for a category.
 * Also allows 'General' as fallback for legacy backfilled records.
 *
 * @param {string} category
 * @param {string} subCategory
 * @returns {boolean}
 */
export function isValidSubCategory(category, subCategory) {
    if (!subCategory || typeof subCategory !== 'string') return false;
    const trimmedSub = subCategory.trim();
    if (trimmedSub === 'General') return true;
    
    const validSubs = getSubCategories(category);
    if (!validSubs.length) return true; // If no predefined sub-categories, allow open string
    
    return validSubs.some(s => s.toLowerCase() === trimmedSub.toLowerCase());
}

/**
 * Zod schema for strictly validating category & sub_category in product mutation payloads.
 * Enforces sub_category is present and non-empty.
 */
export const ProductTaxonomySchema = z.object({
    category: z.string().min(1, 'Category is required'),
    sub_category: z.string().min(1, 'Sub-category is required').trim()
});
