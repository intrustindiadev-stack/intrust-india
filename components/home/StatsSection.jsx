'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// --- Realistic & Creative Graphical Components ---

const VolumeGraph = () => (
    <div className="relative w-full h-28 md:h-40 flex items-end justify-center perspective-[1000px] overflow-visible">
        {/* Floor Reflection */}
        <div className="absolute bottom-0 w-[80%] h-4 bg-blue-500/20 blur-xl rounded-[100%] rotate-x-[60deg]" />

        <svg viewBox="0 0 200 100" className="w-full h-full relative z-10 overflow-visible drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)]">
            <defs>
                <linearGradient id="realGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Back Wave (Depth) */}
            <motion.path
                d="M0,100 L0,80 Q50,40 100,60 T200,30 V100 Z"
                fill="#1E3A8A"
                opacity="0.3"
                initial={{ d: "M0,100 L0,100 Q50,100 100,100 T200,100 V100 Z" }}
                whileInView={{ d: "M0,100 L0,80 Q50,40 100,60 T200,30 V100 Z" }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            />
            {/* Front Wave (Main) */}
            <motion.path
                d="M0,100 L0,60 Q40,80 80,40 T140,30 T200,10 V100 Z"
                fill="url(#realGradient)"
                initial={{ d: "M0,100 L0,100 Q40,100 80,100 T140,100 T200,100 V100 Z" }}
                whileInView={{ d: "M0,100 L0,60 Q40,80 80,40 T140,30 T200,10 V100 Z" }}
                transition={{ duration: 1.2, type: "spring", bounce: 0.2 }}
            />
            {/* Line Highlight */}
            <motion.path
                d="M0,60 Q40,80 80,40 T140,30 T200,10"
                fill="none"
                stroke="#93C5FD"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
            />
        </svg>

        {/* 3D Floating Tag - Smaller on mobile */}
        <motion.div
            initial={{ opacity: 0, y: 20, rotateX: 20 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 1, type: "spring" }}
            style={{ transformStyle: 'preserve-3d' }}
            className="absolute top-0 right-0 md:top-2 md:right-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow-lg border-t border-white/20 z-20"
        >
            +142%
        </motion.div>
    </div>
);

const UserNetwork = () => (
    <div className="relative w-full h-28 md:h-40 flex items-center justify-center">
        {/* Orbital Rings */}
        {[1, 2, 3].map((ring, i) => (
            <div
                key={i}
                className="absolute border border-indigo-500/20 rounded-full animate-[spin_10s_linear_infinite]"
                style={{
                    width: `${ring * 35}px md:width: ${ring * 50}px`,
                    height: `${ring * 35}px md:height: ${ring * 50}px`,
                    animationDuration: `${10 + i * 5}s`
                }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full shadow-[0_0_8px_#818CF8]" />
            </div>
        ))}

        {/* Central Core */}
        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-900 shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.5),inset_4px_4px_8px_rgba(255,255,255,0.2),0_0_20px_rgba(99,102,241,0.5)] z-10 flex items-center justify-center">
            <div className="w-full h-full rounded-full animate-pulse bg-indigo-500/30 blur-md absolute" />
        </div>
    </div>
);

const UptimeRing = () => (
    <div className="relative w-full h-28 md:h-40 flex items-center justify-center">
        {/* Outer Glow */}
        <div className="absolute w-20 h-20 md:w-24 md:h-24 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />

        <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-24 md:h-24 -rotate-90 relative z-10">
            {/* Track */}
            <circle cx="50" cy="50" r="42" stroke="#1F2937" strokeWidth="8" fill="none" />

            {/* Indicator */}
            <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
            </defs>
            <motion.circle
                cx="50" cy="50" r="42"
                stroke="url(#ringGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="264"
                initial={{ strokeDashoffset: 264 }}
                whileInView={{ strokeDashoffset: 2 }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]"
            />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
            {/* Inner */}
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#171A21] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.1)] flex items-center justify-center">
                <span className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    99.9%
                </span>
            </div>
        </div>
    </div>
);

const MerchantBars = () => (
    <div className="relative w-full h-28 md:h-40 flex items-end justify-center gap-1.5 md:gap-2 overflow-hidden px-4">
        {/* Bar Chart */}
        {[30, 50, 40, 70, 60, 90, 80].map((height, i) => (
            <motion.div
                key={i}
                initial={{ height: 0 }}
                whileInView={{ height: `${height}%` }}
                transition={{ duration: 1, delay: i * 0.1, ease: "backOut" }}
                className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-400 rounded-t-sm shadow-[0_0_10px_rgba(167,139,250,0.3)] opacity-90 hover:opacity-100 transition-opacity"
            />
        ))}
        {/* Reflection */}
        <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-black/0 to-fuchsia-500/10 blur-md" />
    </div>
);

// --- Animated Counter ---
const Counter = ({ from, to, duration = 2, suffix = "" }) => {
    const nodeRef = useRef();
    const inView = useInView(nodeRef, { once: true });
    const [displayValue, setDisplayValue] = useState(from);

    useEffect(() => {
        if (inView) {
            let startTimestamp;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
                const easeProgress = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(from + (to - from) * easeProgress);
                setDisplayValue(current);
                if (progress < 1) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
        }
    }, [inView, from, to, duration]);
    return <span ref={nodeRef}>{displayValue.toLocaleString()}{suffix}</span>;
};

export default function StatsSection() {
    return (
        <section className="py-12 md:py-20 bg-[#0F1115] font-[family-name:var(--font-outfit)] relative z-20 overflow-hidden text-white perspective-[2000px]">

            {/* Realistic Ambient Lighting */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#3B82F6]/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#6366F1]/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">

                {/* Header - Stamped Metal Look */}
                <div className="flex flex-col items-center justify-center text-center mb-10 md:mb-16 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-[10px] md:text-sm font-bold text-blue-400/80 uppercase tracking-[0.3em] mr-[-0.3em] mb-3 md:mb-6 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                            Our Impact
                        </h2>
                        <h3 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                            Visualizing <br className="hidden md:block" />
                            <span className="text-blue-100 drop-shadow-[0_0_20px_rgba(96,165,250,0.4)]">Total Scale.</span>
                        </h3>
                    </motion.div>
                </div>

                {/* 4-Card Responsive Grid Layout */}
                {/* Mobile: 2 cols, Desktop: 4 cols */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 max-w-[1400px] mx-auto justify-items-center">

                    <Card delay={0.1}>
                        <VolumeGraph />
                        <CardContent
                            value={<>₹<Counter from={0} to={50} />Cr+</>}
                            label="Volume"
                            accent="text-blue-400"
                        />
                    </Card>

                    <Card delay={0.2}>
                        <UserNetwork />
                        <CardContent
                            value={<Counter from={0} to={50} suffix="k+" />}
                            label="Members"
                            accent="text-indigo-400"
                        />
                    </Card>

                    <Card delay={0.3}>
                        <MerchantBars />
                        <CardContent
                            value={<Counter from={0} to={10} suffix="k+" />}
                            label="Merchants"
                            accent="text-fuchsia-400"
                        />
                    </Card>

                    <Card delay={0.4}>
                        <UptimeRing />
                        <CardContent
                            value={<Counter from={0} to={99} suffix="%" />}
                            label="Uptime"
                            accent="text-emerald-400"
                        />
                    </Card>

                </div>

            </div>
        </section>
    );
}

// Helper Components
const Card = ({ children, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
        whileHover={{ y: -8, scale: 1.02 }}
        className="
            group w-full max-w-full sm:max-w-[320px] 
            rounded-2xl md:rounded-[2rem]
            bg-white/[0.02]
            border-t border-l border-white/[0.08] border-b border-r border-black/20
            backdrop-blur-xl relative overflow-hidden
            shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]
        "
    >
        {/* Glossy Reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="p-3 md:p-6 relative z-10 h-full flex flex-col justify-between">
            {children}
        </div>
    </motion.div>
);

const CardContent = ({ value, label, accent }) => (
    <div className="text-center mt-1 md:mt-2">
        <h4 className="text-2xl md:text-4xl font-bold text-white mb-0.5 md:mb-1 tracking-tighter drop-shadow-md">
            {value}
        </h4>
        <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] ${accent} opacity-80 group-hover:opacity-100 transition-opacity`}>
            {label}
        </p>
    </div>
);
