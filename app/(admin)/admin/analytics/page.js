"use client";

import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";

export default function AnalyticsPage() {
    const stats = [
        {
            title: "Total Revenue",
            value: "₹52.5L",
            change: "+12.5%",
            trend: "up",
            icon: TrendingUp,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            title: "Total Users",
            value: "24.8K",
            change: "+18.2%",
            trend: "up",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            title: "Active Vendors",
            value: "156",
            change: "+4.3%",
            trend: "up",
            icon: Activity,
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
        {
            title: "Transactions",
            value: "142K",
            change: "-2.1%",
            trend: "down",
            icon: CreditCard,
            color: "text-orange-600",
            bg: "bg-orange-100",
        },
    ];

    const recentActivity = [
        {
            id: 1,
            user: "Rahul Kumar",
            action: "purchased a gift card",
            time: "2 minutes ago",
            amount: "₹1,000",
        },
        {
            id: 2,
            user: "Priya Singh",
            action: "redeemed a coupon",
            time: "15 minutes ago",
            amount: "-₹500",
        },
        {
            id: 3,
            user: "Amit Sharma",
            action: "updated profile",
            time: "1 hour ago",
            amount: "",
        },
        {
            id: 4,
            user: "Sneha Gupta",
            action: "failed transaction",
            time: "3 hours ago",
            amount: "₹2,500",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Platform performance overview and key metrics.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    {stat.title}
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                    {stat.value}
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center">
                            <span
                                className={`text-sm font-medium ${stat.trend === "up" ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {stat.change}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">from last month</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts & Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart Placeholder */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Revenue Overview
                    </h2>
                    <div className="h-80 w-full bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                        <div className="text-center">
                            <TrendingUp className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-400 font-medium">Chart Visualization Placeholder</p>
                            <p className="text-gray-400 text-sm">
                                (Integrate Recharts or similar library here)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Recent Activity
                    </h2>
                    <div className="space-y-6">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                                    {activity.user.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {activity.user}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {activity.action}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                </div>
                                {activity.amount && (
                                    <div className={`text-sm font-medium ${activity.amount.startsWith('-') ? 'text-red-600' : 'text-gray-900'
                                        }`}>
                                        {activity.amount}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                        View All Activity
                    </button>
                </div>
            </div>
        </div>
    );
}
