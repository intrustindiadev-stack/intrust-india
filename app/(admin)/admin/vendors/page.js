"use client";

import { useState } from "react";

export default function VendorsPage() {
    const [vendors] = useState([
        {
            id: 1,
            name: "Amazon Pay",
            category: "Shopping",
            commission: "2.5%",
            status: "Active",
        },
        {
            id: 2,
            name: "Flipkart",
            category: "Shopping",
            commission: "2.0%",
            status: "Inactive",
        },
        {
            id: 3,
            name: "Zomato",
            category: "Food",
            commission: "3.5%",
            status: "Active",
        },
        {
            id: 4,
            name: "Uber",
            category: "Travel",
            commission: "4.0%",
            status: "Active",
        },
        {
            id: 5,
            name: "Airtel Bills",
            category: "Recharge",
            commission: "1.5%",
            status: "Inactive",
        },
    ]);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendors</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage platform vendors and commission settings.
                    </p>
                </div>
                <button className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                    Add Vendor
                </button>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Vendor Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Commission</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {vendors.map((vendor) => (
                                <tr
                                    key={vendor.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 group"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">
                                            {vendor.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {vendor.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                            {vendor.commission}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vendor.status === "Active"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {vendor.status}
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
