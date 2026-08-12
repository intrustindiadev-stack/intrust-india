'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, RefreshCw, Check, MapPin, AlertCircle, Loader2, ShieldAlert, VideoOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Camera State Machine ────────────────────────────────────────────────────
// idle        → camera not yet requested (initial)
// requesting  → getUserMedia() in progress
// active      → stream running, video visible
// denied      → NotAllowedError — permission explicitly blocked
// unavailable → NotFoundError — no camera hardware / insecure context
// busy        → NotReadableError — camera in use by another app
// error       → unexpected / unknown error
// ─────────────────────────────────────────────────────────────────────────────

function getBrowserInstructions() {
    if (typeof navigator === 'undefined') return { browser: 'your browser', steps: [] };
    const ua = navigator.userAgent;
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        return {
            browser: 'Safari',
            steps: [
                'Open Safari → Settings (or Preferences on Mac)',
                'Go to Websites → Camera',
                'Find intrustindia.com and select "Allow"',
                'Return here and tap "Try Again"',
            ],
        };
    }
    if (/edg/i.test(ua)) {
        return {
            browser: 'Edge',
            steps: [
                'Click the lock icon (🔒) in the address bar',
                'Find Camera and set it to "Allow"',
                'Click "Try Again" below',
            ],
        };
    }
    if (/firefox/i.test(ua)) {
        return {
            browser: 'Firefox',
            steps: [
                'Click the lock icon (🔒) in the address bar',
                'Click the "×" next to Blocked: Camera',
                'Reload the page, then click "Try Again"',
            ],
        };
    }
    // Chrome / Chromium default
    return {
        browser: 'Chrome',
        steps: [
            'Click the camera icon (🎥) or lock (🔒) in the address bar',
            'Set Camera to "Allow"',
            'Click "Try Again" below',
        ],
    };
}

