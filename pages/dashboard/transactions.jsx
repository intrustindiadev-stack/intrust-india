import React from 'react';
import TransactionList from '../../components/transaction/TransactionList';

const TransactionsDashboard = () => {
    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Transaction History</h1>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                    <TransactionList />
                </div>
            </div>
        </div>
    );
};

export default TransactionsDashboard;
