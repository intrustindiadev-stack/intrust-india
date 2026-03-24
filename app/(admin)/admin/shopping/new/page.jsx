import ProductForm from '../ProductForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto">
            <Link 
                href="/admin/shopping"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
            >
                <ChevronLeft size={16} />
                Back to Products
            </Link>

            <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Add New Product</h1>
                <p className="text-slate-500 mt-1 font-medium">Create a new platform product for merchants to stock</p>
            </div>

            <ProductForm />
        </div>
    );
}
