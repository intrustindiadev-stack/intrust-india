'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHero from '@/components/ui/PageHero';
import StatsSection from '@/components/home/StatsSection';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ShieldCheck, Users, Target, TrendingUp, ArrowRight, Wallet, CreditCard, Lightbulb } from 'lucide-react';
import { useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function AboutPage() {
    const { t } = useLanguage();

    const values = [
        {
            icon: ShieldCheck,
            title: "Uncompromising Trust",
            description: "Security isn't a feature; it's our foundation. We employ bank-grade encryption and transparent protocols to ensure your data and money are always safe.",
            gradient: "from-blue-500/20 to-cyan-400/20",
            iconColor: "text-blue-600"
        },
        {
            icon: Users,
            title: "Customer Obsession",
            description: "We don't just build products; we solve problems. Every feature is designed with empathy, ensuring it adds real value to the daily lives of our users.",
            gradient: "from-purple-500/20 to-pink-400/20",
            iconColor: "text-purple-600"
        },
        {
            icon: Lightbulb,
            title: "Financial Innovation",
            description: "We bridge the gap between complex financial systems and simple user experiences, making advanced tools accessible to everyone in Bharat.",
            gradient: "from-amber-500/20 to-orange-400/20",
            iconColor: "text-amber-600"
        }
    ];

    const storySteps = [
        { year: '2014', title: 'The Foundation', description: 'InTrust was established with a singular vision: to bring transparent financial services to the underserved markets of India.' },
        { year: '2016', title: 'Building Trust', description: 'Launched our first offline network, serving over 10,000 customers in rural Madhya Pradesh and building deep community roots.' },
        { year: '2019', title: 'Digital First', description: 'Pivoted to a digital-first approach, launching our mobile platform to scale operations across 5 states.' },
        { year: '2022', title: 'Pan-India Scale', description: 'Crossed 1 Million users. Recognized as one of the fastest-growing fintech startups in the consumer trust space.' },
        { year: '2025', title: 'The Super App', description: 'Evolution into a complete financial ecosystem, unifying payments, credit, and commerce in one seamless experience.' },
    ];

    const aboutStats = [
        { value: '50+', label: 'Cities Presence', icon: Target },
        { value: '1M+', label: 'Transactions', icon: TrendingUp },
        { value: '99.9%', label: 'Uptime', icon: ShieldCheck },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <PageHero
                title="We Are InTrust"
                subtitle="Building the digital trust layer for India's financial future. Simplification, security, and smart solutions for everyone."
                variant="about"
            />

            {/* Mission Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                {/* Decorative background blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-3xl -z-10 mix-blend-multiply" />

                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="space-y-8"
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-sm tracking-wide">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                Our Mission
                            </div>

                            <h2 className="text-4xl md:text-5xl font-black font-outfit text-gray-900 leading-tight">
                                Empowering India with <span className="gradient-text">Financial Freedom</span>
                            </h2>

                            <p className="text-lg text-gray-600 leading-relaxed font-inter">
                                We envision a world where financial services are not just accessible but intuitive and empowering. By combining cutting-edge technology with deep consumer insights, we are removing friction from money management.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
                                    <div className="bg-green-100 p-3 rounded-lg text-green-600">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">100% Secure</h4>
                                        <p className="text-sm text-gray-500">Bank-grade encryption</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
                                    <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">User First</h4>
                                        <p className="text-sm text-gray-500">24/7 Support</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl rotate-3 opacity-20 blur-lg"></div>
                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-100 flex items-center justify-center p-8 group hover:scale-[1.01] transition-transform duration-500">
                                {/* Abstract visual representation */}
                                <div className="relative w-full h-full bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#7A93AC_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                    <ShieldCheck size={180} className="text-gray-200 group-hover:text-blue-100 transition-colors duration-500" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <motion.div
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                            className="bg-white/80 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-xl text-center"
                                        >
                                            <p className="text-gray-500 text-sm font-semibold mb-1">Total Trust Secured</p>
                                            <h3 className="text-4xl font-black text-gray-900 gradient-text">₹500Cr+</h3>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Values Section with Glass Cards */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl font-bold font-outfit text-gray-900 mb-4">Core Principles</h2>
                        <p className="text-gray-600 text-lg">Our values define who we are and how we serve you.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {values.map((value, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                whileHover={{ y: -10 }}
                                className="group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl border border-gray-100 transition-all duration-300 overflow-hidden"
                            >
                                {/* Hover Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                <div className="relative z-10">
                                    <div className={`w-14 h-14 ${value.gradient} bg-opacity-20 rounded-2xl flex items-center justify-center ${value.iconColor} mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                                        <value.icon size={28} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-2xl font-bold font-outfit text-gray-900 mb-4 group-hover:text-gray-800">{value.title}</h3>
                                    <p className="text-gray-600 font-inter leading-relaxed group-hover:text-gray-700">
                                        {value.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Interactive Stats - Dark Themed */}
            <div className="bg-[#171A21] text-white">
                <StatsSection stats={aboutStats} />
            </div>

            {/* Our Story Timeline - Premium Scroll Animation */}
            <TimelineSection steps={storySteps} />

            {/* CTA */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#0F1115]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center text-white">
                    <h2 className="text-4xl md:text-5xl font-bold font-outfit mb-8 leading-tight">Ready to experience <br />the future of finance?</h2>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="/contact" className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-all duration-300 transform hover:-translate-y-1 shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2">
                            Start the Conversation <ArrowRight size={20} />
                        </a>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function TimelineSection({ steps }) {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const scaleY = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <section ref={containerRef} className="py-32 px-6 relative bg-gray-50/50 overflow-hidden">
            <div className="max-w-5xl mx-auto relative z-10">
                <div className="text-center mb-24">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-bold tracking-[0.2em] text-blue-600 uppercase mb-3 block"
                    >
                        Our History
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-6xl font-black font-outfit text-gray-900 tracking-tight"
                    >
                        A Decade of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Innovation</span>
                    </motion.h2>
                </div>

                <div className="relative">
                    {/* Central Track - Subtle */}
                    <div className="absolute left-[28px] md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-[2px] bg-gray-200/60" />

                    {/* Animated Progress Bar */}
                    <motion.div
                        style={{ scaleY, transformOrigin: "top" }}
                        className="absolute left-[28px] md:left-1/2 transform md:-translate-x-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-0"
                    />

                    <div className="space-y-32">
                        {steps.map((step, index) => (
                            <TimelineItem key={index} step={step} index={index} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function TimelineItem({ step, index }) {
    const ref = useRef(null);
    const isEven = index % 2 === 0;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`flex flex-col md:flex-row items-center gap-12 ${isEven ? 'md:flex-row-reverse' : ''}`}
        >
            {/* Content Card */}
            <div className={`flex-1 w-full pl-20 md:pl-0 text-left ${isEven ? 'md:text-left' : 'md:text-right'} group`}>
                <div className={`relative z-10 ${!isEven ? 'md:flex md:flex-col md:items-end' : ''}`}>
                    <span className="inline-block text-6xl md:text-8xl font-black text-gray-100 absolute -top-10 -z-10 select-none transition-colors duration-500 group-hover:text-blue-50/80">
                        {step.year}
                    </span>

                    <div className="relative bg-white/60 backdrop-blur-sm p-8 rounded-2xl border border-gray-100/50 shadow-sm hover:shadow-xl hover:border-blue-100/50 transition-all duration-500 hover:-translate-y-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 font-outfit tracking-tight">{step.title}</h3>
                        <p className="text-gray-600 leading-relaxed font-inter text-lg">{step.description}</p>

                        {/* Decorative Year Tag */}
                        <div className={`absolute -top-3 ${isEven ? 'right-6' : 'right-6 md:left-6 md:right-auto'} bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg`}>
                            {step.year}
                        </div>
                    </div>
                </div>
            </div>

            {/* Central Node */}
            <div className="absolute left-[20px] md:left-1/2 transform md:-translate-x-1/2 flex items-center justify-center">
                <div className="w-[18px] h-[18px] bg-white rounded-full border-4 border-gray-200 z-10 transition-colors duration-500 group-hover:border-blue-500 shadow-sm" />

                {/* Pulsing effect when in view */}
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1.5, opacity: 0.2 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute w-12 h-12 bg-blue-500 rounded-full blur-md -z-0"
                />
            </div>

            <div className="flex-1 w-full hidden md:block" />
        </motion.div>
    );
}