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
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Home() {
  const { t } = useLanguage();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Check if user has visited before in this session
    const hasVisited = sessionStorage.getItem('intrust_visited');

    if (!hasVisited) {
      setShowLoader(true);
      sessionStorage.setItem('intrust_visited', 'true');
    }
  }, []);

  const stats = [
    { value: '10K+', label: t('stats.users'), icon: TrendingUp },
    { value: '₹50Cr+', label: t('stats.transactions'), icon: Sparkles },
    { value: '4.9★', label: t('stats.rating'), icon: Star },
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
        <div className="min-h-screen bg-white">
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
