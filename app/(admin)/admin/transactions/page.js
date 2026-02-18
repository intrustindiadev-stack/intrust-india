"use client";

import { useState } from "react";

export default function TransactionsPage() {
    const [transactions] = useState([
        {
            id: "TXN-1001",
            user: "rahul@example.com",
            amount: "₹2,500",
            date: "2024-05-15 10:30 AM",
            status: "Success",
            type: "Credit",
        },
        {
            id: "TXN-1002",
            user: "priya@example.com",
            amount: "₹1,200",
            date: "2024-05-14 02:15 PM",
            status: "Failed",
            type: "Debit",
        },
        {
            id: "TXN-1003",
            user: "amit.k@example.com",
            amount: "₹500",
            date: "2024-05-14 11:00 AM",
            status: "Processing",
            type: "Credit",
        },
        {
            id: "TXN-1004",
            user: "sneha.99@example.com",
            amount: "₹3,750",
            date: "2024-05-13 06:45 PM",
            status: "Success",
            type: "Debit",
        },
        {
            id: "TXN-1005",
            user: "vikram@example.com",
            amount: "₹150",
            date: "2024-05-13 09:20 AM",
            status: "Success",
            type: "Credit",
        },
    ]);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transactions</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View and manage recent financial activities.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
                        Export CSV
                    </button>
                    <button className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                        Filter
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map((txn) => (
                                <tr
                                    key={txn.id}
                                    className="hover:bg-gray-50 transition-colors duration-150 group"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-mono text-gray-900">
                                            {txn.id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 font-medium">
                                            {txn.user.split('@')[0]}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {txn.user}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-medium text-gray-900">
                                            {txn.amount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${txn.type === 'Credit' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-600">
                                            {txn.date}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${txn.status === "Success"
                                                    ? "bg-green-100 text-green-700"
                                                    : txn.status === "Failed"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-indigo-600 hover:text-indigo-900 transition-colors bg-indigo-50 px-3 py-1 rounded-lg">
                                            View
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
