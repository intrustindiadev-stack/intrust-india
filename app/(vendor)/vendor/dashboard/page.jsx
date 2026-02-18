'use client';

import { Package, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function VendorDashboardPage() {
    const stats = [
        { label: 'Total Inventory', value: '12,450', change: '+245', icon: Package, color: 'from-orange-500 to-red-500' },
        { label: 'Active Merchants', value: '28', change: '+3', icon: Users, color: 'from-blue-500 to-cyan-500' },
        { label: 'Monthly Revenue', value: '₹2,45,000', change: '+18%', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
        { label: 'Orders Today', value: '89', change: '+12', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                    Vendor Dashboard
                </h1>
                <p className="text-gray-600">Manage your wholesale inventory and merchant relationships</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                    <Icon className="text-white" size={24} />
                                </div>
                                <span className="text-sm font-semibold text-green-600">{stat.change}</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-600">{stat.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Coming Soon */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Package size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Portal Coming Soon</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                    We're building powerful tools for wholesale suppliers. Stay tuned for inventory management, bulk uploads, and more!
                </p>
            </div>
        </div>
    );
}
