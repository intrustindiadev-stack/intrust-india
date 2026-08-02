import Link from 'next/link';
import { PackageSearch, ShieldAlert, ArrowRight, Truck } from 'lucide-react';

export function TrackOrdersCard() {
    return (
        <Link href="/orders" className="block w-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors"></div>
                
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                        <PackageSearch size={24} />
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Track My Orders</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            View and track your Shopping, NFC, and Gift Card orders.
                        </p>
                    </div>

                    <div className="flex items-center text-sm font-bold text-blue-600 dark:text-blue-400 mt-2">
                        View Details <ArrowRight size={16} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function KYCRedirectCard({ status }) {
    if (status === 'verified' || status === 'approved') return null;

    return (
        <Link href="/profile?section=kyc" className="block w-full">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full blur-2xl group-hover:scale-125 transition-transform"></div>
                
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <ShieldAlert size={24} />
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-1">Complete KYC</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400/80">
                            Your KYC is pending. Complete it to unlock wallet features and purchase limits.
                        </p>
                    </div>

                    <div className="flex items-center text-sm font-bold text-amber-700 dark:text-amber-400 mt-2">
                        Verify Now <ArrowRight size={16} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
