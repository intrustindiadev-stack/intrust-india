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
<<<<<<< HEAD
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function HomeClient() {
    const { t } = useLanguage();
    const [showLoader, setShowLoader] = useState(false);
=======
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function HomeClient() {
    const [showLoader, setShowLoader] = useState(false);
    const { theme } = useTheme();
>>>>>>> origin/yogesh-final

    useEffect(() => {
        const hasVisited = sessionStorage.getItem('intrust_visited');
        if (!hasVisited) {
            setShowLoader(true);
            sessionStorage.setItem('intrust_visited', 'true');
        }
    }, []);

    const stats = [
<<<<<<< HEAD
        { value: '10K+', label: t('stats.users'), icon: TrendingUp },
        { value: '₹50Cr+', label: t('stats.transactions'), icon: Sparkles },
        { value: '4.9★', label: t('stats.rating'), icon: Star },
=======
        { value: '10K+', label: 'Active Users', icon: TrendingUp },
        { value: '₹50Cr+', label: 'Transactions', icon: Sparkles },
        { value: '4.9★', label: 'User Rating', icon: Star },
>>>>>>> origin/yogesh-final
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
<<<<<<< HEAD
                <div className="min-h-screen bg-white">
=======
                <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
>>>>>>> origin/yogesh-final
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
