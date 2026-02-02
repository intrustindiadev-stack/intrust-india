'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function FeaturesSection({ features }) {
    const { t } = useLanguage();

    return (
        <section className="py-24 md:py-32 bg-gradient-to-b from-white via-gray-50/30 to-white relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-20 right-10 w-72 h-72 bg-[#92BCEA]/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-10 w-72 h-72 bg-[#AFB3F7]/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16 md:mb-20"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#171A21] mb-6 font-[family-name:var(--font-outfit)] leading-tight">
                            {t('features.title')}
                        </h2>
                        <p className="text-lg md:text-xl text-[#617073] max-w-2xl mx-auto leading-relaxed">
                            Everything you need to manage your financial life
                        </p>
                    </motion.div>
                </motion.div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <FeatureCard key={feature.title} feature={feature} index={index} Icon={Icon} />
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ feature, index, Icon }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: index * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="group relative p-8 md:p-10 bg-white rounded-3xl border-2 border-gray-100 hover:border-[#92BCEA]/30 hover:shadow-2xl hover:shadow-[#92BCEA]/10 transition-all duration-500 cursor-pointer overflow-hidden"
        >
            {/* Gradient background on hover */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[#92BCEA]/5 via-transparent to-[#AFB3F7]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            {/* Content */}
            <div className="relative z-10">
                {/* Icon */}
                <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.6 }}
                    className={`w-16 h-16 md:w-18 md:h-18 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                >
                    <Icon size={32} className="text-white" strokeWidth={2} />
                </motion.div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-[#171A21] mb-4 group-hover:text-[#92BCEA] transition-colors duration-300">
                    {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[#617073] leading-relaxed text-base md:text-lg">
                    {feature.description}
                </p>

                {/* Decorative corner accent */}
                <motion.div
                    className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#92BCEA]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
            </div>
        </motion.div>
    );
}
