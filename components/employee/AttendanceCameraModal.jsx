'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, RefreshCw, Check, MapPin, MapPinned } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AttendanceCameraModal({ onClose, onConfirm, isClocking }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [locationState, setLocationState] = useState('fetching'); // fetching, success, error
    const [cameraState, setCameraState] = useState('starting'); // starting, active, error

    // Start camera and get location on mount
    useEffect(() => {
        let activeStream = null;

        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user' } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setStream(mediaStream);
                activeStream = mediaStream;
                setCameraState('active');
            } catch (err) {
                console.error("Camera access error:", err);
                setCameraState('error');
                toast.error("Camera access required for attendance.");
            }
        };

        const getLocation = () => {
            if (!navigator.geolocation) {
                setLocationState('error');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                () => setLocationState('success'),
                () => setLocationState('error'),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        };

        startCamera();
        getLocation();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Match canvas dimensions to video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(base64Data);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const handleConfirm = () => {
        if (!capturedImage) return;
        onConfirm(capturedImage);
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
            <motion.div 
                initial={{ y: 50, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }} 
                className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100 dark:border-gray-700"
            >
                {/* Header */}
                <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Clock In Verification</h3>
                        <p className="text-xs font-bold text-gray-500 mt-1">Capture a selfie to mark attendance</p>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isClocking}
                        className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Status Pills */}
                <div className="px-6 py-4 flex gap-3 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${locationState === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : locationState === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {locationState === 'success' ? <MapPin size={14} /> : locationState === 'error' ? <X size={14} /> : <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
                        {locationState === 'success' ? 'Location Locked' : locationState === 'error' ? 'Location Failed' : 'Getting Location'}
                    </div>
                </div>

                {/* Camera View */}
                <div className="relative bg-black w-full aspect-[4/5] sm:aspect-video flex items-center justify-center overflow-hidden">
                    {cameraState === 'error' ? (
                        <div className="text-center p-6 text-gray-400">
                            <Camera size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm font-bold">Camera access denied or unavailable.</p>
                        </div>
                    ) : (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover transform -scale-x-100 ${capturedImage ? 'hidden' : 'block'}`}
                            />
                            {capturedImage && (
                                <img 
                                    src={capturedImage} 
                                    alt="Selfie preview" 
                                    className="w-full h-full object-cover transform -scale-x-100" 
                                />
                            )}
                            
                            {/* Scanning overlay effect */}
                            {!capturedImage && cameraState === 'active' && (
                                <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500/30 m-4 rounded-3xl">
                                    <div className="w-full h-1 bg-indigo-500/50 blur-sm absolute top-1/2 left-0 animate-scan" />
                                    {/* Corner markers */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl m-2" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl m-2" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl m-2" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl m-2" />
                                </div>
                            )}

                            {/* Hidden canvas for capturing */}
                            <canvas ref={canvasRef} className="hidden" />
                        </>
                    )}
                </div>

                {/* Action Area */}
                <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    {!capturedImage ? (
                        <button 
                            onClick={capturePhoto}
                            disabled={cameraState !== 'active'}
                            className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                        >
                            <Camera size={18} /> Capture Photo
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={retakePhoto}
                                disabled={isClocking}
                                className="py-4 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                            >
                                <RefreshCw size={18} /> Retake
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={isClocking || locationState !== 'success'}
                                className="py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                            >
                                {isClocking ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><Check size={18} /> Confirm</>
                                )}
                            </button>
                        </div>
                    )}
                    {locationState !== 'success' && capturedImage && (
                        <p className="text-center text-xs font-bold text-amber-500 mt-3">Waiting for location to lock before confirming...</p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
