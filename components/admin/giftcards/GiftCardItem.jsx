'use client';

import { Pencil, Trash2, Tag, Percent } from 'lucide-react';
import Image from 'next/image';

export default function GiftCardItem({ card, onEdit, onDelete, deleteLoading }) {
    const isAvailable = card.status === 'available';
    const isSold = card.status === 'sold';

    const formatPrice = (paise) => `₹${(paise / 100).toFixed(2)}`;
    const discount = (((card.face_value_paise - card.selling_price_paise) / card.face_value_paise) * 100).toFixed(1);

    return (
        <div className="group bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
            {/* Top Indicator */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isAvailable ? 'bg-emerald-500' : isSold ? 'bg-slate-300' : 'bg-red-500'}`} />

            {/* Header: Image & Brand */}
            <div className="flex items-start gap-4 mb-5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 shadow-sm flex items-center justify-center">
                    {card.image_url ? (
                        <Image src={card.image_url} alt={card.brand} fill className="object-cover" />
                    ) : (
                        <div className="text-xl font-extrabold text-slate-300">{card.brand?.charAt(0) || 'G'}</div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate text-lg">{card.brand}</h3>
                    <p className="text-sm font-medium text-slate-500 truncate line-clamp-1">{card.title}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-extrabold uppercase tracking-wider border border-blue-100">
                            {card.category}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            isSold ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {card.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Pricing Info */}
            <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 mt-auto">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                        Face Value
                    </p>
                    <p className="font-bold text-slate-900 line-through decoration-slate-300">
                        {formatPrice(card.face_value_paise)}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wide flex items-center gap-1 mb-1">
                        <Percent size={12} strokeWidth={3} /> You Sell
                    </p>
                    <p className="font-bold text-blue-600 text-lg">
                        {formatPrice(card.selling_price_paise)}
                    </p>
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                <div className="flex items-center gap-1.5">
                    <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1">
                        <Tag size={12} strokeWidth={2.5} /> {discount}% OFF
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onEdit(card)}
                        className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all border border-slate-100 hover:border-blue-100 shadow-sm"
                        title="Edit Details"
                    >
                        <Pencil size={16} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => onDelete(card.id)}
                        disabled={deleteLoading === card.id}
                        className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 hover:border-red-100 shadow-sm disabled:opacity-50"
                        title="Delete Card"
                    >
                        {deleteLoading === card.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 size={16} strokeWidth={2.5} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
