'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Upload, ZoomIn, ZoomOut, RotateCw, Loader2, Camera, ImageIcon, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * getCroppedImg — Renders the cropped area onto a canvas and returns a Blob.
 */
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', reject);
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
        image,
        safeArea / 2 - image.width / 2,
        safeArea / 2 - image.height / 2
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
        data,
        Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
        Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
    );

    return new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
}

/**
 * AvatarCropUploadModal
 *
 * Props:
 *   isOpen    : boolean
 *   onClose   : () => void
 *   onUpload  : (blob: Blob) => Promise<void>
 *   title?    : string
 *   shape?    : 'circle' | 'rect'
 */
export default function AvatarCropUploadModal({
    isOpen,
    onClose,
    onUpload,
    title = 'Upload Photo',
    shape = 'circle',
}) {
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const onCropComplete = useCallback((_, pixels) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const readFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setImageSrc(e.target.result);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e) => readFile(e.target.files?.[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        readFile(e.dataTransfer.files?.[0]);
    };

    const handleUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setUploading(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            await onUpload(blob);
            handleClose();
        } catch (err) {
            console.error('Crop/upload error:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Camera size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900">{title}</h3>
                                <p className="text-xs text-gray-400 font-medium">Drag to reposition · Pinch to zoom</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                            <X size={18} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {!imageSrc ? (
                            /* ── Drop Zone ────────────────────────────────── */
                            <div
                                className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 ${
                                    isDragging
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                                }`}
                                onClick={() => document.getElementById('avatar-file-input')?.click()}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                            >
                                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                                    <ImageIcon size={28} className="text-blue-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-gray-700">Drop your photo here</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        or <span className="text-blue-500 font-bold">browse files</span>
                                    </p>
                                    <p className="text-[10px] text-gray-300 mt-2 uppercase tracking-wider">
                                        JPG · PNG · WEBP · Max 5MB
                                    </p>
                                </div>
                                <input
                                    id="avatar-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        ) : (
                            <>
                                {/* ── Cropper ───────────────────────────────── */}
                                <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-gray-900">
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        rotation={rotation}
                                        aspect={1}
                                        cropShape={shape}
                                        showGrid={false}
                                        onCropChange={setCrop}
                                        onZoomChange={setZoom}
                                        onCropComplete={onCropComplete}
                                        style={{
                                            containerStyle: { borderRadius: '1rem' },
                                            cropAreaStyle: {
                                                border: '2px solid rgba(255,255,255,0.85)',
                                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                                            },
                                        }}
                                    />
                                </div>

                                {/* ── Zoom Slider ───────────────────────────── */}
                                <div className="flex items-center gap-3">
                                    <ZoomOut size={15} className="text-gray-400 shrink-0" />
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.02}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="flex-1 accent-blue-600 cursor-pointer h-1.5"
                                    />
                                    <ZoomIn size={15} className="text-gray-400 shrink-0" />
                                </div>

                                {/* ── Controls Row ──────────────────────────── */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRotation(r => (r + 90) % 360)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <RotateCw size={13} /> Rotate 90°
                                    </button>
                                    <button
                                        onClick={() => { setImageSrc(null); setZoom(1); setRotation(0); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <RefreshCw size={13} /> Change Photo
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Footer ────────────────────────────────────────────── */}
                    {imageSrc && (
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-3.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex-1 px-4 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {uploading
                                    ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                                    : <><Upload size={16} /> Save Photo</>
                                }
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
