import { useState } from 'react';
import Image from 'next/image';
import { X, Package, ShieldCheck, Tag, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WholesaleProductModal({ product, isOpen, onClose }) {
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [prevProductId, setPrevProductId] = useState(product?.id);

    // Reset active image index if product changes without cascading render effect
    if (product?.id !== prevProductId) {
        setPrevProductId(product?.id);
        setActiveImageIdx(0);
    }

    if (!product) return null;

    const images = product.product_images || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600]"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: "100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        className="fixed left-0 right-0 bottom-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full md:bottom-auto z-[601] overflow-hidden bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] pb-safe border border-slate-200/80 dark:border-slate-800"
                    >
                        <div className="relative aspect-square md:aspect-[16/9] w-full bg-slate-50 dark:bg-slate-800/40 flex-shrink-0 group border-b border-slate-100 dark:border-slate-800/60">
                            {images.length > 0 ? (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeImageIdx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        transition={{ duration: 0.3 }}
                                        className="relative w-full h-full p-6"
                                    >
                                        <Image
                                            src={images[activeImageIdx]}
                                            alt={product.title}
                                            fill
                                            unoptimized
                                            sizes="(max-width: 768px) 100vw, 600px"
                                            className="object-contain p-6"
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package size={48} className="text-slate-300 dark:text-slate-600" />
                                </div>
                            )}

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                aria-label="Close modal"
                                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:bg-white dark:hover:bg-slate-700 transition-colors z-10"
                            >
                                <X size={18} />
                            </button>
                            
                            {/* Category Badge */}
                            <div className="absolute top-3.5 left-3.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider z-10 shadow-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                <Tag size={11} /> {product.category || 'Standard'}
                            </div>

                            {/* Thumbnail Gallery overlay */}
                            {images.length > 1 && (
                                <div className="absolute bottom-3 left-0 w-full flex justify-center z-10">
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700">
                                        {images.map((imgUrl, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setActiveImageIdx(idx)}
                                                className={`relative w-10 h-10 rounded-lg overflow-hidden border transition-all ${activeImageIdx === idx ? 'border-blue-600 scale-105' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'}`}
                                            >
                                                <Image src={imgUrl} alt="Thumbnail" fill unoptimized sizes="40px" className="object-cover bg-white" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 md:p-6 flex-1 overflow-y-auto no-scrollbar">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-1.5 leading-tight tracking-tight">
                                {product.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-5 leading-relaxed">
                                {product.description || 'No detailed description available for this item.'}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Wholesale Price</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                                        ₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">/unit</span>
                                    </p>
                                    {product.suggested_retail_price_paise && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded inline-block">
                                            MRP: ₹{(product.suggested_retail_price_paise / 100).toLocaleString('en-IN')}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Available Stock</p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                                            {product.admin_stock}
                                        </p>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${product.admin_stock > 0 ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'}`}>
                                            {product.admin_stock > 0 ? 'In Stock' : 'Out of Stock'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Specifications */}
                            <div className="mb-5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                                    <Info size={14} className="text-slate-400"/> Specifications
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">SKU / ID</span>
                                        <span className="font-semibold text-slate-900 dark:text-white select-all">{product.id.split('-')[0].toUpperCase()}</span>
                                    </div>
                                    <div className="h-px w-full bg-slate-200/60 dark:bg-slate-800" />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">Category</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{product.category || 'General'}</span>
                                    </div>
                                    {product.brand && (
                                        <>
                                            <div className="h-px w-full bg-slate-200/60 dark:bg-slate-800" />
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Brand</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">{product.brand}</span>
                                            </div>
                                        </>
                                    )}
                                    {product.weight && (
                                        <>
                                            <div className="h-px w-full bg-slate-200/60 dark:bg-slate-800" />
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Weight</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">{product.weight}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-normal p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40">
                                <ShieldCheck className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />
                                <div>
                                    <span className="text-emerald-800 dark:text-emerald-300 font-bold block">100% Quality Assured</span>
                                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Verified platform product. Ready for retail distribution.</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