export default function AttendanceCameraModal({ onClose, onConfirm, isClocking }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    // Use ref (not state) for stream — avoids stale-closure issues during cleanup
    const streamRef = useRef(null);

    const [capturedImage, setCapturedImage] = useState(null);

    // Location state: fetching | success | error
    const [locationState, setLocationState] = useState('fetching');
    const [locationData, setLocationData] = useState(null);

    // 7-state camera machine
    const [cameraState, setCameraState] = useState('requesting');

    // ─── Stop any existing stream before re-requesting ────────────────────────
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    // ─── Request camera access ────────────────────────────────────────────────
    const requestCamera = useCallback(async () => {
        stopStream();
        setCameraState('requesting');
        setCapturedImage(null);

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false,
            });

            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // play() returns a Promise — handle the rejection to avoid unhandled errors
                try { await videoRef.current.play(); } catch { /* autoplay policy — video still shows */ }
            }

            setCameraState('active');
        } catch (err) {
            console.error('[Camera] getUserMedia error:', err.name, err.message);
            stopStream();

            switch (err.name) {
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    setCameraState('denied');
                    break;
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                case 'NotSupportedError':
                case 'SecurityError':
                    setCameraState('unavailable');
                    break;
                case 'NotReadableError':
                case 'TrackStartError':
                    setCameraState('busy');
                    break;
                case 'OverconstrainedError':
                    // Retry with relaxed constraints
                    try {
                        const fallback = await navigator.mediaDevices.getUserMedia({ video: true });
                        streamRef.current = fallback;
                        if (videoRef.current) {
                            videoRef.current.srcObject = fallback;
                            try { await videoRef.current.play(); } catch { /* ignore */ }
                        }
                        setCameraState('active');
                    } catch {
                        setCameraState('error');
                    }
                    break;
                default:
                    setCameraState('error');
            }
        }
    }, [stopStream]);

    // ─── Geolocation ──────────────────────────────────────────────────────────
    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationState('error');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocationState('success');
                setLocationData({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
            },
            () => setLocationState('error'),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    }, []);

    // ─── Mount: start camera + location ──────────────────────────────────────
    useEffect(() => {
        requestCamera();
        getLocation();
        return () => { stopStream(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Capture photo ────────────────────────────────────────────────────────
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        // Mirror to match what the user sees in the preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
    };

    const retakePhoto = () => { setCapturedImage(null); };

    const handleConfirm = () => {
        if (!capturedImage) {
            toast.error('Please capture a selfie first.');
            return;
        }
        if (locationState !== 'success' || !locationData) {
            toast.error('GPS location is required to clock in.');
            return;
        }
        onConfirm({ selfieBase64: capturedImage, locationData });
    };

    // ─── Render camera area based on state ───────────────────────────────────
    const browserInfo = getBrowserInstructions();

    const renderCameraArea = () => {
        if (cameraState === 'denied') {
            return (
                <div className="flex flex-col items-center justify-center p-5 text-center z-10 gap-4 h-full">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <ShieldAlert size={28} className="text-rose-400" />
                    </div>
                    <div>
                        <p className="text-base font-black text-white">Camera Access Blocked</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
                            Your browser blocked camera access. Follow these steps in <span className="text-slate-300 font-bold">{browserInfo.browser}</span>:
                        </p>
                    </div>
                    <ol className="text-left space-y-1.5 text-xs text-slate-400 max-w-[260px]">
                        {browserInfo.steps.map((step, i) => (
                            <li key={i} className="flex gap-2">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                    <button
                        onClick={requestCamera}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        <RefreshCw size={14} /> Try Again
                    </button>
                </div>
            );
        }

        if (cameraState === 'unavailable') {
            return (
                <div className="flex flex-col items-center justify-center p-6 text-center z-10 gap-3 h-full">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                        <VideoOff size={28} className="text-slate-400" />
                    </div>
                    <p className="text-base font-black text-white">No Camera Found</p>
                    <p className="text-sm text-slate-400 max-w-[250px]">
                        No camera device was detected. Please use a device with a camera.
                    </p>
                    <button
                        onClick={requestCamera}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        <RefreshCw size={14} /> Try Again
                    </button>
                </div>
            );
        }

        if (cameraState === 'busy') {
            return (
                <div className="flex flex-col items-center justify-center p-6 text-center z-10 gap-3 h-full">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <AlertCircle size={28} className="text-amber-400" />
                    </div>
                    <p className="text-base font-black text-white">Camera In Use</p>
                    <p className="text-sm text-slate-400 max-w-[250px]">
                        Your camera is being used by another app. Close video calls or other camera apps, then try again.
                    </p>
                    <button
                        onClick={requestCamera}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        <RefreshCw size={14} /> Try Again
                    </button>
                </div>
            );
        }

        if (cameraState === 'error') {
            return (
                <div className="flex flex-col items-center justify-center p-6 text-center z-10 gap-3 h-full">
                    <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                        <Camera size={32} className="opacity-50" />
                    </div>
                    <p className="text-base font-black text-white">Camera Error</p>
                    <p className="text-sm text-slate-400 max-w-[250px]">An unexpected error occurred. Please try again.</p>
                    <button
                        onClick={requestCamera}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        <RefreshCw size={14} /> Try Again
                    </button>
                </div>
            );
        }

        if (cameraState === 'requesting') {
            return (
                <div className="flex flex-col items-center justify-center gap-3 h-full z-10">
                    <Loader2 size={32} className="text-indigo-400 animate-spin" />
                    <p className="text-sm text-slate-400 font-semibold">Starting camera…</p>
                </div>
            );
        }

        // cameraState === 'active'
        return (
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

                {/* Face guide overlay */}
                {!capturedImage && (
                    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                        <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
                        <div className="relative w-64 h-80 sm:w-80 sm:h-96 border-2 border-white/20 rounded-[4rem] flex items-center justify-center">
                            <div className="absolute top-0 w-12 h-2 bg-indigo-500 rounded-full -translate-y-1" />
                            <div className="absolute bottom-0 w-12 h-2 bg-indigo-500 rounded-full translate-y-1" />
                            <div className="absolute left-0 w-2 h-12 bg-indigo-500 rounded-full -translate-x-1" />
                            <div className="absolute right-0 w-2 h-12 bg-indigo-500 rounded-full translate-x-1" />
                            <div className="w-full h-full rounded-[4rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
                        </div>
                    </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-[family-name:var(--font-outfit)]"
        >
            <div className="relative w-full max-w-md h-[60vh] flex flex-col bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">

                {/* Header */}
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

                {/* Location Status Pill */}
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

                {/* Camera Area */}
                <div className="flex-1 relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                    {renderCameraArea()}
                </div>

                {/* Bottom Actions — only shown when camera is active */}
                <div className="absolute bottom-0 inset-x-0 p-6 pb-safe z-30 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                    <div className="max-w-md mx-auto w-full">
                        {cameraState === 'active' && (
                            !capturedImage ? (
                                <button
                                    onClick={capturePhoto}
                                    className="w-full py-5 rounded-[2rem] bg-indigo-600/90 backdrop-blur-xl border border-white/10 hover:bg-indigo-600 text-white font-black text-base uppercase tracking-widest shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
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
                            )
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
