'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, Calendar, FileText } from 'lucide-react';

export default function EmployeeBottomNav({ isSidebarOpen }) {
    const pathname = usePathname();

    const items = [
        { label: 'Home', icon: Home, href: '/employee' },
        { label: 'Clock In', icon: Clock, href: '/employee/attendance' },
        { label: 'Leaves', icon: Calendar, href: '/employee/leaves' },
        { label: 'Payslips', icon: FileText, href: '/employee/payslips' },
    ];

    if (isSidebarOpen) return null;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 z-40 pb-safe">
            <div className="flex justify-around items-center h-16">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/employee' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-amber-600' : 'text-gray-500'}`}
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
