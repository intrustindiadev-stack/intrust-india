"use client";

import { useState } from "react";

export default function CouponsPage() {
    const [coupons] = useState([
        {
            id: 1,
            code: "WELCOME50",
            discount: "50% OFF",
            expiry: "2024-12-31",
            usageCount: 125,
            status: "Active",
        },
        {
            id: 2,
            code: "FESTIVE20",
            discount: "20% OFF",
            expiry: "2024-10-15",
            usageCount: 890,
            status: "Expired",
        },
        {
            id: 3,
            code: "SUMMER10",
            discount: "10% OFF",
            expiry: "2024-06-30",
            usageCount: 45,
            status: "Inactive",
        },
        {
            id: 4,
            code: "FLASHDEAL",
            discount: "₹500 OFF",
            expiry: "2024-11-01",
            usageCount: 320,
            status: "Active",
        },
        {
            id: 5,
            code: "NEWUSER",
            discount: "Flat ₹100",
            expiry: "2025-01-01",
            usageCount: 56,
            status: "Active",
        },
    ]);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Coupons</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage discount codes and promotional offers.
                    </p>
                </div>
                <button className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                    Create Coupon
                </button>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Discount</th>
                                <th className="px-6 py-4">Expiry Date</th>
                                <th className="px-6 py-4">Usage</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {coupons.map((coupon) => (
                                <tr
                                    key={coupon.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 group"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                                            {coupon.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-indigo-600">
                                            {coupon.discount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {coupon.expiry}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {coupon.usageCount} used
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${coupon.status === "Active"
                                                    ? "bg-green-100 text-green-700"
                                                    : coupon.status === "Expired"
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-gray-100 text-gray-700"
                                                }`}
                                        >
                                            {coupon.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-gray-400 hover:text-indigo-600 transition-colors mr-3">
                                            Edit
                                        </button>
                                        <button className="text-gray-400 hover:text-red-600 transition-colors">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
