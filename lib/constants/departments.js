/**
 * InTrust India — Merchant Departments & Store Categories
 * Single source of truth for database constraints, onboarding, storefront filters, and admin management.
 */

export const MERCHANT_DEPARTMENTS = [
  { 
    key: 'grocery', 
    label: 'Grocery & Supermart', 
    badge: 'Daily Essentials',
    icon: 'ShoppingBag', 
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Fresh groceries, staples, packaged foods, and daily essentials'
  },
  { 
    key: 'fruits_veg', 
    label: 'Fruits & Vegetables', 
    badge: 'Farm Fresh',
    icon: 'Apple', 
    gradient: 'from-green-500 to-emerald-600',
    description: 'Farm-fresh organic fruits, green vegetables, and seasonal produce'
  },
  { 
    key: 'dairy_eggs', 
    label: 'Dairy & Eggs', 
    badge: '100% Pure',
    icon: 'Milk', 
    gradient: 'from-amber-400 to-amber-600',
    description: 'Milk, cheese, butter, paneer, and fresh farm eggs'
  },
  { 
    key: 'bakery', 
    label: 'Bakery & Confectionery', 
    badge: 'Freshly Baked',
    icon: 'Croissant', 
    gradient: 'from-orange-400 to-amber-600',
    description: 'Artisan breads, pastries, cookies, cakes, and morning bakes'
  },
  { 
    key: 'electronics', 
    label: 'Electronics & Tech', 
    badge: '5G & Gadgets',
    icon: 'Headphones', 
    gradient: 'from-blue-600 to-indigo-600',
    description: 'Smartphones, audio, smart wearables, cables, and tech gear'
  },
  { 
    key: 'fashion', 
    label: 'Fashion & Apparel', 
    badge: 'Trending Styles',
    icon: 'Shirt', 
    gradient: 'from-purple-500 to-violet-600',
    description: 'Clothing, footwear, lifestyle accessories, and traditional wear'
  },
  { 
    key: 'pharmacy', 
    label: 'Pharmacy & Healthcare', 
    badge: '100% Genuine',
    icon: 'Cross', 
    gradient: 'from-rose-500 to-red-600',
    description: 'Prescription medicines, wellness supplements, first aid, and health care'
  },
  { 
    key: 'food', 
    label: 'Food & Restaurants', 
    badge: 'Hot & Fresh',
    icon: 'Utensils', 
    gradient: 'from-red-500 to-rose-600',
    description: 'Cooked meals, fast food, cafe specials, and regional delicacies'
  },
  { 
    key: 'beverages', 
    label: 'Beverages & Sips', 
    badge: 'Chilled & Fresh',
    icon: 'CupSoda', 
    gradient: 'from-cyan-500 to-blue-600',
    description: 'Juices, soft drinks, teas, coffees, and cold brews'
  },
  { 
    key: 'snacks', 
    label: 'Snacks & Quick Bites', 
    badge: 'Crispy & Tasty',
    icon: 'Cookie', 
    gradient: 'from-yellow-400 to-amber-500',
    description: 'Namkeen, chips, biscuits, chocolates, and confectionery'
  },
  { 
    key: 'personal_care', 
    label: 'Beauty & Personal Care', 
    badge: 'Derm Tested',
    icon: 'Sparkles', 
    gradient: 'from-pink-500 to-rose-500',
    description: 'Skincare, hair care, cosmetics, fragrances, and grooming'
  },
  { 
    key: 'household', 
    label: 'Household & Living', 
    badge: 'Everyday Living',
    icon: 'Home', 
    gradient: 'from-indigo-500 to-blue-600',
    description: 'Cleaning supplies, home utility, kitchenware, and storage'
  },
  { 
    key: 'general', 
    label: 'General Store', 
    badge: 'Trusted Store',
    icon: 'Store', 
    gradient: 'from-slate-600 to-slate-800',
    description: 'Multi-category retail, general goods, and community store'
  }
];

export const DEPARTMENT_KEYS = MERCHANT_DEPARTMENTS.map(d => d.key);

export function getDepartmentMeta(key) {
  if (!key) return MERCHANT_DEPARTMENTS.find(d => d.key === 'general');
  const normalized = key.toLowerCase().trim();
  return MERCHANT_DEPARTMENTS.find(d => d.key === normalized) || MERCHANT_DEPARTMENTS.find(d => d.key === 'general');
}

export function getDepartmentLabel(key) {
  return getDepartmentMeta(key).label;
}

export function getDepartmentBadge(key) {
  return getDepartmentMeta(key).badge;
}
