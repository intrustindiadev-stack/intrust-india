import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, Sparkles, TrendingUp, ShieldCheck, Zap, ArrowRight, Store, Package, ShoppingCart } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AIGrowModal({ isOpen, onClose }) {
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const containerRef = useRef(null);
    const x = useMotionValue(0);
    // Smooth transition for the background fill as you swipe
    const backgroundWidth = useTransform(x, [0, 240], ["64px", "100%"]);
    const textOpacity = useTransform(x, [0, 100], [1, 0]);

    useEffect(() => {
        if (!isOpen) {
            setIsRedirecting(false);
            x.set(0);
        }
    }, [isOpen, x]);

    const handleDragEnd = (event, info) => {
        if (info.offset.x > 140) {
            setIsRedirecting(true);
            setTimeout(() => {
                router.push('/merchant/investments?new=true');
                setTimeout(() => onClose(), 500);
            }, 500);
        } else {
            animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
        }
    };

    const features = [
        { icon: Zap, title: "Zero Effort", desc: "AI routes orders automatically" },
        { icon: TrendingUp, title: "High Volume", desc: "Maximize capital efficiency" },
        { icon: ShieldCheck, title: "Secure", desc: "Transparent profit sharing" },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 20 } }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Minimal Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                    />
                    
                    {/* Redirect Flash */}
                    {isRedirecting && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 60, opacity: 1 }}
                            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-[#0f111a] rounded-full z-[120] pointer-events-none"
                        />
                    )}

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 250, mass: 0.8 }}
                        className="fixed bottom-0 left-0 right-0 h-[85vh] sm:h-[80vh] w-full bg-white dark:bg-[#0f111a] sm:rounded-t-[2.5rem] rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[101] overflow-hidden flex flex-col border-t border-slate-100 dark:border-white/5"
                    >
                        {/* Elegant Handle */}
                        <div className="w-full flex justify-center pt-3 pb-2 shrink-0">
                            <div className="w-10 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 sm:px-10 pb-32">
                            {/* Minimal Header */}
                            <div className="flex justify-end mb-4">
                                <button onClick={onClose} className="p-2 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-8"
                            >
                                {/* Compact Orbit Animation */}
                                <motion.div variants={itemVariants} className="relative w-32 h-32 mx-auto mt-2">
                                    {/* Central Node */}
                                    <div className="absolute inset-0 m-auto w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#b5952f] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] z-10 border border-white/20">
                                        <Sparkles className="text-white w-6 h-6 animate-pulse" />
                                    </div>
                                    
                                    {/* Orbital Track */}
                                    <div className="absolute inset-0 m-auto w-full h-full border border-slate-200 dark:border-white/10 rounded-full border-dashed animate-[spin_10s_linear_infinite] z-0" />
                                    
                                    {/* Orbiting Icons */}
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 m-auto w-full h-full z-20"
                                    >
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700" style={{ animation: 'spin 10s linear infinite reverse' }}>
                                            <ShoppingCart className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700" style={{ animation: 'spin 10s linear infinite reverse' }}>
                                            <Package className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <div className="absolute bottom-2 left-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center border border-slate-100 dark:border-slate-700" style={{ animation: 'spin 10s linear infinite reverse' }}>
                                            <Store className="w-4 h-4 text-orange-500" />
                                        </div>
                                    </motion.div>
                                </motion.div>

                                {/* Typography Focus */}
                                <div className="space-y-4 max-w-sm mx-auto text-center">
                                    <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-black font-display text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                                        Automate<br/>Your Growth.
                                    </motion.h2>
                                    
                                    <motion.p variants={itemVariants} className="text-slate-500 dark:text-white/50 text-[13px] sm:text-sm font-medium leading-relaxed max-w-[280px] mx-auto">
                                        Supply capital, we route e-com orders via AI and share the profits.
                                    </motion.p>
                                </div>

                                {/* Minimal Interactive Cards */}
                                <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2 max-w-[340px] mx-auto">
                                    {features.map((feat, idx) => {
                                        const Icon = feat.icon;
                                        return (
                                            <motion.div 
                                                key={idx}
                                                whileHover={{ y: -2 }}
                                                className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-3 shadow-sm transition-all cursor-default text-center flex flex-col items-center justify-center aspect-square"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#D4AF37]/10 flex items-center justify-center mb-2">
                                                    <Icon className="text-[#D4AF37]" size={16} />
                                                </div>
                                                <h4 className="text-slate-800 dark:text-white font-bold text-[10px] leading-tight mb-0.5">{feat.title}</h4>
                                                <p className="text-slate-500 dark:text-white/40 text-[9px] font-medium leading-[1.1]">{feat.desc}</p>
                                            </motion.div>
                                        )
                                    })}
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Classic Swiper - White/Gold Theme */}
                        <div className="absolute bottom-0 left-0 w-full p-6 pb-8 bg-gradient-to-t from-white via-white to-transparent dark:from-[#0f111a] dark:via-[#0f111a]">
                            <div 
                                ref={containerRef}
                                className="relative w-full max-w-md mx-auto h-16 bg-slate-100 dark:bg-[#1a1c23]/80 rounded-full overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center touch-none border border-slate-200/50 dark:border-white/5"
                            >
                                {/* Fill Background */}
                                <motion.div 
                                    style={{ width: backgroundWidth }}
                                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#D4AF37] to-[#b5952f] rounded-full z-0 origin-left"
                                />
                                
                                {/* Shimmering Text - Slower and elegant */}
                                <motion.p 
                                    style={{ opacity: textOpacity, backgroundSize: '200% auto' }}
                                    className="absolute z-10 text-[13px] font-bold uppercase tracking-widest pointer-events-none bg-clip-text text-transparent bg-gradient-to-r from-slate-400 via-slate-700 to-slate-400 dark:from-white/30 dark:via-white/80 dark:to-white/30 animate-[shimmer_4s_infinite_linear]"
                                >
                                    Slide to Activate
                                </motion.p>

                                {/* Drag Handle */}
                                <motion.div
                                    drag="x"
                                    dragConstraints={containerRef}
                                    dragElastic={0.05}
                                    dragMomentum={false}
                                    onDragEnd={handleDragEnd}
                                    style={{ x }}
                                    whileTap={{ scale: 0.96 }}
                                    className="absolute left-1.5 top-1.5 bottom-1.5 w-13 aspect-square bg-white dark:bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.15)] flex items-center justify-center z-20 cursor-grab active:cursor-grabbing border border-slate-100 dark:border-transparent"
                                >
                                    <ArrowRight className="text-slate-800" size={22} />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
