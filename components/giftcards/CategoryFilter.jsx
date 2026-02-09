'use client';

export default function CategoryFilter({ categories, selectedCategory, setSelectedCategory }) {
    return (
        <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedCategory === cat
                            ? 'bg-gradient-to-r from-[#92BCEA] to-[#AFB3F7] text-white shadow-lg shadow-[#92BCEA]/30'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
