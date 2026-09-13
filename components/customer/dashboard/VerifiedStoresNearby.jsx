import React from 'react';
import Link from 'next/link';
import { Store, ArrowRight } from 'lucide-react';
import MerchantCard from '@/components/customer/shop/MerchantCard';

function VerifiedStoresNearby({ merchants = [] }) {
    if (!merchants || merchants.length === 0) return null;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                        <Store size={22} className="text-primary" />
                        <span>Verified Stores Nearby</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
                        Reserve online and pick up locally with direct merchant contact.
                    </p>
                </div>
                <Link
                    href="/shop"
                    className="text-xs font-bold text-primary hover:text-blue-700 flex items-center gap-1 group"
                >
                    <span>All Stores</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {merchants.map((merchant) => (
                    <MerchantCard
                        key={merchant.id}
                        merchant={merchant}
                        variant="showcase"
                    />
                ))}
            </div>
        </div>
    );
}

export default React.memo(VerifiedStoresNearby);
