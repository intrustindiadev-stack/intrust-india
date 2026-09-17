'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Trophy, 
    Calendar as CalendarIcon, 
    Sparkles, 
    CheckCircle2, 
    XCircle, 
    ArrowRight, 
    BookOpen, 
    Globe, 
    Briefcase, 
    Cpu, 
    Film, 
    Coffee, 
    Plus, 
    Check, 
    AlertCircle, 
    Wallet, 
    X,
    ExternalLink,
    CreditCard,
    Volume2,
    VolumeX,
    Flame,
    Clock,
    ShoppingBag,
    Gift,
    Star,
    Share2,
    Copy
} from 'lucide-react';
import CashbackAnimationModal from '@/components/marketing/animations/CashbackAnimationModal';
import GiftBoxAnimationModal from '@/components/marketing/animations/GiftBoxAnimationModal';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import SabpaisaPaymentModal from '@/components/payment/SabpaisaPaymentModal';
import StreakRibbon from '@/components/marketing/challenge/StreakRibbon';
import StreakMilestoneModal from '@/components/marketing/challenge/StreakMilestoneModal';
import StreakShareCard from '@/components/marketing/challenge/StreakShareCard';
import { supabase } from '@/lib/supabaseClient';

// Zero-dependency Web Audio Sound Synthesizer for rich arcade tactile feedback
function playSound(type, soundEnabled = true) {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        
        if (type === 'correct') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
            osc2.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.28); // G5
            
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.start(ctx.currentTime);
            osc2.start(ctx.currentTime + 0.12);
            osc1.stop(ctx.currentTime + 0.12);
            osc2.stop(ctx.currentTime + 0.32);
        } else if (type === 'incorrect') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.22);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.22);
        } else if (type === 'victory') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.28);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.12);
                osc.stop(ctx.currentTime + i * 0.12 + 0.28);
            });
        }
    } catch (e) {
        // AudioContext not allowed before user gesture, safe to ignore
    }
}

