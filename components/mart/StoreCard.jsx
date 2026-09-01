import React from 'react';
import Link from 'next/link';
import { Star, Store } from 'lucide-react';

export default function StoreCard({ store }) {
    return (
        <Link href={store.isOfficial ? "/shop/official" : `/shop/${store.slug}`} className="block group">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
                {/* Banner Area */}
                <div className="h-28 sm:h-32 bg-gradient-to-br from-blue-50 to-slate-100 relative shrink-0">
                    {store.bannerImage ? (
                        <img src={store.bannerImage} alt="" className="w-full h-full object-cover" />
                    ) : null}
                    
                    {/* Overlapping Logo */}
                    <div className="absolute bottom-0 translate-y-1/2 left-4">
                        {store.logo ? (
                            <img 
                                src={store.logo} 
                                alt={store.name} 
                                className="w-12 h-12 rounded-lg bg-white shadow-sm border border-gray-100 object-cover" 
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                                {store.name ? (
                                    <span className="font-bold text-gray-400 text-lg">{store.name[0]?.toUpperCase()}</span>
                                ) : (
                                    <Store className="w-5 h-5 text-gray-300" />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="pt-8 px-4 pb-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
                        {store.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{store.category}</p>
                    
                    <div className="flex items-center gap-2 mt-auto pt-3">
                        {store.rating != null && (
                            <span className="flex items-center gap-0.5 text-xs text-gray-400 font-medium">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                {store.rating.toFixed(1)}
                            </span>
                        )}
                        {store.deliveryTime && (
                            <span className="text-[11px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium ml-auto">
                                {store.deliveryTime}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
