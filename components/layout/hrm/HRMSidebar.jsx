'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Calendar, Clock, DollarSign, BookOpen, Shield, X, Briefcase, UserCircle, Settings } from 'lucide-react';

export default function HRMSidebar({ isOpen, setIsOpen, userProfile }) {
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', icon: Home, path: '/hrm' },
        { name: 'Employees', icon: Users, path: '/hrm/employees' },
        { name: 'Jobs', icon: Briefcase, path: '/hrm/jobs' },
        { name: 'Recruitment', icon: Users, path: '/hrm/recruitment' },
        { name: 'Attendance', icon: Clock, path: '/hrm/attendance' },
        { name: 'Leaves', icon: Calendar, path: '/hrm/leaves' },
        { name: 'Salary', icon: DollarSign, path: '/hrm/salary' },
        { name: 'Training', icon: BookOpen, path: '/hrm/training' },
        { name: 'Audit Logs', icon: Shield, path: '/hrm/audit' },
        { name: 'My Profile', icon: UserCircle, path: '/hrm/profile' },
        { name: 'Settings', icon: Settings, path: '/hrm/settings' },
    ];

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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-xl">
                            H
                        </div>
                        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                            HRM
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
                                        ? 'bg-emerald-50 text-emerald-700' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                            >
                                <Icon 
                                    size={20} 
                                    className={`
                                        transition-colors duration-200
                                        ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}
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
