import {
    ShoppingBasket,
    Headphones,
    Smartphone,
    Shirt,
    Home,
    Sun,
    Gift,
    CreditCard,
    Sparkles,
    Package,
    Tag
} from 'lucide-react';

export function getCategorySlug(category) {
    if (!category) return '';
    if (typeof category === 'string') {
        return category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (category.slug) return category.slug;
    if (category.name) {
        return category.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    return '';
}

export function getCategoryIcon(nameOrSlug = '') {
    const s = (nameOrSlug || '').toLowerCase();
    if (s.includes('grocer') || s.includes('food') || s.includes('vegetable') || s.includes('fruit') || s.includes('snack')) {
        return ShoppingBasket;
    }
    if (s.includes('elect') || s.includes('audio') || s.includes('headphone') || s.includes('sound')) {
        return Headphones;
    }
    if (s.includes('mobil') || s.includes('phone') || s.includes('tablet') || s.includes('gadget')) {
        return Smartphone;
    }
    if (s.includes('fashion') || s.includes('cloth') || s.includes('wear') || s.includes('apparel') || s.includes('shirt')) {
        return Shirt;
    }
    if (s.includes('home') || s.includes('kitchen') || s.includes('living') || s.includes('decor')) {
        return Home;
    }
    if (s.includes('solar') || s.includes('energy') || s.includes('power')) {
        return Sun;
    }
    if (s.includes('gift') || s.includes('voucher')) {
        return Gift;
    }
    if (s.includes('nfc') || s.includes('smart') || s.includes('card')) {
        return CreditCard;
    }
    if (s.includes('beauty') || s.includes('wellness') || s.includes('health')) {
        return Sparkles;
    }
    return Package;
}

export function getCategoryImage(category) {
    if (!category) return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';
    if (typeof category === 'object' && category?.image_url) {
        return category.image_url;
    }
    const nameOrSlug = (typeof category === 'string' ? category : (category.name || category.slug || '')).toLowerCase();
    
    if (nameOrSlug.includes('grocer') || nameOrSlug.includes('food') || nameOrSlug.includes('snack') || nameOrSlug.includes('vegetable')) {
        return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('elect') || nameOrSlug.includes('audio') || nameOrSlug.includes('headphone')) {
        return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('mobil') || nameOrSlug.includes('phone') || nameOrSlug.includes('gadget')) {
        return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('fashion') || nameOrSlug.includes('cloth') || nameOrSlug.includes('wear') || nameOrSlug.includes('apparel') || nameOrSlug.includes('shirt')) {
        return 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('home') || nameOrSlug.includes('living') || nameOrSlug.includes('kitchen') || nameOrSlug.includes('decor')) {
        return 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('beauty') || nameOrSlug.includes('wellness') || nameOrSlug.includes('cosmetic') || nameOrSlug.includes('skincare')) {
        return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('sport') || nameOrSlug.includes('fitness') || nameOrSlug.includes('gym')) {
        return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('health') || nameOrSlug.includes('pharma') || nameOrSlug.includes('medicine')) {
        return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('tool') || nameOrSlug.includes('hardware')) {
        return 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('construct') || nameOrSlug.includes('industrial') || nameOrSlug.includes('build')) {
        return 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('solar') || nameOrSlug.includes('energy') || nameOrSlug.includes('power')) {
        return 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('gift')) {
        return 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80';
    }
    if (nameOrSlug.includes('nfc') || nameOrSlug.includes('card')) {
        return 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=300&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';
}

export const FALLBACK_CATEGORIES = [
    { id: 'cat-groceries', name: 'Groceries', slug: 'groceries', tag: 'Fresh' },
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', tag: 'Top Tech' },
    { id: 'cat-mobiles', name: 'Mobiles', slug: 'mobiles', tag: 'Trending' },
    { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', tag: 'New' },
    { id: 'cat-home', name: 'Home & Living', slug: 'home', tag: 'Decor' },
    { id: 'cat-solar', name: 'Solar Tech', slug: 'solar', tag: 'Eco' },
];
