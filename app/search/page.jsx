import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SearchResultsClient from './SearchResultsClient';
import { Loader2 } from 'lucide-react';

export async function generateMetadata({ searchParams }) {
    const params = await searchParams;
    const q = params?.q || '';
    return {
        title: q
            ? `Search results for "${q}" — Intrust`
            : 'Search — Intrust',
        alternates: { canonical: '/search' },
        robots: { index: false, follow: true },
    };
}

function SearchPageFallback() {
    return (
        <div 
            className="min-h-screen flex items-center justify-center" 
            style={{ background: 'var(--bg-primary)' }}
        >
            <Loader2 className="w-10 h-10 text-[#92BCEA] animate-spin" />
        </div>
    );
}

export default async function SearchPage({ searchParams }) {
    const params = await searchParams;
    const q = params?.q || '';
    const type = params?.type || '';
    const page = params?.page || '1';
    const sort = params?.sort || 'relevance';
    const categories = params?.categories || '';
    const minPrice = params?.minPrice || '0';
    const maxPrice = params?.maxPrice || '100000';

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            <Navbar />
            <Suspense fallback={<SearchPageFallback />}>
                <SearchResultsClient 
                    initialParams={{ 
                        q, 
                        type, 
                        page, 
                        sort, 
                        categories, 
                        minPrice, 
                        maxPrice 
                    }} 
                />
            </Suspense>
            <Footer />
        </div>
    );
}
