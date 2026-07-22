'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle, Shield, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SelfieCameraModal({ isOpen, onClose, onConfirm, actionType = 'clock_in', loading = false }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraError, setCameraError] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);

    const startCamera = async () => {
        setCameraError('');
        setCapturedImage(null);
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported by your browser.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 640 }
                },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsStreaming(true);
            }
        } catch (err) {
            console.error('Webcam error:', err);
            setCameraError(err.message || 'Unable to access front camera. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsStreaming(false);
    };

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            setCapturedImage(null);
        }
        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const takeSelfie = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Mirror the image horizontally for natural selfie view
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
    };

    const handleRetake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const handleConfirm = () => {
        if (capturedImage && onConfirm) {
            onConfirm(capturedImage);
        }
    };

    if (!isOpen) return null;

    const actionTitle = actionType === 'clock_in' ? 'Clock In Selfie Verification' : 'Clock Out Selfie Verification';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 relative overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <Camera size={20} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-gray-900 dark:text-white">{actionTitle}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Live facial identity snapshot required</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Camera / Captured View Area */}
                    <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-3xl bg-slate-950 overflow-hidden border-2 border-amber-500/30 shadow-2xl flex items-center justify-center">
                        <canvas ref={canvasRef} className="hidden" />

                        {cameraError ? (
                            <div className="p-6 text-center text-rose-400 space-y-3">
                                <AlertCircle size={40} className="mx-auto" />
                                <p className="text-xs font-bold leading-relaxed">{cameraError}</p>
                                <button
                                    onClick={startCamera}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
                                >
                                    Retry Camera
                                </button>
                            </div>
                        ) : capturedImage ? (
                            <div className="relative w-full h-full">
                                <img src={capturedImage} alt="Selfie Preview" className="w-full h-full object-cover" />
                                <div className="absolute top-3 left-3 px-3 py-1 bg-emerald-500/90 text-slate-950 text-xs font-black rounded-full flex items-center gap-1 backdrop-blur-sm">
                                    <CheckCircle size={12} /> Captured
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover -scale-x-100"
                                />

                                {/* Face positioning overlay circle */}
                                <div className="absolute inset-0 border-[3rem] border-slate-950/60 pointer-events-none rounded-full flex items-center justify-center">
                                    <div className="w-48 h-48 rounded-full border-2 border-dashed border-amber-400/80 animate-pulse" />
                                </div>

                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                                    <Sparkles size={10} /> Align face inside circle
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                        {capturedImage ? (
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleRetake}
                                    disabled={loading}
                                    className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} /> Retake
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={loading}
                                    className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 gold-glow"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle size={18} /> Confirm & Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={takeSelfie}
                                disabled={!isStreaming || !!cameraError}
                                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/25 transition-all text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed gold-glow"
                            >
                                <Camera size={20} /> Snap Selfie
                            </button>
                        )}
                        <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1">
                            <Shield size={12} className="text-emerald-500" /> Biometric Identity Guard
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
