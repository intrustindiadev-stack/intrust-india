"use client";

<<<<<<< HEAD
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";

export default function AnalyticsPage() {
=======
import { Users, CreditCard, TrendingUp, Activity, DollarSign, Store } from "lucide-react";
import AdminAnalyticsCharts from "./AdminAnalyticsCharts";

export default function AnalyticsPage() {
    // --- DUMMY DATA FOR REALTIME ANALYTICS ---

    // 1. Stats Data
>>>>>>> origin/yogesh-final
    const stats = [
        {
            title: "Total Revenue",
            value: "₹52.5L",
            change: "+12.5%",
            trend: "up",
<<<<<<< HEAD
            icon: TrendingUp,
=======
            icon: DollarSign,
>>>>>>> origin/yogesh-final
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
<<<<<<< HEAD
            title: "Active Vendors",
            value: "156",
            change: "+4.3%",
            trend: "up",
            icon: Activity,
=======
            title: "Active Merchants",
            value: "156",
            change: "+4.3%",
            trend: "up",
            icon: Store,
>>>>>>> origin/yogesh-final
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
        {
            title: "Transactions",
            value: "142K",
            change: "-2.1%",
            trend: "down",
<<<<<<< HEAD
            icon: CreditCard,
=======
            icon: Activity,
>>>>>>> origin/yogesh-final
            color: "text-orange-600",
            bg: "bg-orange-100",
        },
    ];

<<<<<<< HEAD
=======
    // 2. User Growth Data (Last 14 days)
    const userGrowthData = [
        { date: '01 Nov', users: 45 },
        { date: '02 Nov', users: 52 },
        { date: '03 Nov', users: 38 },
        { date: '04 Nov', users: 65 },
        { date: '05 Nov', users: 48 },
        { date: '06 Nov', users: 59 },
        { date: '07 Nov', users: 72 },
        { date: '08 Nov', users: 85 },
        { date: '09 Nov', users: 68 },
        { date: '10 Nov', users: 90 },
        { date: '11 Nov', users: 105 },
        { date: '12 Nov', users: 95 },
        { date: '13 Nov', users: 115 },
        { date: '14 Nov', users: 130 },
    ];

    // 3. Revenue Stream Data
    const revenueSourceData = [
        { name: 'Gift Card Sales', value: 3500000 },
        { name: 'Merchant Commissions', value: 1250000 },
        { name: 'Premium Plans', value: 500000 },
    ];

    // 4. Real-time Activity Feed
>>>>>>> origin/yogesh-final
    const recentActivity = [
        {
            id: 1,
            user: "Rahul Kumar",
            action: "purchased a gift card",
<<<<<<< HEAD
            time: "2 minutes ago",
            amount: "₹1,000",
=======
            time: "Just now",
            amount: "₹1,000",
            status: "success"
>>>>>>> origin/yogesh-final
        },
        {
            id: 2,
            user: "Priya Singh",
            action: "redeemed a coupon",
<<<<<<< HEAD
            time: "15 minutes ago",
            amount: "-₹500",
        },
        {
            id: 3,
=======
            time: "2 minutes ago",
            amount: "-₹500",
            status: "success"
        },
        {
            id: 3,
            user: "Tech World",
            action: "merchant application received",
            time: "15 minutes ago",
            amount: "",
            status: "info"
        },
        {
            id: 4,
>>>>>>> origin/yogesh-final
            user: "Amit Sharma",
            action: "updated profile",
            time: "1 hour ago",
            amount: "",
<<<<<<< HEAD
        },
        {
            id: 4,
            user: "Sneha Gupta",
            action: "failed transaction",
            time: "3 hours ago",
            amount: "₹2,500",
=======
            status: "info"
        },
        {
            id: 5,
            user: "Sneha Gupta",
            action: "payment failed",
            time: "3 hours ago",
            amount: "₹2,500",
            status: "error"
>>>>>>> origin/yogesh-final
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
<<<<<<< HEAD
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Platform performance overview and key metrics.
                </p>
=======
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight font-[family-name:var(--font-outfit)]">
                        Platform Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Real-time overview of platform performance & activity
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-green-600">Live Updates</span>
                </div>
>>>>>>> origin/yogesh-final
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div
                        key={index}
<<<<<<< HEAD
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
=======
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transition-all hover:shadow-md"
>>>>>>> origin/yogesh-final
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
<<<<<<< HEAD
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
=======
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
>>>>>>> origin/yogesh-final
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center">
                            <span
<<<<<<< HEAD
                                className={`text-sm font-medium ${stat.trend === "up" ? "text-green-600" : "text-red-600"
=======
                                className={`text-sm font-semibold ${stat.trend === "up" ? "text-green-600" : "text-red-600"
>>>>>>> origin/yogesh-final
                                    }`}
                            >
                                {stat.change}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">from last month</span>
                        </div>
                    </div>
                ))}
            </div>

<<<<<<< HEAD
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
=======
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Charts Section (Takes up 2 cols on large screens) */}
                <div className="xl:col-span-2">
                    <AdminAnalyticsCharts
                        userGrowthData={userGrowthData}
                        revenueSourceData={revenueSourceData}
                    />
                </div>

                {/* Real-time Activity Feed */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 font-[family-name:var(--font-outfit)]">
                            Live Activity Feed
                        </h2>
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm
                                        ${activity.status === 'error' ? 'bg-red-100 text-red-600' :
                                            activity.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`
                                    }>
                                        {activity.user.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {activity.user}
                                            </p>
                                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{activity.time}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {activity.action}
                                        </p>
                                        {activity.amount && (
                                            <p className={`text-xs font-bold mt-1 ${activity.amount.startsWith('-') ? 'text-green-600' :
                                                activity.status === 'error' ? 'text-red-500' : 'text-gray-900'
                                                }`}>
                                                {activity.amount}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 text-sm text-[#92BCEA] font-bold hover:bg-gray-50 rounded-xl transition-colors border border-dashed border-[#92BCEA]/30">
                            View All Activity
                        </button>
                    </div>
>>>>>>> origin/yogesh-final
                </div>
            </div>
        </div>
    );
}
<<<<<<< HEAD
=======

>>>>>>> origin/yogesh-final
