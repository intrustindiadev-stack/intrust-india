'use client';

export default function CategoryFilter({ categories, selectedCategory, setSelectedCategory }) {
    return (
        <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === cat
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200 scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 border border-transparent hover:border-gray-200'
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
