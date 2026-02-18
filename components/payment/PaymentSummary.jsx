import React from 'react';

const PaymentSummary = ({ amount, description, items = [] }) => {
    return (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
            {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}

            {items.length > 0 && (
                <ul className="mb-4 space-y-2">
                    {items.map((item, index) => (
                        <li key={index} className="flex justify-between text-sm">
                            <span>{item.name}</span>
                            <span>₹{item.price}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">₹{amount}</span>
            </div>
        </div>
    );
};

export default PaymentSummary;
