'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import ServicesGrid from '@/components/home/ServicesGrid';
import TrendingProducts from '@/components/home/TrendingProducts';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import SmartNFCSection from '@/components/home/SmartNFCSection';
import TrustBadgesStrip from '@/components/home/TrustBadgesStrip';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import { SlowProgressLoader } from '@/components/ui/InTrustProgressLoader';
import { useAuth } from '@/lib/contexts/AuthContext';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function HomeClient() {
    const { theme } = useTheme();
    const { isAuthenticated } = useAuth();
    const [showLoader, setShowLoader] = useState(false);

    useEffect(() => {
        const hasVisited = sessionStorage.getItem('intrust_visited');
        if (!hasVisited) {
            setShowLoader(true);
            sessionStorage.setItem('intrust_visited', 'true');
        }
    }, []);

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
                    <ServicesGrid />
                    <TrendingProducts />
                    <HowItWorksSection />
                    <SmartNFCSection />
                    <TrustBadgesStrip />
                    <TestimonialsSection />
                    <Footer />
                    {isAuthenticated && <CustomerBottomNav />}
                </div>
            )}
        </>
    );
}
