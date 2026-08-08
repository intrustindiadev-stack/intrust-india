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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-[family-name:var(--font-outfit)]"
        >
            <div className="relative w-full max-w-md h-[60vh] flex flex-col bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
            {/* Header - Floating */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-start justify-between z-30 bg-gradient-to-b from-slate-950/80 to-transparent">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl">
                    <h3 className="text-lg font-black text-white tracking-tight">Verify Attendance</h3>
                    <p className="text-xs font-bold text-slate-300">Selfie & Location Required</p>
                </div>
                <button 
                    onClick={onClose}
                    disabled={isClocking}
                    className="w-10 h-10 rounded-full bg-slate-900/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Location Status Pill - Floating Top Center */}
            <div className="absolute top-20 left-0 right-0 z-30 flex justify-center pointer-events-none">
                <motion.div 
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-2xl backdrop-blur-xl ${
                        locationState === 'success' 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20' 
                            : locationState === 'error' 
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/20' 
                            : 'bg-slate-800/40 text-white border-white/10'
                    }`}
                >
                    {locationState === 'success' ? (
                        <><MapPin size={16} /> Location Locked</>
                    ) : locationState === 'error' ? (
                        <><AlertCircle size={16} /> Location Error</>
                    ) : (
                        <><Loader2 size={16} className="animate-spin" /> Fetching GPS...</>
                    )}
                </motion.div>
            </div>

            {/* Camera / Preview Area - Full Screen */}
            <div className="flex-1 relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                {cameraState === 'error' ? (
                    <div className="text-center p-6 text-slate-400 flex flex-col items-center z-10">
                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                            <Camera size={32} className="opacity-50" />
                        </div>
                        <p className="text-base font-black text-white">Camera Access Denied</p>
                        <p className="text-sm mt-2 max-w-[250px] text-center text-slate-400 font-semibold">Please allow camera permissions to verify your attendance.</p>
                    </div>
                ) : (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${capturedImage ? 'opacity-0' : 'opacity-100'}`}
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
                            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                                {/* Vignette */}
                                <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
                                
                                {/* Face Guide Frame */}
                                <div className="relative w-64 h-80 sm:w-80 sm:h-96 border-2 border-white/20 rounded-[4rem] flex items-center justify-center">
                                    <div className="absolute top-0 w-12 h-2 bg-indigo-500 rounded-full -translate-y-1" />
                                    <div className="absolute bottom-0 w-12 h-2 bg-indigo-500 rounded-full translate-y-1" />
                                    <div className="absolute left-0 w-2 h-12 bg-indigo-500 rounded-full -translate-x-1" />
                                    <div className="absolute right-0 w-2 h-12 bg-indigo-500 rounded-full translate-x-1" />
                                    <div className="w-full h-full rounded-[4rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                                </div>
                            </div>
                        )}

                        {/* Hidden canvas for capturing */}
                        <canvas ref={canvasRef} className="hidden" />
                    </>
                )}
            </div>

            {/* Actions - Glassmorphic Bottom Bar */}
            <div className="absolute bottom-0 inset-x-0 p-6 pb-safe z-30 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                <div className="max-w-md mx-auto w-full">
                    {!capturedImage ? (
                        <button 
                            onClick={capturePhoto}
                            disabled={cameraState !== 'active'}
                            className="w-full py-5 rounded-[2rem] bg-indigo-600/90 backdrop-blur-xl border border-white/10 hover:bg-indigo-600 text-white font-black text-base uppercase tracking-widest shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:hover:bg-indigo-600/90"
                        >
                            <Camera size={24} /> Capture Selfie
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={retakePhoto}
                                disabled={isClocking}
                                className="py-5 rounded-[2rem] bg-slate-900/60 backdrop-blur-xl border border-white/10 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800/80 shadow-lg"
                            >
                                <RefreshCw size={20} /> Retake
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={isClocking || locationState !== 'success'}
                                className={`py-5 rounded-[2rem] backdrop-blur-xl border border-white/10 text-white font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                                    locationState === 'success' 
                                        ? 'bg-emerald-500/90 hover:bg-emerald-500 shadow-emerald-500/30 active:scale-95' 
                                        : 'bg-slate-800/60 cursor-not-allowed'
                                }`}
                            >
                                {isClocking ? (
                                    <Loader2 size={24} className="animate-spin" />
                                ) : (
                                    <><Check size={24} /> Clock In</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </motion.div>
    );
}
