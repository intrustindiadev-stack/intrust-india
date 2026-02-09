'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            Merchant Applications
                        </h1>
                        <p className="text-gray-600">Review and approve merchant applications</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-3 mb-6">
                        {['pending', 'approved', 'rejected'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-6 py-3 rounded-xl font-semibold capitalize transition-all ${filter === status
                                        ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Merchants Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredMerchants.map((merchant) => (
                            <div key={merchant.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center text-white text-2xl font-bold">
                                            {merchant.businessName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">{merchant.businessName}</h3>
                                            <p className="text-sm text-gray-600">{merchant.ownerName}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${merchant.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : merchant.status === 'approved'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        {merchant.status}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Phone size={16} className="text-gray-400" />
                                        <span>{merchant.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Mail size={16} className="text-gray-400" />
                                        <span>{merchant.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Building2 size={16} className="text-gray-400" />
                                        <span>GST: {merchant.gstNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <Clock size={16} className="text-gray-400" />
                                        <span>Applied: {merchant.appliedDate}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <FileText size={16} className="text-gray-400" />
                                        <span>{merchant.documents} documents uploaded</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {merchant.status === 'pending' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleReject(merchant.id)}
                                            className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={18} />
                                            Reject
                                        </button>
                                        <button className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                                            <Eye size={18} />
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => handleApprove(merchant.id)}
                                            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} />
                                            Approve
                                        </button>
                                    </div>
                                )}

                                {merchant.status === 'approved' && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <div className="flex items-center gap-2 text-green-700">
                                            <CheckCircle size={18} />
                                            <span className="text-sm font-medium">Approved and active</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredMerchants.length === 0 && (
                        <div className="text-center py-16">
                            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No {filter} merchants</h3>
                            <p className="text-gray-600">There are no merchants with {filter} status</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
