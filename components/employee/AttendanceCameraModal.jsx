'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, RefreshCw, Check, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AttendanceCameraModal({ onClose, onConfirm, isClocking }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    
    // Location state: fetching, success, error
    const [locationState, setLocationState] = useState('fetching'); 
    const [locationData, setLocationData] = useState(null);
    
    // Camera state: starting, active, error
    const [cameraState, setCameraState] = useState('starting'); 

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
                (position) => {
                    setLocationState('success');
                    setLocationData({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    setLocationState('error');
                    console.error("Geolocation error:", error);
                },
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
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        // Mirror the image correctly
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64Data = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(base64Data);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const handleConfirm = () => {
        if (!capturedImage) {
            toast.error("Please capture a selfie first.");
            return;
        }
        if (locationState !== 'success' || !locationData) {
            toast.error("GPS location is required to clock in.");
            return;
        }
        onConfirm({ selfieBase64: capturedImage, locationData });
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md"
        >
            <motion.div 
                initial={{ y: 20, opacity: 0, scale: 0.95 }} 
                animate={{ y: 0, opacity: 1, scale: 1 }} 
                exit={{ y: 20, opacity: 0, scale: 0.95 }} 
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative border border-white/20 dark:border-slate-800/60 flex flex-col"
            >
                {/* Header */}
                <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10 relative">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Verify Attendance</h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">Selfie & Location Required</p>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isClocking}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Location Status Pill */}
                <div className="absolute top-20 left-0 right-0 z-20 flex justify-center pointer-events-none">
                    <motion.div 
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border shadow-lg backdrop-blur-md ${
                            locationState === 'success' 
                                ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                                : locationState === 'error' 
                                ? 'bg-rose-500/90 text-white border-rose-400/50' 
                                : 'bg-slate-900/90 text-white border-slate-700/50'
                        }`}
                    >
                        {locationState === 'success' ? (
                            <><MapPin size={14} /> Location Locked</>
                        ) : locationState === 'error' ? (
                            <><AlertCircle size={14} /> Location Error</>
                        ) : (
                            <><Loader2 size={14} className="animate-spin" /> Fetching GPS...</>
                        )}
                    </motion.div>
                </div>

                {/* Camera / Preview Area */}
                <div className="relative w-full aspect-[3/4] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                    {cameraState === 'error' ? (
                        <div className="text-center p-6 text-slate-400 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                                <Camera size={24} className="opacity-50" />
                            </div>
                            <p className="text-sm font-bold">Camera Access Denied</p>
                            <p className="text-xs mt-2 max-w-[200px] text-center opacity-80">Please allow camera permissions to verify attendance.</p>
                        </div>
                    ) : (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${capturedImage ? 'opacity-0' : 'opacity-100'}`}
                            />
                            
                            <AnimatePresence>
                                {capturedImage && (
                                    <motion.img 
                                        initial={{ opacity: 0, scale: 1.05 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        src={capturedImage} 
                                        alt="Selfie preview" 
                                        className="absolute inset-0 w-full h-full object-cover" 
                                    />
                                )}
                            </AnimatePresence>
                            
                            {/* Scanning overlay effect */}
                            {!capturedImage && cameraState === 'active' && (
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* Vignette */}
                                    <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
                                    
                                    {/* Face Guide Frame */}
                                    <div className="absolute inset-10 border-2 border-white/20 rounded-full sm:rounded-[3rem]">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-indigo-500 rounded-full" />
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-2 bg-indigo-500 rounded-full" />
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-8 bg-indigo-500 rounded-full" />
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-8 bg-indigo-500 rounded-full" />
                                    </div>
                                </div>
                            )}

                            {/* Hidden canvas for capturing */}
                            <canvas ref={canvasRef} className="hidden" />
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/60 z-10 relative">
                    {!capturedImage ? (
                        <button 
                            onClick={capturePhoto}
                            disabled={cameraState !== 'active'}
                            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:hover:bg-indigo-600"
                        >
                            <Camera size={18} /> Capture Selfie
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={retakePhoto}
                                disabled={isClocking}
                                className="py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                            >
                                <RefreshCw size={16} /> Retake
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={isClocking || locationState !== 'success'}
                                className={`py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                    locationState === 'success' 
                                        ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 active:scale-95' 
                                        : 'bg-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {isClocking ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <><Check size={18} /> Clock In</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
