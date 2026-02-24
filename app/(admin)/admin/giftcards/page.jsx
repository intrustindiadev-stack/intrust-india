"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllGiftCards, deleteGiftCard } from './actions';
import { Plus, Search, Package, TrendingUp, Gift } from 'lucide-react';
import Link from 'next/link';
import EditGiftCardModal from './EditGiftCardModal';
import GiftCardItem from '@/components/admin/giftcards/GiftCardItem';

export default function GiftCardsListPage() {
    const router = useRouter();
    const [giftCards, setGiftCards] = useState([]);
    const [filteredCards, setFilteredCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [deleteLoading, setDeleteLoading] = useState(null);

    // Edit Modal State
    const [selectedCard, setSelectedCard] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

        if (searchQuery) {
            filtered = filtered.filter(card =>
                card.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(card => card.status === statusFilter);
        }

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
            await loadGiftCards();
        } else {
            alert('Failed to delete gift card: ' + result.error);
        }

        setDeleteLoading(null);
    }

    function handleEditClick(card) {
        setSelectedCard(card);
        setIsEditModalOpen(true);
    }

    function handleUpdateSuccess(updatedCard) {
        setGiftCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
        setFilteredCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
        alert('Gift card updated successfully!');
    }

    const categories = [...new Set(giftCards.map(card => card.category))];

    const stats = {
        total: giftCards.length,
        active: giftCards.filter(c => c.status === 'available').length,
        expired: giftCards.filter(c => c.status === 'expired').length,
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
                <div className="h-10 bg-slate-200 rounded-lg w-1/3"></div>
                <div className="h-32 bg-slate-200 rounded-3xl w-full"></div>
                <div className="h-96 bg-slate-200 rounded-3xl w-full"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-[family-name:var(--font-outfit)] space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Gift Cards</h1>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">Manage your gift card inventory, pricing, and availability.</p>
                </div>
                <Link
                    href="/admin/giftcards/new"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-sm hover:shadow-lg hover:shadow-blue-600/20"
                >
                    <Plus size={20} strokeWidth={3} />
                    Add Gift Card
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cards</p>
                            <p className="text-4xl font-extrabold text-slate-900">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center shadow-sm">
                            <Package className="text-blue-600" size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Active</p>
                            <p className="text-4xl font-extrabold text-emerald-600">{stats.active}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center shadow-sm">
                            <TrendingUp className="text-emerald-500" size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Expired</p>
                            <p className="text-4xl font-extrabold text-red-500">{stats.expired}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-red-50/80 border border-red-100 flex items-center justify-center shadow-sm">
                            <Gift className="text-red-500" size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} strokeWidth={2.5} />
                        <input
                            type="text"
                            placeholder="Search gift cards by brand..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-medium text-slate-700 transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 transition-all cursor-pointer appearance-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="available">Available</option>
                        <option value="sold">Sold</option>
                        <option value="expired">Expired</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 transition-all cursor-pointer appearance-none"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Gift Cards Grid */}
            {filteredCards.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Gift size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">No gift cards found</h3>
                    <p className="text-slate-500 font-medium">Try adjusting your search criteria or add a new card.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCards.map((card) => (
                        <GiftCardItem
                            key={card.id}
                            card={card}
                            onEdit={handleEditClick}
                            onDelete={handleDelete}
                            deleteLoading={deleteLoading}
                        />
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            <EditGiftCardModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                giftCard={selectedCard}
                onUpdate={handleUpdateSuccess}
            />
        </div>
    );
}
