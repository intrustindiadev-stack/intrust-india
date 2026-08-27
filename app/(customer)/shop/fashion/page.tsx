import React, { Suspense } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getProductsForCategory } from '@/lib/fashion/products';
import PLPClientWrapper from '@/components/product/plp-client-wrapper';

export const metadata = {
  title: 'Fashion Store - Intrust',
  description: 'Discover the latest fashion trends at Intrust.',
};

export default async function FashionLanding() {
  // Fetch a few products for the New Arrivals section
  const { data: newArrivals } = await getProductsForCategory("", { sort: 'newest', page: 1, view: 'grid' });
  const top4Arrivals = newArrivals.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-24">
        {/* Editorial Hero */}
        <div className="relative w-full h-[70vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')" }}
          >
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
            <span className="text-white/90 text-sm md:text-base tracking-[0.2em] font-bold uppercase mb-4">Fall / Winter Collection</span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 drop-shadow-md">
              THE NEW SEASON
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium">
              Elevate your wardrobe with our curated collection of premium essentials and statement pieces.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link 
                href="/shop/fashion/c/women"
                className="px-10 py-4 bg-white text-slate-900 font-bold uppercase tracking-wider rounded-none hover:bg-slate-100 hover:scale-[1.02] transition-all duration-300 w-full sm:w-auto text-sm"
              >
                Shop Women
              </Link>
              <Link 
                href="/shop/fashion/c/men"
                className="px-10 py-4 bg-transparent border border-white text-white font-bold uppercase tracking-wider rounded-none hover:bg-white hover:text-slate-900 hover:scale-[1.02] transition-all duration-300 w-full sm:w-auto text-sm"
              >
                Shop Men
              </Link>
            </div>
          </div>
        </div>

        {/* Category Discovery */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Shop by Category</h2>
            <div className="h-0.5 w-16 bg-slate-900 dark:bg-white mx-auto mt-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {/* Women Category Card */}
            <Link href="/shop/fashion/c/women" className="group relative h-[450px] md:h-[600px] overflow-hidden block">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1920&auto=format&fit=crop')" }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full flex flex-col justify-end">
                <h3 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">Women</h3>
                <p className="text-white/80 font-medium mb-6 text-lg">Effortless silhouettes for every occasion.</p>
                <span className="inline-flex items-center text-white font-bold uppercase tracking-widest text-sm group-hover:underline decoration-2 underline-offset-4">
                  Explore <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </span>
              </div>
            </Link>

            {/* Men Category Card */}
            <Link href="/shop/fashion/c/men" className="group relative h-[450px] md:h-[600px] overflow-hidden block">
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=1920&auto=format&fit=crop')" }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full flex flex-col justify-end">
                <h3 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">Men</h3>
                <p className="text-white/80 font-medium mb-6 text-lg">Elevated everyday essentials.</p>
                <span className="inline-flex items-center text-white font-bold uppercase tracking-widest text-sm group-hover:underline decoration-2 underline-offset-4">
                  Explore <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* Featured Editorial */}
        <section className="bg-slate-900 dark:bg-black text-white py-20 my-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 flex flex-col justify-center max-w-lg lg:ml-auto pr-0 lg:pr-12 text-center lg:text-left">
                <span className="text-white/60 text-sm tracking-[0.2em] font-bold uppercase mb-4">Editorial Story</span>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">The Art of Subtlety</h2>
                <p className="text-white/80 text-lg mb-8 leading-relaxed">
                  Discover pieces that speak volumes through quiet confidence. Muted palettes, impeccable tailoring, and luxurious fabrics define our latest exclusive collection.
                </p>
                <div>
                  <Link href="/shop/fashion/c/women" className="inline-block px-8 py-4 bg-white text-slate-900 font-bold uppercase tracking-wider text-sm hover:bg-slate-200 transition-colors">
                    Read the Story
                  </Link>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative w-full aspect-[4/5] max-w-lg mx-auto lg:mx-0 overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550614000-4b95d466f254?q=80&w=2070&auto=format&fit=crop')" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* New Arrivals (if available) */}
        {top4Arrivals.length > 0 && (
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">New Arrivals</h2>
                <div className="h-0.5 w-16 bg-slate-900 dark:bg-white mt-6"></div>
              </div>
              <Link href="/shop/fashion" className="hidden sm:inline-flex items-center text-slate-900 dark:text-white font-bold uppercase tracking-widest text-sm hover:underline underline-offset-4">
                View All <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              <Suspense fallback={<div className="col-span-full py-12 text-center text-slate-500">Loading products...</div>}>
                <PLPClientWrapper products={top4Arrivals} viewMode="grid" />
              </Suspense>
            </div>
            
            <div className="mt-8 text-center sm:hidden">
              <Link href="/shop/fashion" className="inline-flex items-center text-slate-900 dark:text-white font-bold uppercase tracking-widest text-sm hover:underline underline-offset-4">
                View All
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
