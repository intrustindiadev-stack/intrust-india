'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BarChart2, Briefcase, X } from 'lucide-react';

export default function CRMSidebar({ isOpen, setIsOpen, userProfile }) {
    const pathname = usePathname();

    const isManager = userProfile?.role === 'sales_manager' || userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

    const menuItems = [
        { name: 'Dashboard', icon: Home, path: '/crm' },
        { name: 'Leads', icon: Users, path: '/crm/leads' },
        { name: 'Pipeline', icon: Briefcase, path: '/crm/pipeline' },
    ];

    if (isManager) {
        menuItems.push({ name: 'Reports', icon: BarChart2, path: '/crm/reports' });
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-50 
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                flex flex-col
            `}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
                            C
                        </div>
                        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            CRM
                        </span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group
                                    ${isActive 
                                        ? 'bg-indigo-50 text-indigo-700' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon 
                                    size={20} 
                                    className={`
                                        transition-colors duration-200
                                        ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}
                                    `} 
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}
