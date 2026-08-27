import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { getCategoryByPath, getCategoryAncestors, getCategoryDescendants } from '@/lib/fashion/categories';
import { getProductsForCategory } from '@/lib/fashion/products';
import { getFacetsForCategory } from '@/lib/fashion/facets';
import { plpQuerySchema } from '@/lib/validation/fashion';
import FilterDrawer from '@/components/filters/filter-drawer';
import PLPClientWrapper from '@/components/product/plp-client-wrapper';
import SortSelect from '@/components/product/sort-select';
import PLPPagination from '@/components/commerce/PLPPagination';
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
  if (pathArray.length === 0) redirect('/shop/fashion/c/women');

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
    <div className="min-h-screen bg-white dark:bg-[#080a10] font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">

        {/* ── Breadcrumbs ── */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium" aria-label="Breadcrumb">
          <Link href="/shop" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
            <Home size={12} /> Shop
          </Link>
          <ChevronRight size={12} className="text-slate-300" />
          <Link href="/shop/fashion/c/women" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Fashion
          </Link>
          {ancestors.map(a => (
            <React.Fragment key={a.id}>
              <ChevronRight size={12} className="text-slate-300" />
              <Link href={`/shop/fashion/c/${a.path}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">
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
            className="relative w-full h-[30vh] sm:h-[40vh] mb-8 bg-slate-100 dark:bg-slate-900"
            style={{ backgroundImage: `url(${category.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center text-center p-6">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase">{category.title}</h1>
              {category.description && <p className="text-white/90 text-sm sm:text-lg mt-4 max-w-2xl font-medium">{category.description}</p>}
            </div>
          </div>
        ) : (
          <div className="mb-12 mt-8 text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{category.title}</h1>
            {category.description && <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mt-4 leading-relaxed">{category.description}</p>}
          </div>
        )}

        {/* ── Subcategory Pills ── */}
        {childrenCategories.length > 0 && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 mb-8 justify-center">
            {childrenCategories.map(child => (
              <Link
                key={child.id}
                href={`/shop/fashion/c/${child.path}`}
                className="flex-shrink-0 px-6 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}

        {/* ── Controls Bar ── */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-white/5">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            <span className="text-slate-900 dark:text-white font-bold">{count}</span> Products
          </p>
          <div className="flex items-center gap-4">
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
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-10 gap-x-4 sm:gap-x-6 lg:gap-x-8">
              <PLPClientWrapper products={products} viewMode={query.view} />
            </div>
            <Suspense fallback={null}>
              <PLPPagination page={query.page} totalCount={count} pageSize={24} />
            </Suspense>
          </>
        ) : (
          <div className="py-20 text-center">
            <div className="text-4xl mb-4">👗</div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">No products found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your filters or browsing another category.</p>
            <Link href="/shop/fashion/c/women" className="mt-6 inline-block px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase tracking-widest text-xs rounded-xl hover:scale-[1.02] transition-transform shadow-md">
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
