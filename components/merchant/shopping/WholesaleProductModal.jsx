import { useState, useEffect } from 'react';
import { X, Package, ShieldCheck, Tag, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WholesaleProductModal({ product, isOpen, onClose }) {
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    // Reset active image when new product opens
    useEffect(() => {
        setActiveImageIdx(0);
    }, [product]);

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
                        className="fixed left-0 right-0 bottom-0 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full md:bottom-auto z-[601] overflow-hidden bg-white dark:bg-[#0c0e16] rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] pb-safe"
                    >
                        <div className="relative aspect-square md:aspect-[16/9] w-full bg-slate-50 dark:bg-white/5 flex-shrink-0 group">
                            {images.length > 0 ? (
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={activeImageIdx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        transition={{ duration: 0.3 }}
                                        src={images[activeImageIdx]}
                                        alt={product.title}
                                        className="w-full h-full object-contain p-4"
                                    />
                                </AnimatePresence>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package size={64} className="text-slate-300" />
                                </div>
                            )}

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur-md flex items-center justify-center text-slate-900 dark:text-white shadow-sm hover:scale-110 transition-transform z-10"
                            >
                                <X size={20} />
                            </button>
                            
                            {/* Category Badge */}
                            <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default z-10 shadow-sm flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                <Tag size={12} /> {product.category || 'Standard'}
                            </div>

                            {/* Thumbnail Gallery overlay */}
                            {images.length > 1 && (
                                <div className="absolute bottom-4 left-0 w-full flex justify-center z-10">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-white/70 dark:bg-black/60 backdrop-blur-md rounded-2xl shadow-sm">
                                        {images.map((imgUrl, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setActiveImageIdx(idx)}
                                                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${activeImageIdx === idx ? 'border-emerald-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                            >
                                                <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover bg-white" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">
                                {product.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                                {product.description || 'No detailed description available for this item.'}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Wholesale Price</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                        ₹{(product.wholesale_price_paise / 100).toLocaleString('en-IN')} <span className="text-sm font-bold text-slate-400">/unit</span>
                                    </p>
                                    {product.suggested_retail_price_paise && (
                                        <p className="text-xs text-slate-500 mt-1 font-medium bg-slate-200/50 dark:bg-white/10 px-2 py-0.5 rounded-md inline-block">
                                            MRP: ₹{(product.suggested_retail_price_paise / 100).toLocaleString('en-IN')}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Available Inventory</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                                            {product.admin_stock}
                                        </p>
                                        <span className="text-sm font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">In Stock</span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Specifications / Data */}
                            <div className="mb-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Info size={16} className="text-slate-400"/> Specifications
                                </h3>
                                <div className="bg-slate-50 dark:bg-white/5 rounded-[1.5rem] p-5 border border-slate-100 dark:border-white/5 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">SKU / ID</span>
                                        <span className="font-bold text-slate-900 dark:text-white select-all">{product.id.split('-')[0].toUpperCase()}</span>
                                    </div>
                                    <div className="h-px w-full bg-slate-200/50 dark:bg-white/5" />
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">Category</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{product.category || 'General'}</span>
                                    </div>
                                    {product.brand && (
                                        <>
                                            <div className="h-px w-full bg-slate-200/50 dark:bg-white/5" />
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Brand</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{product.brand}</span>
                                            </div>
                                        </>
                                    )}
                                    {product.weight && (
                                        <>
                                            <div className="h-px w-full bg-slate-200/50 dark:bg-white/5" />
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Weight</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{product.weight}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-medium py-4 px-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                <ShieldCheck className="text-emerald-500 shrink-0" size={20} />
                                <div>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-0.5">100% Quality Assured</span>
                                    <span className="text-[11px] opacity-80 leading-tight">This product passes Intrust's strict wholesale quality controls. Ready for retail distribution.</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
