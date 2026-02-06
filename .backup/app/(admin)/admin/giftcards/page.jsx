'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGiftCards, deleteGiftCard } from './actions';
import { Pencil, Trash2, Plus, Search, Filter, Gift, TrendingUp, Package } from 'lucide-react';
import Link from 'next/link';

export default function GiftCardsListPage() {
    const router = useRouter();
    const [giftCards, setGiftCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [deleteLoading, setDeleteLoading] = useState(null);

    useEffect(() => {
        loadGiftCards();
    }, []);

    useEffect(() => {
        filterCards();
    }, [giftCards, searchQuery, statusFilter, categoryFilter]);

    async function loadGiftCards() {
        setLoading(true);
        const result = await getAllGiftCards();

        if (result.success) {
            setGiftCards(result.data);
            setFilteredCards(result.data);
        } else {
            console.error('Failed to load gift cards:', result.error);
        }

        setLoading(false);
    }

    function filterCards() {
        let filtered = [...giftCards];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(card =>
                card.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(card => card.status === statusFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(card => card.category === categoryFilter);
        }

        setFilteredCards(filtered);
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this gift card? This will set its status to expired.')) {
            return;
        }

        setDeleteLoading(id);
        const result = await deleteGiftCard(id);

        if (result.success) {
            // Reload the list
            await loadGiftCards();
        } else {
            alert('Failed to delete gift card: ' + result.error);
        }

        setDeleteLoading(null);
    }

    function formatPrice(paise) {
        return `₹${(paise / 100).toFixed(2)}`;
    }

    function calculateDiscount(faceValue, sellingPrice) {
        const discount = ((faceValue - sellingPrice) / faceValue) * 100;
        return discount.toFixed(1);
    }

    // Get unique categories
    const categories = [...new Set(giftCards.map(card => card.category))];

    // Stats
    const stats = {
        total: giftCards.length,
        active: giftCards.filter(c => c.status === 'available').length,
        expired: giftCards.filter(c => c.status === 'expired').length,
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Gift Cards</h1>
                </div>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-white rounded-xl"></div>
                    <div className="h-96 bg-white rounded-xl"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gift Cards</h1>
                    <p className="text-gray-600 mt-1">Manage your gift card inventory</p>
                </div>
                <Link
                    href="/admin/giftcards/new"
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                    <Plus size={20} />
                    Add Gift Card
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Cards</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Package className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Active Cards</p>
                            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Expired Cards</p>
                            <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                            <Gift className="text-red-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search gift cards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="sold">Sold</option>
                        <option value="expired">Expired</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Face Value</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Selling Price</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Discount</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredCards.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No gift cards found
                                    </td>
                                </tr>
                            ) : (
                                filteredCards.map((card) => (
                                    <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {card.image_url && (
                                                    <img src={card.image_url} alt={card.brand} className="w-10 h-10 rounded-lg object-cover" />
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{card.brand}</p>
                                                    <p className="text-sm text-gray-500 truncate max-w-xs">{card.title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                                {card.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {formatPrice(card.face_value_paise)}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-purple-600">
                                            {formatPrice(card.selling_price_paise)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                {calculateDiscount(card.face_value_paise, card.selling_price_paise)}% OFF
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${card.status === 'available' ? 'bg-green-100 text-green-700' :
                                                    card.status === 'sold' ? 'bg-gray-100 text-gray-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {card.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/admin/giftcards/${card.id}`)}
                                                    className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(card.id)}
                                                    disabled={deleteLoading === card.id}
                                                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
