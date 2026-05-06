'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Briefcase, UserCircle, Settings } from 'lucide-react';

export default function CRMBottomNav({ isSidebarOpen }) {
    const pathname = usePathname();

    const items = [
        { label: 'Home', icon: Home, href: '/crm' },
        { label: 'Leads', icon: Users, href: '/crm/leads' },
        { label: 'Pipeline', icon: Briefcase, href: '/crm/pipeline' },
        { label: 'Profile', icon: UserCircle, href: '/crm/profile' },
        { label: 'Settings', icon: Settings, href: '/crm/settings' },
    ];

    if (isSidebarOpen) return null;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 z-40 pb-safe">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/crm' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}
                        >
                            <Icon size={20} className={isActive ? 'stroke-2' : 'stroke-[1.5]'} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
