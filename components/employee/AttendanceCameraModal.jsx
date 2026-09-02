'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, RefreshCw, Check, MapPin, MapPinOff, Loader2, CameraOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Error Mapping Functions ──────────────────────────────────────────────────
function mapCameraError(err) {
    if (typeof err === 'string') return err;
    const name = err?.name || '';
    const msg = err?.message || '';

    switch (name) {
        case 'NotFoundError':
        case 'DevicesNotFoundError':
            return 'No camera hardware detected. Please connect a webcam.';
        case 'NotAllowedError':
        case 'PermissionDeniedError':
            return 'Camera access denied. Please update your browser site permissions.';
        case 'NotReadableError':
        case 'TrackStartError':
            return 'Camera is already in use by another application or busy.';
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
            return 'Camera does not meet requested constraints. Please try again.';
        case 'AbortError':
            return 'Camera initialization was aborted. Please try again.';
        default:
            if (msg.toLowerCase().includes('in use') || msg.toLowerCase().includes('busy') || msg.toLowerCase().includes('responding')) {
                return 'Camera is in use by another application or not responding.';
            }
            return msg || 'Unable to access camera. Please try again.';
    }
}

function mapLocationError(err) {
    switch (err?.code) {
        case 1: // PERMISSION_DENIED
            return 'Location access denied.';
        case 2: // POSITION_UNAVAILABLE
            return 'GPS signal unavailable.';
        case 3: // TIMEOUT
            return 'Location request timed out.';
        default:
            return 'Unable to determine location.';
    }
}

