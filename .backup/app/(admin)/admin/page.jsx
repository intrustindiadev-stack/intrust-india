'use client'

import { useEffect, useState } from 'react'
import { useAuth, useIsAdmin } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { getGiftCardStats } from './giftcards/actions'

export default function AdminDashboard() {
    const [revenue, setRevenue] = useState(null)
    const [giftCardStats, setGiftCardStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const { isAdmin, loading: authLoading } = useIsAdmin()
    const router = useRouter()

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/dashboard')
        }
    }, [isAdmin, authLoading, router])

    useEffect(() => {
        if (isAdmin) {
            fetchRevenue()
            fetchGiftCardStats()
        }
    }, [isAdmin])

    async function fetchRevenue() {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/revenue')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch revenue')
            }

            setRevenue(data)
        } catch (err) {
            console.error('Error fetching revenue:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchGiftCardStats() {
        try {
            const result = await getGiftCardStats()
            if (result.success) {
                setGiftCardStats(result.data)
            }
        } catch (err) {
            console.error('Error fetching gift card stats:', err)
        }
    }

    function formatPrice(paise) {
        if (paise === null) return '₹0.00'
        return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
                    <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl p-6 h-32"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
                    <p className="text-gray-600">Platform overview and management</p>
                </div>

                {/* Revenue Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Total Transactions</p>
                        <p className="text-3xl font-bold text-gray-900">{revenue?.total_transactions || 0}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Gross Merchandise Value</p>
                        <p className="text-3xl font-bold text-blue-600">{formatPrice(revenue?.total_gmv_paise || 0)}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Platform Revenue (3% Fee)</p>
                        <p className="text-3xl font-bold text-green-600">{formatPrice(revenue?.total_platform_revenue_paise || 0)}</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-600 mb-2">Unique Buyers</p>
                        <p className="text-3xl font-bold text-purple-600">{revenue?.unique_buyers || 0}</p>
                    </div>
                </div>

                {/* Gift Card Stats */}
                {giftCardStats && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gift Card Inventory</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                                <p className="text-sm text-blue-600 mb-1">Total Gift Cards</p>
                                <p className="text-3xl font-bold text-blue-900">{giftCardStats.total}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                                <p className="text-sm text-green-600 mb-1">Active Cards</p>
                                <p className="text-3xl font-bold text-green-900">{giftCardStats.active}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                                <p className="text-sm text-red-600 mb-1">Expired Cards</p>
                                <p className="text-3xl font-bold text-red-900">{giftCardStats.expired}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                            onClick={() => router.push('/admin/giftcards')}
                            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
                        >
                            <div className="text-2xl mb-2">🎁</div>
                            <p className="font-semibold text-gray-900">Gift Cards</p>
                            <p className="text-sm text-gray-600">Manage gift card inventory</p>
                        </button>

                        <button
                            onClick={() => router.push('/admin/coupons')}
                            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
                        >
                            <div className="text-2xl mb-2">🎟️</div>
                            <p className="font-semibold text-gray-900">Manage Coupons</p>
                            <p className="text-sm text-gray-600">Create and manage coupons</p>
                        </button>

                        <button
                            onClick={() => router.push('/admin/transactions')}
                            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
                        >
                            <div className="text-2xl mb-2">💰</div>
                            <p className="font-semibold text-gray-900">Transactions</p>
                            <p className="text-sm text-gray-600">View all transactions</p>
                        </button>

                        <button
                            onClick={() => router.push('/admin/users')}
                            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
                        >
                            <div className="text-2xl mb-2">👥</div>
                            <p className="font-semibold text-gray-900">User Management</p>
                            <p className="text-sm text-gray-600">Manage users and KYC</p>
                        </button>

                        <button
                            onClick={() => router.push('/admin/audit-logs')}
                            className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-left transition-colors"
                        >
                            <div className="text-2xl mb-2">📋</div>
                            <p className="font-semibold text-gray-900">Audit Logs</p>
                            <p className="text-sm text-gray-600">View activity logs</p>
                        </button>
                    </div>
                </div>

                {/* Recent Activity */}
                {revenue && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Activity</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">First Transaction</span>
                                <span className="font-semibold">
                                    {revenue.first_transaction
                                        ? new Date(revenue.first_transaction).toLocaleDateString()
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Latest Transaction</span>
                                <span className="font-semibold">
                                    {revenue.last_transaction
                                        ? new Date(revenue.last_transaction).toLocaleDateString()
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Average Transaction Value</span>
                                <span className="font-semibold">
                                    {revenue.total_transactions > 0
                                        ? formatPrice(Math.floor((revenue.total_gmv_paise || 0) / revenue.total_transactions))
                                        : '₹0.00'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
