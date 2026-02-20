'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import OffersCarousel from '@/components/home/OffersCarousel';
import StatsSection from '@/components/home/StatsSection';
import CTASection from '@/components/home/CTASection';
import { SlowProgressLoader } from '@/components/ui/InTrustProgressLoader';
import { TrendingUp, Sparkles, Star } from 'lucide-react';

import { useTheme } from '@/lib/contexts/ThemeContext';

export default function HomeClient() {

    const { theme } = useTheme();
    const [showLoader, setShowLoader] = useState(false);

    useEffect(() => {
        const hasVisited = sessionStorage.getItem('intrust_visited');
        if (!hasVisited) {
            setShowLoader(true);
            sessionStorage.setItem('intrust_visited', 'true');
        }
    }, []);

    const stats = [
        { value: '10K+', label: 'Active Users', icon: TrendingUp },
        { value: '₹50Cr+', label: 'Transactions', icon: Sparkles },
        { value: '4.9★', label: 'App Rating', icon: Star },
    ];

    return (
        <>
            {showLoader && (
                <SlowProgressLoader
                    onComplete={() => setShowLoader(false)}
                    message="Welcome to InTrust"
                />
            )}
            {!showLoader && (
                <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
                    <Navbar />
                    <HeroSection />
                    <OffersCarousel />
                    <StatsSection stats={stats} />
                    <CTASection />
                    <Footer />
                </div>
            )}
        </>
    );
}
