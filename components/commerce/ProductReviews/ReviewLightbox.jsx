'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';

export default function ReviewLightbox({ images = [], initialIndex = 0, isOpen, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        setCurrentIndex(initialIndex);
        setIsZoomed(false);
    }, [initialIndex, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                setIsZoomed(false);
            } else if (e.key === 'ArrowRight') {
                setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                setIsZoomed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, images.length, onClose]);

    if (!isOpen || images.length === 0) return null;

    const currentUrl = images[currentIndex];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
                onClick={onClose}
            >
                {/* Close & Action Toolbar */}
                <div
                    className="absolute top-4 right-4 z-50 flex items-center gap-2"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => setIsZoomed(!isZoomed)}
                        aria-label="Toggle zoom"
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                    >
                        {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close image viewer"
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Counter */}
                {images.length > 1 && (
                    <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}

                {/* Left navigation arrow */}
                {images.length > 1 && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
                            setIsZoomed(false);
                        }}
                        aria-label="Previous image"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                    >
                        <ChevronLeft size={22} />
                    </button>
                )}

                {/* Right navigation arrow */}
                {images.length > 1 && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
                            setIsZoomed(false);
                        }}
                        aria-label="Next image"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                    >
                        <ChevronRight size={22} />
                    </button>
                )}

                {/* Image Container */}
                <div
                    className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center select-none"
                    onClick={e => e.stopPropagation()}
                >
                    <div className={`relative transition-transform duration-300 ${isZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'}`}
                        onClick={() => setIsZoomed(!isZoomed)}
                    >
                        <Image
                            src={currentUrl}
                            alt={`Review photo ${currentIndex + 1}`}
                            width={1000}
                            height={1000}
                            className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl"
                            priority
                            unoptimized
                        />
                    </div>
                </div>

                {/* Thumbnail strip for multi-image reviews */}
                {images.length > 1 && (
                    <div
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {images.map((url, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setCurrentIndex(idx);
                                    setIsZoomed(false);
                                }}
                                className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                                    currentIndex === idx ? 'border-amber-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                            >
                                <Image
                                    src={url}
                                    alt={`Thumb ${idx + 1}`}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                    unoptimized
                                />
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
