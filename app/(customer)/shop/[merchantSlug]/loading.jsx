import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function StorefrontLoading() {
    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-32">
            <Navbar />
            <main className="pt-[88px] md:pt-[104px] max-w-7xl mx-auto px-4 md:px-8">
                {/* Header Skeleton */}
                <div className="sticky top-[76px] md:top-[92px] z-30 mb-6 bg-white dark:bg-[#0c0e16] rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-white/[0.08] shadow-sm py-3 px-4 md:px-5 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0 bg-slate-200 dark:bg-white/10" />
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full shrink-0 bg-slate-200 dark:bg-white/10" />
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-full w-1/3" />
                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/4" />
                    </div>
                </div>

                {/* Banner Skeleton */}
                <div className="w-full h-24 bg-slate-200 dark:bg-white/5 rounded-2xl mb-8 animate-pulse" />

                {/* Product Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <div key={i} className="flex flex-col bg-white dark:bg-[#0c0e16] rounded-[2rem] border border-slate-100 dark:border-white/[0.04] p-3 animate-pulse">
                            <div className="w-full aspect-square bg-slate-200 dark:bg-[#13161f] rounded-[1.5rem] mb-3" />
                            <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-full w-3/4 mb-2 ml-2" />
                            <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/2 mb-4 ml-2" />
                            <div className="flex justify-between items-center mt-auto px-2">
                                <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-full w-1/3" />
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
