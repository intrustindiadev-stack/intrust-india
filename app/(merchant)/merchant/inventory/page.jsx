import Link from 'next/link';

export default function InventoryHubPage() {
    return (
        <div className="relative min-h-[80vh] flex flex-col justify-center">
            {/* Background embellishments */}
            <div className="fixed top-[10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

            <div className="text-center mb-12">
                <h1 className="font-display text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Select Inventory</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">Choose which segment of your business you'd like to manage stock for today.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto w-full px-4">
                {/* Gift Cards Card */}
                <Link href="/merchant/inventory/giftcards" className="group relative merchant-glass rounded-[2rem] p-8 border border-black/5 dark:border-white/5 hover:border-[#D4AF37]/30 transition-all overflow-hidden flex flex-col items-center text-center shadow-lg hover:shadow-xl hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500">
                        <span className="material-icons-round text-amber-600 dark:text-amber-400 text-4xl">card_giftcard</span>
                    </div>
                    
                    <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white mb-2 relative z-10">Gift Cards</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 relative z-10">Manage your purchased digital coupons, gift cards, and track their redemption status.</p>
                    
                    <div className="mt-auto inline-flex items-center space-x-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl relative z-10 group-hover:bg-[#D4AF37] group-hover:text-slate-900 transition-colors">
                        <span>Manage Gift Cards</span>
                        <span className="material-icons-round text-sm">arrow_forward</span>
                    </div>
                </Link>

                {/* E-Commerce Card */}
                <Link href="/merchant/shopping/inventory" className="group relative merchant-glass rounded-[2rem] p-8 border border-black/5 dark:border-white/5 hover:border-blue-500/30 transition-all overflow-hidden flex flex-col items-center text-center shadow-lg hover:shadow-xl hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500">
                        <span className="material-icons-round text-blue-600 dark:text-blue-400 text-4xl">inventory_2</span>
                    </div>
                    
                    <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white mb-2 relative z-10">E-Commerce</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 relative z-10">Manage physical products, wholesale purchases, auto-mode settings, and stock levels.</p>
                    
                    <div className="mt-auto inline-flex items-center space-x-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl relative z-10 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <span>Manage E-Commerce</span>
                        <span className="material-icons-round text-sm">arrow_forward</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}
