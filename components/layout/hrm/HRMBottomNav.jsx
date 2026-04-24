'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Clock, Calendar } from 'lucide-react';

export default function HRMBottomNav({ isSidebarOpen }) {
    const pathname = usePathname();

    const items = [
        { label: 'Home', icon: Home, href: '/hrm' },
        { label: 'Users', icon: Users, href: '/hrm/employees' },
        { label: 'Clock', icon: Clock, href: '/hrm/attendance' },
        { label: 'Leaves', icon: Calendar, href: '/hrm/leaves' },
    ];

    if (isSidebarOpen) return null;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 z-40 pb-safe">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/hrm' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}
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
