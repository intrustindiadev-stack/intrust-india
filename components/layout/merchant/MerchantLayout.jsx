'use client';

import { useState } from 'react';
import Sidebar from '@/components/merchant/Sidebar';
import Header from '@/components/merchant/Header';

export default function MerchantLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="font-sans text-slate-800 dark:text-slate-100 min-h-screen merchant-gradient-bg">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300 relative bg-transparent w-full">
                <Header setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-4 sm:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