export default function DailyChallengeClient({
    user,
    profile,
    merchant,
    isMerchant,
    categories,
    todaySponsor,
    todayPlay,
    existingSponsorships,
    merchantInventory,
    rewardsConfig
}) {
    // Mode: 'play' or 'sponsor' (only merchants can switch to 'sponsor')
    const [activeTab, setActiveTab] = useState('play');

    // Quiz Flow States
    const [quizStage, setQuizStage] = useState(todayPlay ? 'already_completed' : 'select_category'); // 'select_category', 'intro', 'questions', 'completed', 'already_completed'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [showCashbackModal, setShowCashbackModal] = useState(false);
    const [showGiftBoxModal, setShowGiftBoxModal] = useState(false);
    const [submittingQuiz, setSubmittingQuiz] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [timeLeft, setTimeLeft] = useState(20);
    const [showFloatingPoints, setShowFloatingPoints] = useState(false);
    const [copiedCoupon, setCopiedCoupon] = useState(false);

    // Dynamic Streak States
    const [streakData, setStreakData] = useState({
        streak: 1,
        highestStreak: 1,
        playedToday: !!todayPlay,
        freezesLeft: 1
    });
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);

    // Sponsorship Booking States (Merchant Only)
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [campaignMessage, setCampaignMessage] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'sabpaisa'
    const [showSabpaisaModal, setShowSabpaisaModal] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState(null);

    const dynamicReward = (rewardsConfig?.daily_challenge_reward_paise || 2500) / 100;
    const dynamicSponsorFee = (rewardsConfig?.sponsorship_fee_paise || 99900) / 100;

    // Icon map
    const categoryIcons = {
        'mythology-culture': BookOpen,
        'general-knowledge': Globe,
        'business-brands': Briefcase,
        'technology': Cpu,
        'sports': Trophy,
        'entertainment': Film,
        'food-lifestyle': Coffee
    };

    // Sample question pool fallback
    const sampleQuestions = useMemo(() => {
        return [
            {
                question: 'In the Ramayana, what was the divine bow of Lord Shiva broken by Sri Rama called?',
                options: ['Gandiva', 'Pinaka', 'Sharanga', 'Vijaya'],
                correct: 1,
                explanation: 'Pinaka was the celestial bow gifted by Lord Shiva to King Janaka of Mithila.'
            },
            {
                question: 'Who trained both the Pandavas and Kauravas in military arts in the Mahabharata?',
                options: ['Guru Dronacharya', 'Guru Vashistha', 'Guru Sandipani', 'Sage Vishwamitra'],
                correct: 0,
                explanation: 'Guru Dronacharya was the master archery and weaponry teacher for Hastinapur.'
            },
            {
                question: 'Which holy river is revered as the daughter of the Sun God (Suryaputri)?',
                options: ['Ganga', 'Yamuna', 'Godavari', 'Saraswati'],
                correct: 1,
                explanation: 'Yamuna is celebrated as the daughter of Surya and sister of Yama in tradition.'
            },
            {
                question: 'Which city in Madhya Pradesh is famous for the Great Sanchi Stupa built by Ashoka?',
                options: ['Indore', 'Bhopal', 'Raisen (near Bhopal)', 'Gwalior'],
                correct: 2,
                explanation: 'The ancient Sanchi Stupa is located in Raisen district, 45km from Bhopal.'
            },
            {
                question: 'Which company founded India’s first commercial airline in 1932?',
                options: ['Birla Group', 'Tata Group', 'Reliance', 'Wadia Group'],
                correct: 1,
                explanation: 'J.R.D. Tata founded Tata Airlines in 1932, later becoming Air India.'
            },
            {
                question: 'What does the Indian financial acronym UPI stand for?',
                options: ['Unified Payments Interface', 'Universal Payment Institution', 'United Portal of India', 'Uniform Pay Integration'],
                correct: 0,
                explanation: 'UPI stands for Unified Payments Interface, created by NPCI.'
            },
            {
                question: 'Which mission made India the 1st nation to touch down near the lunar south pole?',
                options: ['Mangalyaan', 'Chandrayaan-2', 'Chandrayaan-3', 'Aditya-L1'],
                correct: 2,
                explanation: 'Chandrayaan-3 successfully touched down on August 23, 2023.'
            },
            {
                question: 'In the epic Mahabharata, who narrated the battle live to King Dhritarashtra?',
                options: ['Vidura', 'Sanjaya', 'Kripacharya', 'Vyasa'],
                correct: 1,
                explanation: 'Sanjaya possessed divine vision (divya-drishti) to witness and recount the Kurukshetra war.'
            },
            {
                question: 'Which mountain served as the churning rod during the Samudra Manthan?',
                options: ['Mount Kailash', 'Mount Mandara', 'Mount Meru', 'Mount Vindhya'],
                correct: 1,
                explanation: 'Mount Mandara was placed in the cosmic ocean as the churning rod.'
            },
            {
                question: 'What is India’s official National Aquatic Animal?',
                options: ['Ganges River Dolphin', 'Olive Ridley Turtle', 'Gharial', 'Golden Mahseer'],
                correct: 0,
                explanation: 'The Ganges River Dolphin was declared the National Aquatic Animal in 2009.'
            }
        ];
    }, []);

    // Fetch user's persistent streak status
    useEffect(() => {
        supabase.rpc('get_user_quiz_streak').then(({ data, error }) => {
            if (data && data.success) {
                setStreakData({
                    streak: data.current_streak,
                    highestStreak: data.highest_streak,
                    playedToday: data.played_today,
                    freezesLeft: data.freezes_left
                });
            }
        }).catch((err) => console.error('Failed to load streak:', err));
    }, [todayPlay]);

    // 20-Second Per-Question Countdown Timer
    useEffect(() => {
        if (quizStage !== 'questions' || isAnswerSubmitted) return;

        setTimeLeft(20);
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quizStage, currentQuestionIndex, isAnswerSubmitted]);

    const handleTimeOut = () => {
        if (isAnswerSubmitted) return;
        setIsAnswerSubmitted(true);
        playSound('incorrect', soundEnabled);

        setTimeout(() => {
            if (currentQuestionIndex < sampleQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswerSubmitted(false);
            } else {
                finishQuiz();
            }
        }, 1800);
    };

    // Handle Option Selection in Quiz
    const handleSelectOption = (index) => {
        if (isAnswerSubmitted) return;
        setSelectedOption(index);
        setIsAnswerSubmitted(true);

        const currentQ = sampleQuestions[currentQuestionIndex];
        const isCorrect = index === currentQ.correct;

        if (isCorrect) {
            setScore(prev => prev + 1);
            playSound('correct', soundEnabled);
            setShowFloatingPoints(true);
            setTimeout(() => setShowFloatingPoints(false), 900);
        } else {
            playSound('incorrect', soundEnabled);
        }

        // Move to next question after 1.5 seconds
        setTimeout(() => {
            if (currentQuestionIndex < sampleQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswerSubmitted(false);
            } else {
                finishQuiz();
            }
        }, 1500);
    };

    // Finish Quiz & Submit to RPC
    const finishQuiz = async () => {
        setSubmittingQuiz(true);
        playSound('victory', soundEnabled);
        try {
            const finalScore = score + (selectedOption === sampleQuestions[currentQuestionIndex]?.correct ? 1 : 0);
            const { data } = await supabase.rpc('submit_daily_challenge', {
                p_category_id: selectedCategory?.id || 'c0000000-0000-0000-0000-000000000001',
                p_score: finalScore
            });

            if (data && data.success) {
                setCompletionResult(data);
                setStreakData(prev => ({
                    ...prev,
                    streak: data.current_streak,
                    highestStreak: data.highest_streak,
                    playedToday: true,
                    freezesLeft: data.freeze_used ? Math.max(0, prev.freezesLeft - 1) : prev.freezesLeft
                }));
                setShowStreakModal(true);
            } else {
                setShowCashbackModal(true);
            }
        } catch (e) {
            console.error('Error recording quiz play:', e);
            setShowCashbackModal(true);
        } finally {
            setSubmittingQuiz(false);
            setQuizStage('completed');
        }
    };

    // Sponsorship Calendar Generation (next 14 days)
    const calendarDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 1; i <= 14; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const booking = existingSponsorships.find(b => b.sponsor_date === dateStr && b.status !== 'cancelled');
            
            days.push({
                date: d,
                dateStr,
                dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
                dayNum: d.getDate(),
                monthName: d.toLocaleDateString('en-IN', { month: 'short' }),
                status: booking ? (booking.merchant_id === merchant?.id ? 'my_booking' : 'booked') : 'available'
            });
        }
        return days;
    }, [existingSponsorships, merchant?.id]);

    // Handle Sponsorship Booking
    const handleBookSponsorship = async () => {
        if (!selectedDate) {
            setBookingError('Please select an available date on the calendar.');
            return;
        }
        if (selectedProducts.length === 0) {
            setBookingError('Please select at least 1 product to showcase.');
            return;
        }

        if (paymentMethod === 'sabpaisa') {
            setShowSabpaisaModal(true);
            return;
        }

        // Wallet payment flow
        const merchantBal = merchant?.wallet_balance_paise || 0;
        if (merchantBal < dynamicSponsorFee * 100) {
            setBookingError(`Insufficient InTrust wallet balance (₹${(merchantBal/100).toFixed(2)}). Please switch to SabPaisa Gateway or top up your wallet.`);
            return;
        }

        setBookingLoading(true);
        setBookingError(null);
        try {
            const { data, error } = await supabase.rpc('book_daily_challenge_sponsorship', {
                p_sponsor_date: selectedDate.dateStr,
                p_product_ids: selectedProducts.map(p => p.id),
                p_campaign_message: campaignMessage,
                p_payment_method: 'wallet'
            });

            if (error || (data && !data.success)) {
                throw new Error(data?.message || error?.message || 'Failed to book sponsorship');
            }

            setBookingSuccess(true);
        } catch (err) {
            setBookingError(err.message);
        } finally {
            setBookingLoading(false);
        }
    };

    const handleSabpaisaSuccess = async (txnResult) => {
        setShowSabpaisaModal(false);
        setBookingLoading(true);
        setBookingError(null);
        try {
            const { data, error } = await supabase.rpc('book_daily_challenge_sponsorship', {
                p_sponsor_date: selectedDate.dateStr,
                p_product_ids: selectedProducts.map(p => p.id),
                p_campaign_message: campaignMessage,
                p_payment_method: 'sabpaisa',
                p_client_txn_id: txnResult?.clientTxnId || txnResult?.txnId || 'SABPAISA_' + Date.now()
            });

            if (error || (data && !data.success)) {
                throw new Error(data?.message || error?.message || 'Failed to finalize sponsorship booking');
            }

            setBookingSuccess(true);
        } catch (err) {
            setBookingError(err.message);
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header with Breadcrumbs & Role Tabs for Merchants */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <MarketingBreadcrumbs
                    customTitle="Daily Challenge & Quiz"
                    customSubtitle="Test your knowledge, earn instant cashbacks, and discover featured local merchants."
                />

                {/* Tabs for Merchants (Customers never see this switcher) */}
                {isMerchant && (
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
                        <button
                            onClick={() => setActiveTab('play')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                activeTab === 'play' 
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Play Challenge
                        </button>
                        <button
                            onClick={() => setActiveTab('sponsor')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                activeTab === 'sponsor' 
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Sponsor a Challenge
                        </button>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 1. PLAY CHALLENGE VIEW (Available to BOTH Customers and Merchants)        */}
            {/* ========================================================================= */}
            {activeTab === 'play' && (
                <div className="space-y-6">
                    {/* Live Dynamic Streak Tracker Ribbon */}
                    <StreakRibbon
                        currentStreak={streakData.streak}
                        highestStreak={streakData.highestStreak}
                        freezesLeft={streakData.freezesLeft}
                        playedToday={streakData.playedToday}
                    />

                    {/* VIP Official Merchant Sponsor Spotlight Banner */}
                    <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 shadow-md">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/40">
                                    <Sparkles size={12} className="animate-spin text-amber-500" />
                                    <span>Official Challenge Sponsor</span>
                                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                                        <Check size={11} strokeWidth={3} /> Verified Merchant
                                    </span>
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <span>{todaySponsor?.merchants?.business_name || "InTrust Partner Marketplace"}</span>
                                </h3>
                                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-2xl">
                                    "{todaySponsor?.campaign_message || "Discover pure, organically certified products and enjoy exclusive cashbacks on your purchases today."}"
                                </p>
                            </div>

                            {/* Merchant Upsell Action */}
                            {isMerchant && (
                                <button
                                    onClick={() => setActiveTab('sponsor')}
                                    className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                                >
                                    <span>Sponsor an Upcoming Date</span>
                                    <ArrowRight size={13} />
                                </button>
                            )}
                        </div>

                        {/* Sponsor Featured Products Showcase */}
                        {todaySponsor?.products && todaySponsor.products.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-800/60">
                                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2.5 flex items-center gap-1.5">
                                    <ShoppingBag size={12} />
                                    <span>Featured Products from {todaySponsor?.merchants?.business_name || 'Sponsor'}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                                    {todaySponsor.products.slice(0, 4).map((p) => (
                                        <a
                                            key={p.id}
                                            href={p.slug ? `/shop/product/${p.slug}` : '/shop'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group p-2.5 sm:p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/80 dark:border-amber-800/60 hover:border-amber-400 transition-all flex items-center gap-2.5 shadow-2xs hover:shadow-xs"
                                        >
                                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt={p.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <ShoppingBag size={16} className="text-amber-500" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h5 className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                                    {p.product_name}
                                                </h5>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">₹{p.price}</span>
                                                    {p.discount_percent && (
                                                        <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1 rounded">
                                                            {p.discount_percent}% OFF
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* State A: Category Selection */}
                    {quizStage === 'select_category' && (
                        <div className="space-y-6">
                            <div className="text-center max-w-lg mx-auto py-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-black uppercase mb-3 border border-amber-200/60 dark:border-amber-800">
                                    <Trophy size={14} />
                                    <span>Fixed ₹{dynamicReward} Cashback on Completion</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                    What do you want to play today?
                                </h2>
                                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    Select your preferred category. 10 questions to complete.
                                </p>
                            </div>

                            {/* Categories Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {categories.map((cat) => {
                                    const Icon = categoryIcons[cat.slug] || BookOpen;
                                    const isMythology = cat.slug === 'mythology-culture';
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setQuizStage('intro');
                                            }}
                                            className={`p-6 rounded-3xl text-left border transition-all hover:scale-[1.02] active:scale-95 shadow-2xs group flex flex-col justify-between ${
                                                isMythology
                                                    ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-300 dark:border-amber-700/60 hover:border-amber-500'
                                                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50'
                                            }`}
                                        >
                                            <div>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                                                    isMythology
                                                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800'
                                                }`}>
                                                    <Icon size={24} />
                                                </div>
                                                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                                                    {cat.title}
                                                </h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                                    {cat.description || 'Test your knowledge across curated Indian questions.'}
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                                                <span>10 Questions</span>
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* State B: Challenge Intro Modal / Card */}
                    {quizStage === 'intro' && (
                        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center">
                            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-4 border border-amber-500/20">
                                <Trophy size={40} />
                            </div>
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                {selectedCategory?.title || 'Daily Challenge'}
                            </span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 mb-1">
                                10 Questions. 1 Daily Challenge.
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                                Complete today's questions to instantly earn <strong className="text-emerald-600 dark:text-emerald-400 font-black">₹{dynamicReward} Cashback</strong> directly into your InTrust wallet.
                            </p>

                            <div className="space-y-2.5">
                                <button
                                    onClick={() => setQuizStage('questions')}
                                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 transition-all active:scale-95"
                                >
                                    Start Challenge →
                                </button>
                                <button
                                    onClick={() => setQuizStage('select_category')}
                                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
                                >
                                    Choose Another Category
                                </button>
                            </div>
                        </div>
                    )}

                    {/* State C: Active 10 Questions Loop */}
                    {quizStage === 'questions' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            {/* Quiz Control HUD: Streak, Timer, Audio & Progress */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between text-xs font-black">
                                    {/* Left: Question Counter & Streak */}
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                                            Question {currentQuestionIndex + 1} of {sampleQuestions.length}
                                        </span>
                                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black border border-orange-500/20">
                                            <Flame size={12} className="animate-bounce text-orange-500" />
                                            <span>{streakData.streak}-Day Streak</span>
                                        </div>
                                    </div>

                                    {/* Right: Score, Timer & Sound Mute Toggle */}
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black">
                                            <Star size={13} />
                                            <span>{score * 10} Pts</span>
                                        </div>

                                        {/* Dynamic Countdown Timer */}
                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border transition-all ${
                                            timeLeft <= 5 
                                                ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                                                : timeLeft <= 10 
                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                        }`}>
                                            <Clock size={11} />
                                            <span>{timeLeft}s</span>
                                        </div>

                                        {/* Sound Toggle */}
                                        <button
                                            type="button"
                                            onClick={() => setSoundEnabled(prev => !prev)}
                                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                                            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
                                        >
                                            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Animated Progress Bar */}
                                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                                        style={{ width: `${((currentQuestionIndex + 1) / sampleQuestions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Active Question Card */}
                            <motion.div
                                key={currentQuestionIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
                            >
                                {/* Floating +10 Points Animation */}
                                <AnimatePresence>
                                    {showFloatingPoints && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                            animate={{ opacity: 1, y: -20, scale: 1.15 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute top-4 right-6 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/30 flex items-center gap-1 z-20 pointer-events-none"
                                        >
                                            <Sparkles size={13} />
                                            <span>+10 PTS</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-6 leading-snug">
                                    {sampleQuestions[currentQuestionIndex].question}
                                </h3>

                                {/* Options */}
                                <div className="space-y-3">
                                    {sampleQuestions[currentQuestionIndex].options.map((opt, idx) => {
                                        const isSelected = selectedOption === idx;
                                        const isCorrect = sampleQuestions[currentQuestionIndex].correct === idx;
                                        let btnStyle = "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100";

                                        if (isAnswerSubmitted) {
                                            if (isCorrect) {
                                                btnStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black scale-[1.01]";
                                            } else if (isSelected && !isCorrect) {
                                                btnStyle = "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 animate-shake";
                                            }
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                disabled={isAnswerSubmitted}
                                                onClick={() => handleSelectOption(idx)}
                                                className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all flex items-center justify-between ${btnStyle}`}
                                            >
                                                <span>{opt}</span>
                                                {isAnswerSubmitted && isCorrect && (
                                                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                                                )}
                                                {isAnswerSubmitted && isSelected && !isCorrect && (
                                                    <XCircle size={18} className="text-rose-500 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation Banner */}
                                {isAnswerSubmitted && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-5 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-900 dark:text-blue-300"
                                    >
                                        💡 <strong className="font-extrabold">Cultural & Historical Fact:</strong> {sampleQuestions[currentQuestionIndex].explanation}
                                    </motion.div>
                                )}
                            </motion.div>
                        </div>
                    )}

                    {/* State D: Already Completed / Completion Screen */}
                    {(quizStage === 'completed' || quizStage === 'already_completed') && (
                        <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-500/20">
                                <Trophy size={44} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                    Challenge Complete!
                                </h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                    You solved {score || todayPlay?.score || 8} / 10 questions correctly.
                                </p>
                            </div>

                            {/* Reward Status Banner */}
                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                                <div className="text-left">
                                    <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-400">
                                        Reward Credited
                                    </span>
                                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                        + ₹{dynamicReward} Cashback
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-emerald-600">
                                    InTrust Wallet
                                </span>
                            </div>

                            {/* Dual Reward Unboxing Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowGiftBoxModal(true)}
                                    className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-md shadow-orange-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    <Gift size={15} />
                                    <span>Mystery Milestone Gift</span>
                                </button>
                                <button
                                    onClick={() => setShowCashbackModal(true)}
                                    className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    <Wallet size={15} />
                                    <span>View Wallet Credit</span>
                                </button>
                            </div>

                            {/* Special Sponsor Exclusive Discount Perk */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 text-left">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                                        Exclusive Sponsor Perk
                                    </span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                        15% OFF
                                    </span>
                                </div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                    {todaySponsor?.merchants?.business_name || "Nature's Basket Organic Store"}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 mb-3">
                                    {todaySponsor?.campaign_message || "Use code INTRUSTQUIZ at checkout to get an extra 15% discount on your order!"}
                                </p>
                                
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (typeof navigator !== 'undefined') {
                                                navigator.clipboard.writeText('INTRUSTQUIZ');
                                                setCopiedCoupon(true);
                                                setTimeout(() => setCopiedCoupon(false), 2000);
                                            }
                                        }}
                                        className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono text-xs font-black text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5"
                                    >
                                        {copiedCoupon ? <Check size={14} /> : <Copy size={14} />}
                                        <span>{copiedCoupon ? 'Coupon Copied!' : 'Code: INTRUSTQUIZ'}</span>
                                    </button>
                                    <a
                                        href="/shop"
                                        className="py-2 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black flex items-center gap-1 shrink-0"
                                    >
                                        <span>Shop Now</span>
                                        <ArrowRight size={12} />
                                    </a>
                                </div>
                            </div>

                            {/* Dynamic Streak Share & WhatsApp Card */}
                            <StreakShareCard
                                streak={streakData.streak}
                                score={score || todayPlay?.score || 8}
                                totalQuestions={sampleQuestions.length}
                                userName={user?.user_metadata?.full_name || 'I'}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. SPONSOR A CHALLENGE VIEW (Strictly for Merchants)                      */}
            {/* ========================================================================= */}
            {activeTab === 'sponsor' && isMerchant && (
                <div className="space-y-8">
                    {bookingSuccess ? (
                        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                                <Check size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                Date Booked Successfully!
                            </h2>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                Your brand and up to 4 selected products will be exclusively showcased to thousands of daily quiz players across India on {selectedDate?.dayNum} {selectedDate?.monthName}.
                            </p>
                            <button
                                onClick={() => {
                                    setBookingSuccess(false);
                                    setSelectedDate(null);
                                    setSelectedProducts([]);
                                }}
                                className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs"
                            >
                                Book Another Date
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Calendar & Booking Form */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Step 1: Select Date */}
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                            1
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Select an Available Date
                                        </h3>
                                    </div>

                                    {/* Date Status Legend */}
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            Available
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            Booked
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                            Your Booking
                                        </span>
                                    </div>

                                    {/* Calendar Strip */}
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                                        {calendarDays.map((day) => {
                                            const isSelected = selectedDate?.dateStr === day.dateStr;
                                            const isAvailable = day.status === 'available';
                                            return (
                                                <button
                                                    key={day.dateStr}
                                                    disabled={!isAvailable}
                                                    onClick={() => setSelectedDate(day)}
                                                    className={`p-3 rounded-2xl text-center border transition-all ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 font-black'
                                                            : isAvailable
                                                            ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 text-slate-800 dark:text-slate-200'
                                                            : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <div className="text-[10px] font-extrabold uppercase opacity-75">
                                                        {day.dayName}
                                                    </div>
                                                    <div className="text-lg font-black my-0.5">
                                                        {day.dayNum}
                                                    </div>
                                                    <div className="text-[10px] font-bold">
                                                        {day.monthName}
                                                    </div>
                                                    <div className="mt-1 text-[9px] font-extrabold">
                                                        {day.status === 'available' ? 'AVAILABLE' : day.status === 'my_booking' ? 'YOURS' : 'BOOKED'}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 2: Select Up to 4 Store Products */}
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                                2
                                            </div>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                                Select Up to 4 Store Products ({selectedProducts.length} / 4)
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Inventory list picker */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                                        {merchantInventory.length > 0 ? (
                                            merchantInventory.map((item) => {
                                                const isPicked = selectedProducts.some(p => p.id === item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => {
                                                            if (isPicked) {
                                                                setSelectedProducts(prev => prev.filter(p => p.id !== item.id));
                                                            } else if (selectedProducts.length < 4) {
                                                                setSelectedProducts(prev => [...prev, item]);
                                                            }
                                                        }}
                                                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                                            isPicked
                                                                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500'
                                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {item.product_name}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">₹{item.price}</span>
                                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                                                                isPicked ? 'bg-blue-600 text-white' : 'border border-slate-300'
                                                            }`}>
                                                                {isPicked && <Check size={12} />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-2 text-center py-4 text-xs text-slate-400 font-semibold">
                                                No inventory found in store. Using default featured store items.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 3: Campaign Message */}
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                            3
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Campaign Message (Optional)
                                        </h3>
                                    </div>
                                    <textarea
                                        value={campaignMessage}
                                        onChange={(e) => setCampaignMessage(e.target.value)}
                                        placeholder="e.g. Discover our fresh organic harvest & exclusive festival discounts!"
                                        rows={3}
                                        className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Pricing & Instant Checkout */}
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm sticky top-28">
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200">
                                        Sponsorship Checkout
                                    </span>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 mb-4">
                                        Daily Challenge Sponsorship
                                    </h3>

                                    <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        <div className="flex justify-between">
                                            <span>Selected Date</span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {selectedDate ? `${selectedDate.dayNum} ${selectedDate.monthName}` : 'Not selected'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Featured Products</span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {selectedProducts.length} Items
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Reach Guarantee</span>
                                            <span className="font-bold text-emerald-600">
                                                10,000+ Players
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Approval Type</span>
                                            <span className="font-bold text-blue-600">
                                                Instant Lock (No admin bottleneck)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Method Choice */}
                                    <div className="pt-3 pb-2 space-y-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                            Payment Method
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('wallet')}
                                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                                    paymentMethod === 'wallet'
                                                        ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-500 ring-1 ring-blue-500/30'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <Wallet size={16} className={paymentMethod === 'wallet' ? 'text-blue-600' : 'text-slate-400'} />
                                                    {paymentMethod === 'wallet' && <Check size={14} className="text-blue-600" />}
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">InTrust Wallet</span>
                                                <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                                                    ₹{((merchant?.wallet_balance_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('sabpaisa')}
                                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                                                    paymentMethod === 'sabpaisa'
                                                        ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-500 ring-1 ring-blue-500/30'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <CreditCard size={16} className={paymentMethod === 'sabpaisa' ? 'text-blue-600' : 'text-slate-400'} />
                                                    {paymentMethod === 'sabpaisa' && <Check size={14} className="text-blue-600" />}
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">SabPaisa Gateway</span>
                                                <span className="text-[10px] text-slate-500 font-bold mt-0.5">UPI, Cards, NetBank</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="py-4 flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                            Sponsorship Fee
                                        </span>
                                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                                            ₹{dynamicSponsorFee}
                                        </span>
                                    </div>

                                    {bookingError && (
                                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-semibold mb-4 flex items-center gap-2">
                                            <AlertCircle size={15} />
                                            <span>{bookingError}</span>
                                        </div>
                                    )}

                                    <button
                                        disabled={bookingLoading}
                                        onClick={handleBookSponsorship}
                                        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {bookingLoading ? 'Processing...' : paymentMethod === 'wallet' ? 'Pay via Wallet & Lock Date →' : 'Pay via SabPaisa Gateway →'}
                                    </button>

                                    <p className="text-[10px] text-slate-400 text-center mt-3">
                                        {paymentMethod === 'wallet' 
                                            ? 'Fee is deducted directly from your InTrust merchant wallet.' 
                                            : 'Secured with 256-bit bank encryption via SabPaisa payment gateway.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Cashback Animation Celebration Modal */}
            <CashbackAnimationModal
                isOpen={showCashbackModal}
                onClose={() => setShowCashbackModal(false)}
                cashbackAmount={dynamicReward}
                newBalance={525 + dynamicReward}
                source="Daily Challenge"
            />

            {/* Mystery Milestone Gift Box Modal */}
            <GiftBoxAnimationModal
                isOpen={showGiftBoxModal}
                onClose={() => setShowGiftBoxModal(false)}
                rewardTitle={`₹${dynamicReward} InTrust Cashback`}
                rewardDesc="Congratulations! You solved today's questions and unlocked your daily cashback milestone."
                rewardValue={dynamicReward}
            />

            {/* SabPaisa Payment Gateway Modal */}
            <SabpaisaPaymentModal
                isOpen={showSabpaisaModal}
                onClose={() => setShowSabpaisaModal(false)}
                amount={dynamicSponsorFee}
                user={user}
                productInfo={{
                    name: `Daily Challenge Sponsorship for ${selectedDate?.dayNum} ${selectedDate?.monthName}`,
                    price: dynamicSponsorFee,
                    id: 'sponsorship-' + selectedDate?.dateStr
                }}
                metadata={{
                    sponsor_date: selectedDate?.dateStr,
                    merchant_id: merchant?.id,
                    purpose: 'DAILY_CHALLENGE_SPONSORSHIP'
                }}
                onPaymentSuccess={handleSabpaisaSuccess}
            />

            {/* Daily Streak Celebration & Milestone Modal */}
            <StreakMilestoneModal
                isOpen={showStreakModal}
                onClose={() => setShowStreakModal(false)}
                streak={completionResult?.current_streak || streakData.streak}
                highestStreak={completionResult?.highest_streak || streakData.highestStreak}
                milestoneBonusPaise={completionResult?.milestone_bonus_paise || 0}
                milestoneBadge={completionResult?.milestone_badge || ''}
                totalCashbackPaise={completionResult?.total_cashback_paise || (dynamicReward * 100)}
                freezeUsed={completionResult?.freeze_used || false}
            />
        </div>
    );
}
