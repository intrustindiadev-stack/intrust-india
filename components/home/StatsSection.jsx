'use client';

import { TrendingUp, Sparkles, Star, Users, ArrowUpRight } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// CountUp Component
function CountUp({ end, duration = 2, prefix = '', suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView) {
            let startTime;
            let animationFrame;

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = timestamp - startTime;
                const percentage = Math.min(progress / (duration * 1000), 1);

                // Ease out function
                const easeOutQuart = 1 - Math.pow(1 - percentage, 4);

                setCount(Math.floor(easeOutQuart * end));

                if (percentage < 1) {
                    animationFrame = requestAnimationFrame(animate);
                }
            };

            animationFrame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrame);
        }
    }, [isInView, end, duration]);

    return (
        <span ref={ref} className="tabular-nums">
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
}

export default function StatsSection({ stats }) {
    // Override props with numeric values for animation if needed, 
    // or parse the strings. For now we use the props but wrap in motion.

    // We'll create a custom premium grid layout
    return (
        <section className="relative py-20 bg-white border-y border-slate-100">
            <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stats.map((stat, index) => {
                        // Parse numbers roughly for demo animation (e.g., "10K+" -> 10000)
                        // This is a simplified logic, relying on the visual string mostly
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                                className="group relative bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-blue-100 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300"
                            >
                                <div className="absolute top-8 right-8 text-slate-300 group-hover:text-blue-500 transition-colors">
                                    <ArrowUpRight size={24} />
                                </div>

                                <div className="w-16 h-16 rounded-2xl bg-slate-50 group-hover:bg-blue-600 transition-colors flex items-center justify-center mb-6">
                                    <Icon size={32} className="text-slate-900 group-hover:text-white transition-colors" strokeWidth={1.5} />
                                </div>

                                <div className="text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
                                    {stat.value}
                                </div>
                                <div className="text-slate-500 font-medium text-lg group-hover:text-blue-600 transition-colors">
                                    {stat.label}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
