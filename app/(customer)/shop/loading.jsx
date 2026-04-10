import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export default function ShopLoading() {
    return (
        <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] relative pb-32">
            <Navbar />
            <main className="pt-[88px] md:pt-[104px] max-w-7xl mx-auto px-4 md:px-8">
                {/* Header Skeleton */}
                <div className="sticky top-[76px] md:top-[92px] z-30 mb-6 bg-white dark:bg-[#0c0e16] rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-white/[0.08] shadow-sm py-4 px-5 flex items-center justify-between">
                    <div className="flex flex-col gap-2 w-1/3">
                        <div className="h-6 bg-slate-200 dark:bg-white/10 rounded-full w-2/3 animate-pulse" />
                        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/2 animate-pulse" />
                    </div>
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                    </div>
                </div>

                {/* Banner Skeleton */}
                <div className="w-full h-[200px] sm:h-[300px] bg-slate-200 dark:bg-white/5 rounded-[2rem] mb-8 animate-pulse" />

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="flex flex-col h-[280px] bg-white dark:bg-[#0c0e16] rounded-[2rem] border border-slate-100 dark:border-white/[0.04] animate-pulse overflow-hidden">
                            <div className="w-full h-[140px] bg-slate-200 dark:bg-[#13161f] relative">
                                <div className="absolute -bottom-8 left-5 w-[72px] h-[72px] rounded-[1.25rem] bg-white dark:bg-[#13161f] p-1.5 shadow-md">
                                    <div className="w-full h-full bg-slate-200 dark:bg-white/5 rounded-xl" />
                                </div>
                            </div>
                            <div className="flex-1 px-5 pt-11 pb-5">
                                <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-full w-3/4 mb-2" />
                                <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-1/2" />
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
