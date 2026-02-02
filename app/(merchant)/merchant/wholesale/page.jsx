'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard } from 'lucide-react';

export default function WholesalePage() {
    const [cart, setCart] = useState({});

    // Mock wholesale inventory
    const inventory = [
        { id: 1, brand: 'Flipkart', faceValue: 500, wholesalePrice: 400, stock: 500 },
        { id: 2, brand: 'Amazon', faceValue: 1000, wholesalePrice: 850, stock: 300 },
        { id: 3, brand: 'Swiggy', faceValue: 300, wholesalePrice: 250, stock: 1000 },
        { id: 4, brand: 'BookMyShow', faceValue: 500, wholesalePrice: 420, stock: 200 },
        { id: 5, brand: 'Myntra', faceValue: 1000, wholesalePrice: 880, stock: 150 },
        { id: 6, brand: 'Zomato', faceValue: 500, wholesalePrice: 410, stock: 400 },
    ];

    const addToCart = (item) => {
        setCart(prev => ({
            ...prev,
            [item.id]: (prev[item.id] || 0) + 1
        }));
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[itemId] > 1) {
                newCart[itemId]--;
            } else {
                delete newCart[itemId];
            }
            return newCart;
        });
    };

    const deleteFromCart = (itemId) => {
        setCart(prev => {
            const newCart = { ...prev };
            delete newCart[itemId];
            return newCart;
        });
    };

    const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
        const item = inventory.find(i => i.id === parseInt(id));
        return total + (item.wholesalePrice * qty);
    }, 0);

    const cartItems = Object.entries(cart).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-outfit)]">
                            Wholesale Purchase
                        </h1>
                        <p className="text-gray-600">Buy gift cards in bulk at wholesale prices</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Inventory Grid */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {inventory.map((item) => (
                                    <div key={item.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-1">{item.brand}</h3>
                                                <p className="text-sm text-gray-600">Face Value: ₹{item.faceValue}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-[#92BCEA]">₹{item.wholesalePrice}</div>
                                                <div className="text-xs text-gray-500">per coupon</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm text-gray-600">Stock: {item.stock}</span>
                                            <span className="text-sm font-semibold text-green-600">
                                                {((item.faceValue - item.wholesalePrice) / item.faceValue * 100).toFixed(0)}% margin
                                            </span>
                                        </div>

                                        {cart[item.id] ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all flex items-center justify-center"
                                                >
                                                    <Minus size={18} />
                                                </button>
                                                <div className="px-4 py-2 bg-gray-100 rounded-lg font-bold text-gray-900">
                                                    {cart[item.id]}
                                                </div>
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="flex-1 py-2 bg-[#92BCEA] hover:bg-[#7A93AC] text-white rounded-lg transition-all flex items-center justify-center"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-full py-3 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <ShoppingCart size={18} />
                                                Add to Cart
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cart Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cart Summary</h2>

                                {cartItems === 0 ? (
                                    <div className="text-center py-8">
                                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-600">Your cart is empty</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Cart Items */}
                                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                                            {Object.entries(cart).map(([id, qty]) => {
                                                const item = inventory.find(i => i.id === parseInt(id));
                                                return (
                                                    <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-900">{item.brand}</div>
                                                            <div className="text-sm text-gray-600">₹{item.wholesalePrice} × {qty}</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="font-bold text-gray-900">₹{item.wholesalePrice * qty}</div>
                                                            <button
                                                                onClick={() => deleteFromCart(parseInt(id))}
                                                                className="p-1 hover:bg-red-50 rounded transition-all"
                                                            >
                                                                <Trash2 size={16} className="text-red-600" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Total */}
                                        <div className="border-t border-gray-200 pt-4 mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-gray-600">Total Items</span>
                                                <span className="font-semibold text-gray-900">
                                                    {Object.values(cart).reduce((a, b) => a + b, 0)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                                                <span className="text-2xl font-bold text-[#92BCEA]">₹{cartTotal.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Checkout Button */}
                                        <button className="w-full py-4 bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] hover:from-[#7A93AC] hover:to-[#92BCEA] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                                            <CreditCard size={20} />
                                            Proceed to Payment
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
