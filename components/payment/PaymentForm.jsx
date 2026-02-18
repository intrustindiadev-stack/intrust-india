import React, { useState } from 'react';
import { usePayment } from '../../hooks/usePayment';

const PaymentForm = ({ amount, productDescription, userProfile }) => {
    const { initiatePayment, loading, error } = usePayment();
    const [details, setDetails] = useState({
        payerName: userProfile?.full_name || '',
        payerEmail: userProfile?.email || '',
        payerMobile: userProfile?.phone || '',
        payerAddress: '', // Optional
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        initiatePayment({
            amount,
            ...details,
            udf1: productDescription // Example UDF usage
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">Payment Details</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        name="payerName"
                        value={details.payerName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="payerEmail"
                        value={details.payerEmail}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                    <input
                        type="tel"
                        name="payerMobile"
                        value={details.payerMobile}
                        onChange={handleChange}
                        required
                        pattern="[0-9]{10}"
                        title="10 digit mobile number"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                </div>

                <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-gray-700">Total Amount:</span>
                        <span className="text-xl font-bold text-indigo-600">₹{amount}</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? 'Processing...' : 'Pay Now'}
                </button>
            </form>
        </div>
    );
};

export default PaymentForm;