function AttendanceCameraModal({ onClose, onConfirm, isClocking }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    // ─── Hardware State Machine ──────────────────────────────────────────────
    const [cameraState, setCameraState] = useState('loading'); // 'loading' | 'ready' | 'error'
    const [cameraError, setCameraError] = useState('');
    const [isStreamReady, setIsStreamReady] = useState(false);

    const [locationState, setLocationState] = useState('loading');
    const [locationError, setLocationError] = useState('');
    const [location, setLocation] = useState(null);

    const [capturedImage, setCapturedImage] = useState(null);

    // ─── Direct Camera Requester ──────────────────────────────────────────────
    const acquireCamera = useCallback(async () => {
        setCameraState('loading');
        setCameraError('');
        setIsStreamReady(false);
        setCapturedImage(null);

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        try {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                throw new DOMException('Camera not supported by browser', 'NotFoundError');
            }

            const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            const videoConstraints = isMobile ? { facingMode: 'user' } : true;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false,
            });

            const videoTracks = stream.getVideoTracks();
            if (!videoTracks || videoTracks.length === 0) {
                throw new DOMException('No video track available', 'NotFoundError');
            }

            const track = videoTracks[0];
            track.onended = () => {
                setIsStreamReady(false);
                setCameraState('error');
                setCameraError('Camera was disconnected or turned off.');
            };

            streamRef.current = stream;

            if (videoRef.current) {
                const video = videoRef.current;
                video.muted = true;
                video.defaultMuted = true;
                video.playsInline = true;
                video.srcObject = stream;
                try {
                    await video.play();
                } catch (e) {
                    console.warn('[AttendanceModal] Play notice:', e);
                }
            }

            setCameraState('ready');
        } catch (err) {
            console.error('[AttendanceModal] Camera error:', err);
            setIsStreamReady(false);
            setCameraState('error');
            setCameraError(mapCameraError(err));
        }
    }, []);

    // ─── Direct Location Requester ────────────────────────────────────────────
    const acquireLocation = useCallback(() => {
        setLocationState('loading');
        setLocationError('');

        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    });
                    setLocationState('ready');
                },
                (err) => {
                    console.error('[AttendanceModal] Location error:', err);
                    setLocationState('error');
                    setLocationError(mapLocationError(err));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            setLocationState('error');
            setLocationError('Geolocation is not supported by this browser.');
        }
    }, []);

    // ─── Mount Lifecycle (runs ONCE on modal mount, cleanup on unmount) ───────
    useEffect(() => {
        let active = true;

        (async () => {
            try {
                if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                    throw new DOMException('Camera not supported by browser', 'NotFoundError');
                }

                const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                const videoConstraints = isMobile ? { facingMode: 'user' } : true;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints,
                    audio: false,
                });

                if (!active) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                const videoTracks = stream.getVideoTracks();
                if (!videoTracks || videoTracks.length === 0) {
                    throw new DOMException('No video track available', 'NotFoundError');
                }

                const track = videoTracks[0];
                track.onended = () => {
                    if (!active) return;
                    setIsStreamReady(false);
                    setCameraState('error');
                    setCameraError('Camera was disconnected or turned off.');
                };

                streamRef.current = stream;

                if (videoRef.current) {
                    const video = videoRef.current;
                    video.muted = true;
                    video.defaultMuted = true;
                    video.playsInline = true;
                    video.srcObject = stream;
                    try {
                        await video.play();
                    } catch (e) {
                        console.warn('[AttendanceModal] play notice:', e);
                    }
                }

                setCameraState('ready');
            } catch (err) {
                if (!active) return;
                console.error('[AttendanceModal] Camera error:', err);
                setIsStreamReady(false);
                setCameraState('error');
                setCameraError(mapCameraError(err));
            }
        })();

        // Start Location independently
        if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (!active) return;
                    setLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    });
                    setLocationState('ready');
                },
                (err) => {
                    if (!active) return;
                    console.error('[AttendanceModal] Location error:', err);
                    setLocationState('error');
                    setLocationError(mapLocationError(err));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            setLocationState('error');
            setLocationError('Geolocation is not supported by this browser.');
        }

        return () => {
            active = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, []); // Empty dependency array: clean single-mount lifecycle

    // ─── Photo Capture Handlers with Pixel & Stream Validation ────────────────
    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {
            toast.error('Camera is not ready. Please try again.');
            return;
        }

        // 1. Validate stream and video readiness
        if (!video.srcObject || !streamRef.current?.active) {
            toast.error('Camera stream is not active. Please wait for camera to initialize.');
            return;
        }

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            toast.error('Image capture initialization failed.');
            return;
        }

        // Mirror to match user selfie preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. Pixel validation: Check that the drawn frame is not completely black/blank
        try {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            let totalBrightness = 0;
            let visiblePixels = 0;
            const sampleStep = 16; // sample every 4th pixel for high performance
            const sampleCount = data.length / sampleStep;

            for (let i = 0; i < data.length; i += sampleStep) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                totalBrightness += brightness;
                if (brightness > 10) {
                    visiblePixels++;
                }
            }

            const avgBrightness = totalBrightness / sampleCount;
            const visibleRatio = visiblePixels / sampleCount;

            // If average brightness is near zero or virtually no non-black pixels exist
            if (avgBrightness < 3 || visibleRatio < 0.01) {
                toast.error('Invalid capture. Please ensure your camera is visible.');
                return;
            }
        } catch (err) {
            console.warn('[AttendanceModal] Pixel validation skipped:', err);
        }

        // 3. Valid frame -> convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(base64);
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const handleConfirm = () => {
        if (!capturedImage) {
            toast.error('Please capture a selfie first.');
            return;
        }
        onConfirm({ selfieBase64: capturedImage, locationData: location });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-[family-name:var(--font-outfit)]"
        >
            <div className="relative w-full max-w-md bg-slate-950 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 p-6 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Verify Attendance</h3>
                        <p className="text-xs font-semibold text-slate-400">Selfie & Location Verification</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isClocking}
                        className="w-9 h-9 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Location Status */}
                <div className="flex items-center justify-center">
                    {locationState === 'loading' && (
                        <div className="flex items-center gap-2 text-gray-400 text-xs bg-slate-900 border border-white/10 px-3.5 py-1.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                            <span>Detecting location...</span>
                        </div>
                    )}

                    {locationState === 'error' && (
                        <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full">
                            <MapPinOff className="w-3 h-3" />
                            <span>{locationError}</span>
                        </div>
                    )}

                    {locationState === 'ready' && location && (
                        <div className="flex items-center gap-2 text-green-400 text-xs bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
                            <MapPin className="w-3 h-3" />
                            <span>Location detected</span>
                        </div>
                    )}
                </div>

                {/* ── Video / Camera Area ── */}
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-white/5">
                    {/* The <video> element is ALWAYS mounted in the DOM to avoid ref race conditions */}
                    <video
                        ref={videoRef}
                        autoPlay={true}
                        playsInline={true}
                        muted={true}
                        onPlaying={() => {
                            if (videoRef.current?.srcObject && streamRef.current?.active) {
                                setIsStreamReady(true);
                            }
                        }}
                        onLoadedMetadata={() => {
                            if (videoRef.current?.videoWidth > 0 && streamRef.current?.active) {
                                setIsStreamReady(true);
                            }
                        }}
                        onLoadedData={() => {
                            if (videoRef.current?.videoWidth > 0 && streamRef.current?.active) {
                                setIsStreamReady(true);
                            }
                        }}
                        onCanPlay={() => {
                            if (videoRef.current?.videoWidth > 0 && streamRef.current?.active) {
                                setIsStreamReady(true);
                            }
                        }}
                        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                    />

                    {/* Captured image preview overlay */}
                    {capturedImage && (
                        <img
                            src={capturedImage}
                            alt="Selfie preview"
                            className="absolute inset-0 z-20 w-full h-full object-cover"
                        />
                    )}

                    {/* Loading spinner overlay while stream is initializing */}
                    {(cameraState === 'loading' || (!isStreamReady && cameraState !== 'error')) && !capturedImage && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                            <p className="text-gray-400 text-sm font-medium">Starting camera...</p>
                        </div>
                    )}

                    {/* Camera error state overlay */}
                    {cameraState === 'error' && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2.5 bg-slate-900/95 rounded-2xl p-5 text-center">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                <CameraOff size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider">Camera Unavailable</h4>
                                <p className="text-xs text-slate-300 mt-1 max-w-[280px] leading-relaxed">
                                    {cameraError || 'Unable to access camera.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={acquireCamera}
                                className="mt-1 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Bottom Actions */}
                <div className="pt-2">
                    {capturedImage ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={retakePhoto}
                                disabled={isClocking}
                                className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 border border-white/10"
                            >
                                <RefreshCw size={16} /> Retake
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isClocking}
                                className="py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                {isClocking ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <><Check size={16} /> Submit & Clock In</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={capturePhoto}
                            disabled={!isStreamReady || cameraState !== 'ready' || isClocking}
                            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Camera size={18} /> {
                                !isStreamReady && cameraState !== 'error'
                                    ? 'Starting camera...' 
                                    : cameraState === 'error' 
                                    ? 'Camera Unavailable' 
                                    : 'Capture Selfie'
                            }
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default memo(AttendanceCameraModal);
