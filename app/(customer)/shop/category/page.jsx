import { createStaticSupabaseClient } from '@/lib/supabaseServer';
import CategoryDirectoryClient from './CategoryDirectoryClient';
import { FALLBACK_CATEGORIES } from '@/lib/shopping/categories';

export const revalidate = 60;

export const metadata = {
    title: 'Shop by Category & Department | InTrust India',
    description: 'Browse authentic products across all categories and departments from verified Bhopal merchants and InTrust Official inventory.',
};

export default async function AllCategoriesPage() {
    const supabase = createStaticSupabaseClient();

    // Fetch active categories and products to compute real counts
    const [categoriesResult, productsResult] = await Promise.all([
        supabase
            .from('shopping_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
        supabase
            .from('shopping_products')
            .select('id, category, sub_category')
            .eq('is_active', true)
            .limit(500)
    ]);

    const dbCategories = (categoriesResult?.data && categoriesResult.data.length > 0)
        ? categoriesResult.data
        : FALLBACK_CATEGORIES;

    // Compute category counts
    const categoryCounts = {};
    if (productsResult?.data) {
        productsResult.data.forEach(p => {
            if (p.category) {
                const norm = p.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                categoryCounts[norm] = (categoryCounts[norm] || 0) + 1;
                categoryCounts[p.category.toLowerCase().trim()] = (categoryCounts[p.category.toLowerCase().trim()] || 0) + 1;
            }
        });
    }

    return (
        <CategoryDirectoryClient
            initialCategories={dbCategories}
            initialCounts={categoryCounts}
        />
    );
}
