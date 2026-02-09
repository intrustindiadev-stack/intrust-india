'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Eye, Clock, Building2, Phone, Mail, FileText } from 'lucide-react';

export default function AdminMerchantsPage() {
    const [filter, setFilter] = useState('pending');

    // Mock data
    const merchants = [
        {
            id: 1,
            businessName: 'Ravi Gift Cards',
            ownerName: 'Ravi Kumar',
            phone: '+919876543210',
            email: 'ravi@giftcards.com',
            gstNumber: '22AAAAA0000A1Z5',
            status: 'pending',
            appliedDate: '2024-01-30',
            documents: 4
        },
        {
            id: 2,
            businessName: 'Gift Card Hub',
            ownerName: 'Priya Sharma',
            phone: '+919876543211',
            email: 'priya@hub.com',
            gstNumber: '22BBBBB0000B1Z5',
            status: 'pending',
            appliedDate: '2024-01-29',
            documents: 4
        },
        {
            id: 3,
            businessName: 'Food Deals',
            ownerName: 'Amit Patel',
            phone: '+919876543212',
            email: 'amit@fooddeals.com',
            gstNumber: '22CCCCC0000C1Z5',
            status: 'approved',
            appliedDate: '2024-01-28',
            documents: 4
        },
    ];

    const filteredMerchants = merchants.filter(m => m.status === filter);

    const handleApprove = (id) => {
        console.log('Approve merchant:', id);
        // Mock approval
    };

    const handleReject = (id) => {
        console.log('Reject merchant:', id);
        // Mock rejection
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="p-6 lg:p-12 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                        Merchant Applications
                    </h1>
                    <p className="text-gray-600">Review and manage merchant onboarding requests</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-3 mb-8">
                    {['pending', 'approved', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-5 py-2.5 rounded-lg font-medium capitalize transition-all text-sm ${filter === status
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Merchants Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMerchants.map((merchant) => (
                                    <tr key={merchant.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                                    {merchant.businessName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{merchant.businessName}</div>
                                                    <div className="text-sm text-gray-500">{merchant.ownerName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Phone size={14} className="text-gray-400" />
                                                    {merchant.phone}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail size={14} className="text-gray-400" />
                                                    {merchant.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-inconsolata bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block text-gray-700">
                                                {merchant.gstNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock size={14} className="text-gray-400" />
                                                {merchant.appliedDate}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${merchant.status === 'pending'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : merchant.status === 'approved'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {merchant.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all" title="View Details">
                                                    <Eye size={18} />
                                                </button>
                                                {merchant.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleReject(merchant.id)}
                                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(merchant.id)}
                                                            className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredMerchants.length === 0 && (
                        <div className="text-center py-16 bg-white">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No {filter} merchants</h3>
                            <p className="text-gray-500">There are no merchant applications with {filter} status.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
