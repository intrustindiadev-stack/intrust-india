import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { getCategoryByPath, getCategoryAncestors, getCategoryDescendants } from '../../../../../lib/fashion/categories';
import { getProductsForCategory } from '../../../../../lib/fashion/products';
import { getFacetsForCategory } from '../../../../../lib/fashion/facets';
import { plpQuerySchema } from '../../../../../lib/validation/fashion';
import FilterDrawer from '../../../../../components/filters/filter-drawer';
import PLPClientWrapper from '../../../../../components/product/plp-client-wrapper';
import SortSelect from '../../../../../components/product/sort-select';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface Props {
  params: Promise<{ categoryPath: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const pathArray = resolvedParams.categoryPath || [];
  if (pathArray.length === 0) return { title: 'Fashion - Intrust' };
  const category = await getCategoryByPath(pathArray);
  if (!category) return { title: 'Category Not Found' };
  return {
    title: `${category.title} - Fashion | Intrust`,
    description: category.description || `Shop the latest ${category.title} at Intrust.`,
  };
}

export default async function FashionPLP({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const pathArray = resolvedParams.categoryPath || [];
  if (pathArray.length === 0) redirect('/shop/fashion/women');

  // Guard: if the first path segment is 'product', this is a product detail URL
  // that should be handled by /shop/fashion/product/[id]/page.tsx.
  // Redirect to it — this prevents the catch-all from swallowing the route in dev.
  if (pathArray[0] === 'product' && pathArray.length >= 2) {
    redirect(`/shop/fashion/product/${pathArray[1]}`);
  }

  const category = await getCategoryByPath(pathArray);
  if (!category) notFound();

  const queryResult = plpQuerySchema.safeParse({
    size: resolvedSearchParams.size,
    fit: resolvedSearchParams.fit,
    color: resolvedSearchParams.color,
    fabric: resolvedSearchParams.fabric,
    price: resolvedSearchParams.price,
    sort: resolvedSearchParams.sort,
    page: resolvedSearchParams.page,
    view: resolvedSearchParams.view,
  });
  const query = queryResult.success ? queryResult.data : plpQuerySchema.parse({});

  const [ancestors, childrenCategories, { data: products, count }, facets] = await Promise.all([
    getCategoryAncestors(pathArray.slice(0, -1)),
    getCategoryDescendants(category.id),
    getProductsForCategory(category.path, query),
    getFacetsForCategory(category.path, query),
  ]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

        {/* ── Breadcrumbs ── */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
            <Home size={12} /> Shop
          </Link>
          <ChevronRight size={12} className="text-slate-300" />
          <Link href="/shop/fashion/women" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Fashion
          </Link>
          {ancestors.map(a => (
            <React.Fragment key={a.id}>
              <ChevronRight size={12} className="text-slate-300" />
              <Link href={`/shop/fashion/${a.path}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                {a.name}
              </Link>
            </React.Fragment>
          ))}
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-slate-700 dark:text-slate-200">{category.name}</span>
        </nav>

        {/* ── Category Hero Banner ── */}
        {category.banner_url ? (
          <div
            className="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden mb-6 bg-slate-200 dark:bg-slate-800"
            style={{ backgroundImage: `url(${category.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{category.title}</h1>
              {category.description && <p className="text-white/80 text-sm mt-1 max-w-lg">{category.description}</p>}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{category.title}</h1>
            {category.description && <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{category.description}</p>}
          </div>
        )}

        {/* ── Subcategory Pills ── */}
        {childrenCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
            {childrenCategories.map(child => (
              <Link
                key={child.id}
                href={`/shop/fashion/${child.path}`}
                className="flex-shrink-0 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        {/* ── Controls Bar ── */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="text-slate-800 dark:text-slate-100 font-bold">{count}</span> results
          </p>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <FilterDrawer facets={facets} totalResults={count} />
            </Suspense>
            <Suspense fallback={null}>
              <SortSelect defaultValue={query.sort} />
            </Suspense>
          </div>
        </div>

        {/* ── Product Grid ── */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            <PLPClientWrapper products={products} viewMode={query.view} />
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="text-4xl mb-4">👗</div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No products found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your filters or browsing another category.</p>
            <Link href="/shop/fashion/women" className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
              Browse All Fashion
            </Link>
          </div>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
}
