import React from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown } from 'lucide-react';

export default function UtilityBar({ locationName = 'Current Location', currentPageName = 'Stores', storeCount = 0 }) {
    return (
        <div className="bg-slate-50 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-between">
                {/* LEFT: Location Selector */}
                <button className="flex items-center gap-1.5 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>{locationName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                
                {/* CENTER: Breadcrumbs — hidden on mobile */}
                <nav className="hidden sm:flex items-center gap-1.5 text-sm">
                    <Link href="/shop" className="text-gray-500 hover:text-gray-700">Intrust Mart</Link>
                    <span className="text-gray-300">›</span>
                    <span className="text-gray-800 font-medium">{currentPageName}</span>
                </nav>
                
                {/* RIGHT: Store Count */}
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                    {storeCount} stores
                </span>
            </div>
        </div>
    );
}
