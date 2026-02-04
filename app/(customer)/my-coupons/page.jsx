'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export default function MyCouponsPage() {
    const [coupons, setCoupons] = useState([])
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCoupon, setSelectedCoupon] = useState(null)
    const [decryptedCode, setDecryptedCode] = useState(null)
    const [decrypting, setDecrypting] = useState(false)
    const { user } = useAuth()

    useEffect(() => {
        if (user) {
            fetchMyCoupons()
            fetchMyTransactions()
        }
    }, [user])

    async function fetchMyCoupons() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('purchased_by', user?.id)
                .eq('status', 'sold')
                .order('purchased_at', { ascending: false })

            if (error) throw error
            setCoupons(data || [])
        } catch (err) {
            console.error('Error fetching coupons:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchMyTransactions() {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setTransactions(data || [])
        } catch (err) {
            console.error('Error fetching transactions:', err)
        }
    }

    async function handleViewCode(couponId) {
        try {
            setDecrypting(true)
            setSelectedCoupon(couponId)

            const response = await fetch(`/api/my-coupons/${couponId}/decrypt`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to decrypt code')
            }

            // For now, show the encrypted code (in production, this would be decrypted)
            setDecryptedCode(data.encrypted_code)
        } catch (err) {
            console.error('Error decrypting code:', err)
            alert(err.message || 'Failed to decrypt code')
        } finally {
            setDecrypting(false)
        }
    }

    function formatPrice(paise) {
        return `₹${(paise / 100).toFixed(2)}`
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
        alert('Code copied to clipboard!')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-8">My Coupons</h1>
                    <div className="animate-pulse">
                        <div className="h-48 bg-white rounded-xl mb-4"></div>
                        <div className="h-48 bg-white rounded-xl mb-4"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">My Coupons</h1>

                {coupons.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Coupons Yet</h2>
                        <p className="text-gray-600 mb-6">You haven't purchased any coupons yet</p>
                        <a
                            href="/gift-cards"
                            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                            Browse Gift Cards
                        </a>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {coupons.map((coupon) => {
                            const transaction = transactions.find((t) => t.coupon_id === coupon.id)
                            const isExpired = new Date(coupon.valid_until) < new Date()

                            return (
                                <div key={coupon.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900">{coupon.brand}</h3>
                                                <p className="text-gray-600">{coupon.title}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Purchased</p>
                                                <p className="font-semibold">{new Date(coupon.purchased_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 mb-1">Face Value</p>
                                                <p className="text-xl font-bold text-gray-900">{formatPrice(coupon.face_value_paise)}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 mb-1">You Paid</p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {transaction ? formatPrice(transaction.total_paid_paise) : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 mb-1">Valid Until</p>
                                                <p className={`text-xl font-bold ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                                    {new Date(coupon.valid_until).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {isExpired && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                                <p className="text-red-800 font-semibold">⚠️ This coupon has expired</p>
                                            </div>
                                        )}

                                        {selectedCoupon === coupon.id && decryptedCode ? (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                                                <p className="text-sm text-green-800 mb-2 font-semibold">Your Coupon Code:</p>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-3xl font-mono font-bold text-green-900 flex-1">{decryptedCode}</p>
                                                    <button
                                                        onClick={() => copyToClipboard(decryptedCode)}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleViewCode(coupon.id)}
                                                disabled={decrypting}
                                                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                                            >
                                                {decrypting && selectedCoupon === coupon.id ? 'Decrypting...' : 'View Coupon Code'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Transaction History */}
                {transactions.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {transactions.map((transaction) => (
                                        <tr key={transaction.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(transaction.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatPrice(transaction.coupon_price_paise)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatPrice(transaction.buyer_fee_paise)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {formatPrice(transaction.total_paid_paise)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${transaction.status === 'completed'
                                                            ? 'bg-green-100 text-green-800'
                                                            : transaction.status === 'failed'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                >
                                                    {transaction.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
