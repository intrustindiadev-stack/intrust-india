'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplitAuth({
    imageSrc = '/login.png',
    brandLogo = '/icons/intrustLogo.png',
    brandName = 'INTRUST',
    title,
    children,
    imageSide = 'left',
    animateFrom = 'left',
}) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const t = requestAnimationFrame(() => setIsMounted(true));
        return () => cancelAnimationFrame(t);
    }, []);

    return (
        <section className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            {/* Main card container with fade-in-up animation */}
            <div
                className={`w-full max-w-6xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
            >
                <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-white grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">

                    {/* Image column - Hidden on mobile, visible on desktop */}
                    <div
                        className={`hidden lg:block relative transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMounted ? 'scale-100' : 'scale-105'
                            } ${imageSide === 'right' ? 'lg:order-2' : ''}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] opacity-90" />
                        <div className="absolute inset-0">
                            <Image
                                src={imageSrc}
                                alt="INTRUST Authentication"
                                fill
                                className="object-cover mix-blend-overlay"
                                priority
                            />
                        </div>

                        {/* Decorative overlay content */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center p-12 text-white">
                            <div className="max-w-md text-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Image src={brandLogo} alt="Logo" width={48} height={48} className="object-contain" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4 font-[family-name:var(--font-outfit)]">
                                    Welcome to {brandName}
                                </h2>
                                <p className="text-white/90 text-lg">
                                    Manage your finances smarter with our all-in-one platform
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form column */}
                    <div className={`relative p-6 sm:p-10 lg:p-12 flex flex-col justify-center ${imageSide === 'right' ? '' : 'lg:order-2'}`}>
                        <div
                            className={`transition-all duration-500 ease-out delay-200 ${isMounted ? 'opacity-100 translate-x-0' : (animateFrom === 'left' ? 'opacity-0 -translate-x-4' : 'opacity-0 translate-x-4')
                                }`}
                        >
                            {/* Mobile logo - Only visible on mobile */}
                            <div className="lg:hidden flex flex-col items-center mb-8">
                                <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center">
                                    <Image src={brandLogo} alt="Logo" width={40} height={40} className="object-contain" />
                                </div>
                                <span className="text-[#171A21] font-extrabold tracking-wide text-xl">
                                    {brandName}
                                </span>
                            </div>

                            {/* Desktop logo */}
                            <div className="hidden lg:flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#92BCEA] to-[#AFB3F7] flex items-center justify-center">
                                    <Image src={brandLogo} alt="Logo" width={28} height={28} className="object-contain" />
                                </div>
                                <span className="text-[#171A21] font-extrabold tracking-wide text-xl">
                                    {brandName}
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#171A21] mb-2 font-[family-name:var(--font-outfit)]">
                                {title}
                            </h1>
                            <p className="text-[#617073] mb-8">
                                Enter your details to continue
                            </p>

                            <div className="space-y-6">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
