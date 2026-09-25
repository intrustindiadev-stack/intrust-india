'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// NOTE: the lazy sponsorship analytics chart lives in the sponsor history detail page.

const SPONSOR_EVENT_ENDPOINT = '/api/marketing/sponsor/analytics';
import Link from 'next/link';
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
    Copy,
    Award,
    Building2,
    ChevronRight,
    ChevronLeft,
    ArrowLeft,
    Store,
    Lock,
    Lightbulb,
    Receipt,
    Heart,
    Zap,
    BarChart3,
    CheckCheck
} from 'lucide-react';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import GuideInfoButton from '@/components/common/GuideInfoButton';

const CashbackAnimationModal = dynamic(() => import('@/components/marketing/animations/CashbackAnimationModal'), { ssr: false });
const GiftBoxAnimationModal = dynamic(() => import('@/components/marketing/animations/GiftBoxAnimationModal'), { ssr: false });
const SponsorshipCelebrationModal = dynamic(() => import('@/components/marketing/animations/SponsorshipCelebrationModal'), { ssr: false });
const SponsorshipAnalyticsChart = lazy(() => import('@/components/marketing/sponsor/SponsorshipAnalyticsChart'));
import StreakRibbon from '@/components/marketing/challenge/StreakRibbon';
import StreakMilestoneModal from '@/components/marketing/challenge/StreakMilestoneModal';
import QuizArena from '@/components/marketing/challenge/QuizArena';
import QuizResultsView from '@/components/marketing/challenge/QuizResultsView';
import QuizSponsorShowcase from '@/components/marketing/challenge/QuizSponsorShowcase';
import StreakShareCard from '@/components/marketing/challenge/StreakShareCard';
import PostQuizFlow from '@/components/marketing/challenge/PostQuizFlow';
import TrophyChampionVector from '@/components/marketing/graphics/TrophyChampionVector';
import { supabase } from '@/lib/supabaseClient';
import { trackSponsorImpressionOnce, trackSponsorEvent } from '@/lib/sponsorshipTracking';

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
        } else if (type === 'tap') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
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
    initialQuestions = [],
    initialStreak = {},
    streakConfig = {},
    todaySponsor,
    todayPlay,
    todayDateStr,
    secondsUntilMidnightIST = 0,
    initialCooldownSeconds = 0,
    isCooldownActive = false,
    existingSponsorships = [],
    merchantInventory = [],
    rewardsConfig = {},
    customerWalletBalancePaise = 0
}) {
    // Live wallet balance reactive to both merchant & customer wallets + live events
    const [liveWalletPaise, setLiveWalletPaise] = useState(
        Math.max(merchant?.wallet_balance_paise || 0, customerWalletBalancePaise || 0)
    );

    useEffect(() => {
        const handleWalletUpdated = (e) => {
            if (e.detail?.balance_paise !== undefined) {
                setLiveWalletPaise(Number(e.detail.balance_paise));
            }
        };
        window.addEventListener('walletBalanceUpdated', handleWalletUpdated);
        return () => window.removeEventListener('walletBalanceUpdated', handleWalletUpdated);
    }, []);

    // Mode: 'play' or 'sponsor' (only merchants can switch to 'sponsor')
    const [activeTab, setActiveTab] = useState('play');

    // 6-Hour Challenge Refresh & Reverse Timer States
    const initialCooldownVal = initialStreak?.cooldown_seconds_remaining || initialCooldownSeconds || 0;
    const initialOnCooldown = isCooldownActive || (initialCooldownVal > 0) || (initialStreak?.cooldown_active && initialCooldownVal > 0);

    const [cooldownSeconds, setCooldownSeconds] = useState(initialCooldownVal);
    const [onCooldown, setOnCooldown] = useState(initialOnCooldown);
    const [quizStage, setQuizStage] = useState(initialOnCooldown ? 'already_completed' : 'select_category'); // 'select_category', 'sponsor_showcase', 'questions', 'completed', 'already_completed'
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

    // Live Indian Standard Time (IST) Midnight Countdown State
    const [secondsToMidnight, setSecondsToMidnight] = useState(secondsUntilMidnightIST || 0);

    // Dynamic Streak States initialized from live DB RPC
    const [streakData, setStreakData] = useState({
        streak: Number(initialStreak?.current_streak || 0),
        highestStreak: Number(initialStreak?.highest_streak || 0),
        playedToday: !!initialStreak?.played_today,
        freezesLeft: initialStreak?.freezes_left ?? 1
    });
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);

    // Client-side 6-hour reverse timer local storage check on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && user?.id) {
            const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
            // Clear legacy 24-hour blocker key so users aren't locked out of 6-hour plays
            try {
                localStorage.removeItem(`intrust_daily_challenge_played_${user.id}_${todayIST}`);
            } catch (e) {}

            try {
                const unlockAtStr = localStorage.getItem(`intrust_quiz_unlock_${user.id}`);
                if (unlockAtStr) {
                    const unlockAt = parseInt(unlockAtStr, 10);
                    const remaining = Math.max(0, Math.floor((unlockAt - Date.now()) / 1000));
                    if (remaining > 0) {
                        setCooldownSeconds(remaining);
                        setOnCooldown(true);
                        setQuizStage('already_completed');
                    } else {
                        localStorage.removeItem(`intrust_quiz_unlock_${user.id}`);
                    }
                }
            } catch (err) {
                console.error('LocalStorage read error:', err);
            }
        }
    }, [user?.id]);

    // Live Reverse Countdown Timer: ticks down every second to unlock the quiz!
    useEffect(() => {
        if (!onCooldown || cooldownSeconds <= 0) return;

        const timer = setInterval(() => {
            setCooldownSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setOnCooldown(false);
                    // 6 hours elapsed! Automatically unlock quiz
                    if (typeof window !== 'undefined' && user?.id) {
                        try {
                            localStorage.removeItem(`intrust_quiz_unlock_${user.id}`);
                        } catch (e) {}
                    }
                    setQuizStage('select_category');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onCooldown, cooldownSeconds, user?.id]);

    // Format Reverse Countdown as HH:MM:SS
    const formattedReverseTimer = useMemo(() => {
        const totalSec = Math.max(0, cooldownSeconds);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, [cooldownSeconds]);

    // Percentage of 6-hour window elapsed for progress bar
    const cooldownPercentElapsed = useMemo(() => {
        const totalDuration = 6 * 3600; // 21,600 seconds
        const remaining = Math.min(totalDuration, Math.max(0, cooldownSeconds));
        return Math.min(100, Math.max(0, Math.round(((totalDuration - remaining) / totalDuration) * 100)));
    }, [cooldownSeconds]);

    // Answer feedback overlay state for front-of-screen right/wrong popups
    const [answerFeedback, setAnswerFeedback] = useState(null);

    // Post-game one-by-one sponsored products showcase index & hover pause state
    const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
    const [isShowcasePaused, setIsShowcasePaused] = useState(false);

    // Social Sharing, Clipboard & Exit States
    const [shareCopied, setShareCopied] = useState(false);
    const [copiedProductId, setCopiedProductId] = useState(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // Sponsorship Booking States (Merchant Only)
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [campaignMessage, setCampaignMessage] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' | 'sabpaisa'
    const [showSabpaisaModal, setShowSabpaisaModal] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [sponsorshipResult, setSponsorshipResult] = useState(null);
    const [bookingError, setBookingError] = useState(null);

    const dynamicReward = (rewardsConfig?.daily_challenge_reward_paise || 2500) / 100;
    const dynamicSponsorFee = (rewardsConfig?.sponsorship_fee_paise || 99900) / 100;

    // Live countdown timer ticking down to 12:00:00 AM IST midnight
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsToMidnight(prev => {
                if (prev <= 1) {
                    // 12:00 AM IST turnover! Re-fetch streak
                    supabase.rpc('get_user_quiz_streak').then(({ data }) => {
                        if (data) {
                            setStreakData({
                                streak: data.current_streak,
                                highestStreak: data.highest_streak,
                                playedToday: data.played_today,
                                freezesLeft: data.freezes_left
                            });
                        }
                    }).catch(console.error);
                    return 86400;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedTimeUntilMidnight = useMemo(() => {
        const h = Math.floor(secondsToMidnight / 3600);
        const m = Math.floor((secondsToMidnight % 3600) / 60);
        const s = secondsToMidnight % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, [secondsToMidnight]);

    const formattedTodayDate = useMemo(() => {
        try {
            const d = new Date();
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return 'Today';
        }
    }, []);

    // Speech Synthesis reader for questions & options
    const speakText = (text, e) => {
        if (e) e.stopPropagation();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.lang = 'en-IN';
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.warn('Speech synthesis error:', err);
            }
        }
    };

    // Share results handler
    const handleShareResults = async () => {
        const totalQ = activeQuestions?.length || 10;
        const accuracy = Math.round((score / totalQ) * 100);
        const rewardText = completionResult?.reward_paise 
            ? (completionResult.reward_paise / 100).toFixed(2) 
            : (todayPlay?.cashback_awarded_paise ? (todayPlay.cashback_awarded_paise / 100).toFixed(2) : dynamicReward.toFixed(2));
        
        const shareMessageBody = `🎯 I'm in the top 0.1% of InTrust Daily Quiz Learners!\n\n` +
            `📊 Score: ${score}/${totalQ} (${accuracy}% Accuracy)\n` +
            `🔥 Current Streak: ${streakData.streak} Days\n` +
            `⚡ Instant Cashback Won: ₹${rewardText}\n\n` +
            `Test your knowledge, play daily trivia, and earn real wallet cash on InTrust:`;
        
        const challengeUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://intrustindia.com'}/marketing/daily-challenge`;
        const fullShareMessage = `${shareMessageBody}\n${challengeUrl}`;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: "InTrust Daily Challenge Results",
                    text: shareMessageBody,
                    url: challengeUrl
                });
                return;
            } catch (e) {
                // fallback
            }
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(fullShareMessage);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2500);
                return;
            } catch (e) {
                // fallback
            }
        }

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    // Share product deal handler
    const handleShareProductDeal = async (product, e) => {
        if (e) e.stopPropagation();
        const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://intrustindia.com'}${product.slug ? `/shop/product/${product.slug}` : '/shop'}`;
        const dealTextBody = `🔥 Special Deal from ${todaySponsor?.merchants?.business_name || 'InTrust'}!\n\n🛍️ ${product.product_name} at only ₹${product.price}!\nGet authentic quality and instant cashback.`;
        const fullDealMessage = `${dealTextBody}\n\nShop here: ${shareUrl}`;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: product.product_name,
                    text: dealTextBody,
                    url: shareUrl
                });
                return;
            } catch (e) {}
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(fullDealMessage);
                setCopiedProductId(product.id || product.product_id);
                setTimeout(() => setCopiedProductId(null), 2500);
                return;
            } catch (e) {}
        }

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullDealMessage)}`;
        window.open(waUrl, '_blank');
    };

    // Auto-advance post-quiz showcase every 4 seconds (pauses when hovered)
    useEffect(() => {
        if (quizStage !== 'sponsored_showcase' || !todaySponsor?.products || todaySponsor.products.length <= 1 || isShowcasePaused) return;
        const interval = setInterval(() => {
            setActiveShowcaseIndex(prev => (prev + 1) % todaySponsor.products.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [quizStage, todaySponsor?.products, isShowcasePaused]);

    // Theme & Icon configuration for all 8 categories
    const categoryThemeMap = {
        'mythology-culture': {
            icon: BookOpen,
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            border: 'border-amber-200/80 dark:border-amber-800/60',
            badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
            gradient: 'from-amber-500/10 via-orange-500/5 to-transparent'
        },
        'general-knowledge': {
            icon: Globe,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            border: 'border-blue-200/80 dark:border-blue-800/60',
            badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
            gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent'
        },
        'business-brands': {
            icon: Briefcase,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-950/40',
            border: 'border-purple-200/80 dark:border-purple-800/60',
            badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
            gradient: 'from-purple-500/10 via-violet-500/5 to-transparent'
        },
        'technology': {
            icon: Cpu,
            color: 'text-cyan-500',
            bg: 'bg-cyan-50 dark:bg-cyan-950/40',
            border: 'border-cyan-200/80 dark:border-cyan-800/60',
            badgeBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
            gradient: 'from-cyan-500/10 via-teal-500/5 to-transparent'
        },
        'sports': {
            icon: Trophy,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            border: 'border-emerald-200/80 dark:border-emerald-800/60',
            badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
            gradient: 'from-emerald-500/10 via-green-500/5 to-transparent'
        },
        'entertainment': {
            icon: Film,
            color: 'text-rose-500',
            bg: 'bg-rose-50 dark:bg-rose-950/40',
            border: 'border-rose-200/80 dark:border-rose-800/60',
            badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
            gradient: 'from-rose-500/10 via-pink-500/5 to-transparent'
        },
        'food-lifestyle': {
            icon: Coffee,
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-950/40',
            border: 'border-orange-200/80 dark:border-orange-800/60',
            badgeBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
            gradient: 'from-orange-500/10 via-amber-500/5 to-transparent'
        },
        'enterprise': {
            icon: Building2,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
            border: 'border-indigo-200/80 dark:border-indigo-800/60',
            badgeBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
            gradient: 'from-indigo-500/10 via-blue-500/5 to-transparent'
        }
    };

    // Category-specific high-quality fallback questions for all 8 categories
    const categorySampleQuestions = useMemo(() => ({
        'general-knowledge': [
            {
                question: 'What is India\'s official National Aquatic Animal?',
                options: ['Ganges River Dolphin', 'Olive Ridley Turtle', 'Gharial', 'Golden Mahseer'],
                correct: 0,
                explanation: 'The Ganges River Dolphin was declared India\'s National Aquatic Animal in 2009.'
            },
            {
                question: 'Which city in Madhya Pradesh is globally acclaimed for the Great Buddhist Stupa built by Ashoka?',
                options: ['Ujjain', 'Sanchi', 'Khajuraho', 'Mandu'],
                correct: 1,
                explanation: 'The Great Stupa at Sanchi is a UNESCO World Heritage site dating to the 3rd century BCE.'
            },
            {
                question: 'Which pass connects the Kullu Valley with the Lahaul and Spiti Valleys in Himachal Pradesh?',
                options: ['Zoji La', 'Nathu La', 'Rohtang Pass', 'Shipki La'],
                correct: 2,
                explanation: 'Rohtang Pass at 3,978 m connects Kullu with Lahaul and Spiti valleys.'
            },
            {
                question: 'Who was the first Chief Election Commissioner of Independent India?',
                options: ['Sukumar Sen', 'T.N. Seshan', 'K.V.K. Sundaram', 'Dr. Nagendra Singh'],
                correct: 0,
                explanation: 'Sukumar Sen conducted India\'s first two general elections in 1952 and 1957.'
            },
            {
                question: 'What do the 24 spokes of the Ashoka Chakra represent on the Indian National Flag?',
                options: ['24 States', '24 Virtues / Continuous progress', '24 Rulers', '24 Seasons'],
                correct: 1,
                explanation: 'The 24 spokes of the Dharma Chakra represent the 24 eternal virtues and ceaseless righteousness.'
            },
            {
                question: 'Which is the highest mountain peak situated entirely within Indian territory?',
                options: ['K2', 'Kangchenjunga', 'Nanda Devi', 'Kamet'],
                correct: 2,
                explanation: 'Nanda Devi (7,816 m) in Uttarakhand is the highest peak located entirely within India.'
            },
            {
                question: 'Who is revered as the Chief Architect of the Constitution of India?',
                options: ['Jawaharlal Nehru', 'Dr. B.R. Ambedkar', 'Dr. Rajendra Prasad', 'Sardar Patel'],
                correct: 1,
                explanation: 'Dr. B.R. Ambedkar chaired the Drafting Committee of the Constituent Assembly.'
            },
            {
                question: 'Which Indian state has the longest mainland coastline in India?',
                options: ['Maharashtra', 'Tamil Nadu', 'Gujarat', 'Andhra Pradesh'],
                correct: 2,
                explanation: 'Gujarat has the longest mainland coastline in India spanning approximately 1,600 km.'
            },
            {
                question: 'What is the national motto of India inscribed below the National Emblem?',
                options: ['Satyameva Jayate', 'Vande Mataram', 'Jai Jawan Jai Kisan', 'Vasudhaiva Kutumbakam'],
                correct: 0,
                explanation: 'Satyameva Jayate (\'Truth alone triumphs\') is taken from the Mundaka Upanishad.'
            },
            {
                question: 'In which national park was Project Tiger first launched in India in 1973?',
                options: ['Kaziranga', 'Jim Corbett', 'Ranthambore', 'Kanha'],
                correct: 1,
                explanation: 'Project Tiger was officially inaugurated at Jim Corbett National Park in April 1973.'
            }
        ],
        'business-brands': [
            {
                question: 'Which pioneering conglomerate founded India\'s first commercial airline in 1932?',
                options: ['Birla Group', 'Tata Group', 'Wadia Group', 'Godrej Group'],
                correct: 1,
                explanation: 'J.R.D. Tata founded Tata Airlines in 1932, later becoming Air India.'
            },
            {
                question: 'What does the revolutionary financial acronym UPI stand for in India?',
                options: ['Unified Payments Interface', 'Universal Payment Integration', 'United Payments Institution', 'Uniform Pay Infrastructure'],
                correct: 0,
                explanation: 'UPI stands for Unified Payments Interface, created by NPCI in 2016.'
            },
            {
                question: 'Which beloved Indian dairy cooperative was founded in 1946 with the \'Taste of India\' tagline?',
                options: ['Mother Dairy', 'Amul', 'Nandini', 'Vita'],
                correct: 1,
                explanation: 'Amul was founded in Anand, Gujarat, sparking India\'s White Revolution.'
            },
            {
                question: 'Which Indian tech giant was co-founded by N.R. Narayana Murthy and six engineers in 1981?',
                options: ['Wipro', 'TCS', 'Infosys', 'HCL Technologies'],
                correct: 2,
                explanation: 'Infosys was founded in 1981 with an initial capital of â‚¹10,000.'
            },
            {
                question: 'Which historic biscuit brand, known for its yellow packaging, is one of the world\'s bestsellers?',
                options: ['Britannia Marie', 'Parle-G', 'Sunfeast Bounce', 'Priya Gold'],
                correct: 1,
                explanation: 'Parle-G, launched in 1939, has been recognized repeatedly as the world\'s bestselling biscuit.'
            },
            {
                question: 'Who made history as the first female Chairperson of the State Bank of India (SBI) in 2013?',
                options: ['Chanda Kochhar', 'Arundhati Bhattacharya', 'Shikha Sharma', 'Naina Lal Kidwai'],
                correct: 1,
                explanation: 'Arundhati Bhattacharya was the first woman to lead SBI in 2013.'
            },
            {
                question: 'Which Indian e-commerce company was founded by Sachin Bansal and Binny Bansal in 2007?',
                options: ['Snapdeal', 'Flipkart', 'Myntra', 'ShopClues'],
                correct: 1,
                explanation: 'Flipkart began in 2007 as an online bookstore before expanding to a mega-marketplace.'
            },
            {
                question: 'Which iconic Indian automotive pioneer launched the world\'s most affordable car, the \'Nano\', in 2008?',
                options: ['Mahindra', 'Tata Motors', 'Maruti Suzuki', 'Bajaj Auto'],
                correct: 1,
                explanation: 'Tata Motors unveiled the Nano in 2008 under the visionary leadership of Ratan Tata.'
            },
            {
                question: 'Which Indian automotive manufacturer created the iconic \'Scorpio\' and \'Thar\' SUVs?',
                options: ['Tata Motors', 'Mahindra & Mahindra', 'Maruti Suzuki', 'Force Motors'],
                correct: 1,
                explanation: 'Mahindra & Mahindra launched the Scorpio in 2002, revolutionizing Indian SUVs.'
            },
            {
                question: 'What was the first iconic instant noodles brand launched in India in 1983?',
                options: ['Top Ramen', 'Maggi', 'Yippee', 'Wai Wai'],
                correct: 1,
                explanation: 'NestlÃ© launched Maggi 2-Minute Noodles in India in 1983.'
            }
        ],
        'technology': [
            {
                question: 'Which space mission made India the first nation to soft-land near the lunar south pole in 2023?',
                options: ['Mangalyaan-1', 'Chandrayaan-2', 'Chandrayaan-3', 'Aditya-L1'],
                correct: 2,
                explanation: 'Chandrayaan-3 touched down near the lunar south pole on August 23, 2023.'
            },
            {
                question: 'What is India\'s indigenous satellite navigation system equivalent to GPS called?',
                options: ['GAGAN', 'NavIC', 'BHUVAN', 'ASTROSAT'],
                correct: 1,
                explanation: 'NavIC (Navigation with Indian Constellation) is operated by ISRO.'
            },
            {
                question: 'Which electronic toll collection technology in India utilizes passive RFID stickers?',
                options: ['FASTag', 'UPI Toll', 'RFID Bharat', 'QuickPass'],
                correct: 0,
                explanation: 'FASTag uses RFID technology linked directly to prepaid accounts or wallets.'
            },
            {
                question: 'What is the name of India\'s AI supercomputer installed at C-DAC Pune?',
                options: ['PARAM Shivay', 'AIRAWAT', 'Pratyush', 'Mihir'],
                correct: 1,
                explanation: 'AIRAWAT was ranked among the top global AI supercomputers in 2023.'
            },
            {
                question: 'What is the world\'s largest biometric digital identity platform implemented in India?',
                options: ['DigiLocker', 'Aadhaar', 'e-Pramaan', 'Jan Dhan'],
                correct: 1,
                explanation: 'Aadhaar is a 12-digit unique identity number backed by biometric data.'
            },
            {
                question: 'Which programming language created by Guido van Rossum is the standard for AI & ML?',
                options: ['Java', 'C++', 'Python', 'Rust'],
                correct: 2,
                explanation: 'Python\'s simplicity and rich AI libraries (PyTorch, TensorFlow) make it the global standard.'
            },
            {
                question: 'In telecommunications, what does the technology acronym \'VoLTE\' stand for?',
                options: ['Voice over Long-Term Evolution', 'Variable Line Termination', 'Virtual Low Traffic', 'Verified Transmission'],
                correct: 0,
                explanation: 'VoLTE enables HD voice calling over 4G LTE packet data networks.'
            },
            {
                question: 'Which solar observatory was launched by ISRO in September 2023 to Lagrange Point 1?',
                options: ['Surya-1', 'Aditya-L1', 'Helios-Bharat', 'Divya-Chakshu'],
                correct: 1,
                explanation: 'Aditya-L1 was placed in halo orbit at L1, ~1.5 million km from Earth.'
            },
            {
                question: 'Which decentralized database technology forms the basis of cryptocurrencies?',
                options: ['Quantum Key', 'Blockchain', 'Cloud Computing', 'Mesh Network'],
                correct: 1,
                explanation: 'Blockchain is a cryptographically secured, decentralized, distributed record system.'
            },
            {
                question: 'Which platform allows Indian citizens to store authentic digital licenses and mark sheets?',
                options: ['Umang', 'DigiLocker', 'MyGov', 'BHIM'],
                correct: 1,
                explanation: 'DigiLocker provides secure digital storage of documents issued by government bodies.'
            }
        ],
        'sports': [
            {
                question: 'Who is the only cricketer in international history to score 100 international centuries?',
                options: ['Virat Kohli', 'Sachin Tendulkar', 'Ricky Ponting', 'Brian Lara'],
                correct: 1,
                explanation: 'Sachin Tendulkar scored 51 Test centuries and 49 ODI centuries.'
            },
            {
                question: 'In which year did the Indian Men\'s Cricket Team win their historic first ICC World Cup?',
                options: ['1975', '1979', '1983', '1987'],
                correct: 2,
                explanation: 'Kapil Dev led India to victory against the West Indies at Lord\'s on June 25, 1983.'
            },
            {
                question: 'Who won India\'s first Olympic track and field gold medal in Javelin Throw at Tokyo 2020?',
                options: ['Abhinav Bindra', 'Neeraj Chopra', 'Milkha Singh', 'PT Usha'],
                correct: 1,
                explanation: 'Neeraj Chopra threw 87.58 m in Tokyo to secure India\'s historic first athletics gold.'
            },
            {
                question: 'How many Olympic Gold Medals has the Indian Men\'s Field Hockey Team won in history?',
                options: ['6', '8', '10', '12'],
                correct: 1,
                explanation: 'India has won 8 Olympic Gold medals in field hockey between 1928 and 1980.'
            },
            {
                question: 'Which Indian chess prodigy became the youngest-ever challenger to the World Championship in 2024?',
                options: ['R Praggnanandhaa', 'D Gukesh', 'Viswanathan Anand', 'Arjun Erigaisi'],
                correct: 1,
                explanation: 'D Gukesh won the FIDE Candidates 2024 in Toronto at age 17.'
            },
            {
                question: 'Who was the first Indian woman to win an Olympic medal in badminton at London 2012?',
                options: ['PV Sindhu', 'Saina Nehwal', 'Jwala Gutta', 'Ashwini Ponnappa'],
                correct: 1,
                explanation: 'Saina Nehwal won bronze in Women\'s Singles Badminton at London 2012.'
            },
            {
                question: 'In Kabaddi, what is the maximum duration in seconds allowed for a single raid?',
                options: ['20 seconds', '30 seconds', '40 seconds', '45 seconds'],
                correct: 1,
                explanation: 'Under standard rules, each raid is limited to a maximum of 30 seconds.'
            },
            {
                question: 'Which Indian woman boxer won an unprecedented six World Amateur Boxing gold medals?',
                options: ['Mary Kom', 'Lovlina Borgohain', 'Nikhat Zareen', 'Sarita Devi'],
                correct: 0,
                explanation: 'MC Mary Kom achieved the world record by winning six world championship titles.'
            },
            {
                question: 'Which franchise won the inaugural edition of the Indian Premier League (IPL) in 2008?',
                options: ['CSK', 'Rajasthan Royals', 'Mumbai Indians', 'KKR'],
                correct: 1,
                explanation: 'Rajasthan Royals won the inaugural 2008 IPL trophy under Shane Warne.'
            },
            {
                question: 'Which legendary Indian track sprinter was globally known as \'The Flying Sikh\'?',
                options: ['Milkha Singh', 'Gurbachan Randhawa', 'Pargat Singh', 'Dhyan Chand'],
                correct: 0,
                explanation: 'Milkha Singh was bestowed the title by Pakistan\'s President Ayub Khan in 1960.'
            }
        ],
        'entertainment': [
            {
                question: 'Which song from the film RRR won the Academy Award (Oscar) for Best Original Song in 2023?',
                options: ['Jai Ho', 'Naatu Naatu', 'Chaiyya Chaiyya', 'Kesariya'],
                correct: 1,
                explanation: '\'Naatu Naatu\', composed by M.M. Keeravani, was the first Indian film song to win an Oscar.'
            },
            {
                question: 'Who directed the landmark Indian masterpiece \'Pather Panchali\' (1955)?',
                options: ['Guru Dutt', 'Satyajit Ray', 'Ritwik Ghatak', 'Mrinal Sen'],
                correct: 1,
                explanation: 'Satyajit Ray\'s debut film won the Best Human Document award at Cannes in 1956.'
            },
            {
                question: 'What is the highest award in Indian cinema presented by the Government of India?',
                options: ['Filmfare Lifetime', 'Dadasaheb Phalke Award', 'National Laurel', 'Sangeet Natak'],
                correct: 1,
                explanation: 'The Dadasaheb Phalke Award honors lifetime contributions to Indian cinema.'
            },
            {
                question: 'Which longest-running television quiz show in India has been hosted by Amitabh Bachchan since 2000?',
                options: ['Kaun Banega Crorepati', 'Dus Ka Dum', 'Kamzor Kadii', 'Kya Aap Paanchvi Pass'],
                correct: 0,
                explanation: 'Kaun Banega Crorepati (KBC) debuted in July 2000 and transformed Indian TV.'
            },
            {
                question: 'What was the title of the first full-length Indian silent feature film released in 1913?',
                options: ['Alam Ara', 'Raja Harishchandra', 'Kisan Kanya', 'Ayodhyecha Raja'],
                correct: 1,
                explanation: 'Dadasaheb Phalke produced and directed \'Raja Harishchandra\', released in May 1913.'
            },
            {
                question: 'Which was the first Indian sound film (talkie) released in 1931?',
                options: ['Raja Harishchandra', 'Alam Ara', 'Achhut Kanya', 'Chandidas'],
                correct: 1,
                explanation: 'Ardeshir Irani directed \'Alam Ara\', which premiered in Mumbai on March 14, 1931.'
            },
            {
                question: 'Who is celebrated globally as the \'Mozart of Madras\' for his film scores?',
                options: ['Ilaiyaraaja', 'A.R. Rahman', 'R.D. Burman', 'M.M. Keeravani'],
                correct: 1,
                explanation: 'A.R. Rahman won two Oscars, two Grammys, and a BAFTA for Slumdog Millionaire.'
            },
            {
                question: 'Which classical dance form from Kerala is renowned for its elaborate makeup (Vesham)?',
                options: ['Bharatanatyam', 'Kathakali', 'Kathak', 'Odissi'],
                correct: 1,
                explanation: 'Kathakali is renowned for stylized makeup, costume, and dramatic eye expressions.'
            },
            {
                question: 'Who directed the monumental pan-Indian blockbuster franchise \'Baahubali\'?',
                options: ['Prashanth Neel', 'S.S. Rajamouli', 'Sukumar', 'Shankar'],
                correct: 1,
                explanation: 'S.S. Rajamouli directed Baahubali: The Beginning and Baahubali 2: The Conclusion.'
            },
            {
                question: 'Which classical Indian stringed instrument is synonymous with maestro Pandit Ravi Shankar?',
                options: ['Sarod', 'Sitar', 'Veena', 'Santoor'],
                correct: 1,
                explanation: 'Pandit Ravi Shankar popularized the sitar and Indian classical music worldwide.'
            }
        ],
        'food-lifestyle': [
            {
                question: 'Which Indian spice, historically termed \'Black Gold\', drove ancient trade routes?',
                options: ['Cardamom', 'Black Pepper', 'Clove', 'Cinnamon'],
                correct: 1,
                explanation: 'Black pepper from Kerala\'s Malabar Coast was ancient India\'s prized spice trade export.'
            },
            {
                question: 'Which Indian state produces over 50% of the country\'s tea in the Brahmaputra valley?',
                options: ['Assam', 'Kerala', 'Himachal Pradesh', 'Tamil Nadu'],
                correct: 0,
                explanation: 'Assam produces over half of India\'s tea, prized for its malty flavor and deep body.'
            },
            {
                question: 'Which fragrant long-grain rice with protected GI status originates in Himalayan foothills?',
                options: ['Sona Masoori', 'Basmati Rice', 'Gobindobhog', 'Jeera Samba'],
                correct: 1,
                explanation: 'Basmati, meaning \'fragrant\' in Sanskrit, is cultivated in the Indo-Gangetic plains.'
            },
            {
                question: 'What is the traditional fermented south Indian steamed breakfast made from rice & urad dal?',
                options: ['Poha', 'Idli', 'Dhokla', 'Upma'],
                correct: 1,
                explanation: 'Idlis are light, easily digestible fermented steamed cakes beloved across India.'
            },
            {
                question: 'Which golden spice contains the therapeutic compound \'Curcumin\', praised in Ayurveda?',
                options: ['Ginger', 'Turmeric (Haldi)', 'Saffron (Kesar)', 'Fenugreek (Methi)'],
                correct: 1,
                explanation: 'Turmeric contains curcumin, an effective natural antioxidant and anti-inflammatory.'
            },
            {
                question: 'What is the traditional cooling buttermilk drink seasoned with roasted cumin in India?',
                options: ['Chaas', 'Aam Panna', 'Kahwa', 'Thandai'],
                correct: 0,
                explanation: 'Chaas is a refreshing probiotic beverage seasoned with roasted cumin and rock salt.'
            },
            {
                question: 'Which Indian city is internationally celebrated for its GI-tagged authentic \'Dum\' Biryani?',
                options: ['Lucknow', 'Hyderabad', 'Kolkata', 'Bhopal'],
                correct: 1,
                explanation: 'Hyderabadi Dum Biryani combines basmati rice and marinated spices cooked over slow heat.'
            },
            {
                question: 'Which town in Jammu & Kashmir is famous as the \'Saffron Capital of India\'?',
                options: ['Pampore', 'Gulmarg', 'Pahalgam', 'Sonamarg'],
                correct: 0,
                explanation: 'Pampore produces GI-tagged Kashmir saffron known for its intense aroma.'
            },
            {
                question: 'What is the royal Rajasthani dish consisting of baked wheat balls, lentils, and sweet cereal?',
                options: ['Makki di Roti', 'Dal Baati Churma', 'Litti Chokha', 'Thepla'],
                correct: 1,
                explanation: 'Dal Baati Churma is a signature royal Rajasthani meal served with pure cow ghee.'
            },
            {
                question: 'In Ayurveda, which three medicinal fruits combine to form the renowned formula \'Triphala\'?',
                options: ['Amalaki, Bibhitaki, Haritaki', 'Tulsi, Neem, Giloy', 'Ashwagandha, Shatavari, Brahmi', 'Ginger, Pepper, Pippali'],
                correct: 0,
                explanation: 'Triphala comprises Amla, Bibhitaki, and Haritaki, revered for digestion and longevity.'
            }
        ],
        'enterprise': [
            {
                question: 'What does the economic abbreviation \'MSME\' stand for in Indian industrial policy?',
                options: ['Micro, Small and Medium Enterprises', 'Modern System of Manufacturing', 'Macro State Merchant Enterprises', 'Mega Scale Machinery Exporters'],
                correct: 0,
                explanation: 'MSMEs contribute over 30% of India\'s GDP and nearly 45% of India\'s total exports.'
            },
            {
                question: 'Which unified indirect tax system was implemented in India on July 1, 2017?',
                options: ['Value Added Tax (VAT)', 'Goods and Services Tax (GST)', 'Central Excise Duty', 'Service Tax'],
                correct: 1,
                explanation: 'GST was introduced under \'One Nation, One Tax\', consolidating indirect taxes.'
            },
            {
                question: 'Which city in Gujarat cuts and polishes 90% of the world\'s diamonds?',
                options: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
                correct: 1,
                explanation: 'Surat is home to the Surat Diamond Bourse and processes 9 of 10 rough diamonds globally.'
            },
            {
                question: 'Which southern metropolis is widely recognized as the \'Automobile Capital of India\'?',
                options: ['Bengaluru', 'Chennai', 'Hyderabad', 'Kochi'],
                correct: 1,
                explanation: 'Chennai hosts extensive vehicle manufacturing clusters for global automobile giants.'
            },
            {
                question: 'What flagship national program was launched in September 2014 to boost domestic manufacturing?',
                options: ['Startup India', 'Make in India', 'Digital India', 'Stand Up India'],
                correct: 1,
                explanation: '\'Make in India\' was launched to facilitate investment and foster innovation.'
            },
            {
                question: 'What digital document is generated under GST for transport of goods valued above â‚¹50,000?',
                options: ['FastTrack Bill', 'e-Way Bill', 'GST Transit Pass', 'Vahan Pass'],
                correct: 1,
                explanation: 'An e-Way Bill is an electronic slip required under GST for transport of consignments.'
            },
            {
                question: 'Which mega port in Gujarat is India\'s largest commercial private port?',
                options: ['JNPT', 'Mundra Port', 'Kandla Port', 'Cochin Port'],
                correct: 1,
                explanation: 'Mundra Port handles over 150 million metric tons of cargo annually.'
            },
            {
                question: 'Which open-source protocol initiative aims to democratize e-commerce for small retailers?',
                options: ['ONDC', 'GeM Portal', 'FASTag', 'e-NAM'],
                correct: 0,
                explanation: 'ONDC (Open Network for Digital Commerce) enables local merchants to sell openly.'
            },
            {
                question: 'What capacity of non-fossil renewable energy has India targeted to install by 2030?',
                options: ['100 GW', '250 GW', '500 GW', '1000 GW'],
                correct: 2,
                explanation: 'India committed to installing 500 GW of non-fossil energy capacity by 2030.'
            },
            {
                question: 'Which sector is the largest employer in India, employing ~45% of the workforce?',
                options: ['IT & Software', 'Agriculture & Allied Activities', 'Automobile', 'Textiles'],
                correct: 1,
                explanation: 'Agriculture and allied sectors continue to support nearly 45% of India\'s population.'
            }
        ],
        'mythology-culture': [
            {
                question: 'In the Ramayana, what was the divine bow of Lord Shiva broken by Sri Rama called?',
                options: ['Gandiva', 'Pinaka', 'Sharanga', 'Vijaya'],
                correct: 1,
                explanation: 'Pinaka was the celestial bow gifted by Lord Shiva to King Janaka of Mithila.'
            },
            {
                question: 'Who was the celestial architect of the gods in Hindu mythology?',
                options: ['Vishwakarma', 'Maya Danava', 'Kubera', 'Brihaspati'],
                correct: 0,
                explanation: 'Vishwakarma is celebrated as the divine architect and craftsman in Vedic tradition.'
            },
            {
                question: 'In the Mahabharata, who was the master weaponry teacher for both Pandavas and Kauravas?',
                options: ['Guru Sandipani', 'Sage Vashistha', 'Guru Dronacharya', 'Sage Gautama'],
                correct: 2,
                explanation: 'Guru Dronacharya trained the royal princes of Hastinapur in military science.'
            },
            {
                question: 'Which holy river is revered in Hindu belief as the daughter of the Sun God (Suryaputri)?',
                options: ['Ganga', 'Godavari', 'Yamuna', 'Saraswati'],
                correct: 2,
                explanation: 'Yamuna is celebrated as the daughter of Surya and sister of Yama.'
            },
            {
                question: 'Which mountain served as the churning rod during the Samudra Manthan?',
                options: ['Mount Kailash', 'Mount Mandara', 'Mount Meru', 'Mount Vindhya'],
                correct: 1,
                explanation: 'Mount Mandara was placed in the cosmic ocean as the churning rod.'
            },
            {
                question: 'What is the sacred conch shell belonging to Arjuna in the Kurukshetra war named?',
                options: ['Panchajanya', 'Devadatta', 'Anantavijaya', 'Paundra'],
                correct: 1,
                explanation: 'Devadatta was blown by Arjuna, while Sri Krishna blew Panchajanya.'
            },
            {
                question: 'Which sage composed the epic Ramayana in Sanskrit?',
                options: ['Sage Valmiki', 'Sage Ved Vyasa', 'Sage Agastya', 'Sage Narada'],
                correct: 0,
                explanation: 'Sage Valmiki is revered as the Adi Kavi (the first poet) for authoring the Ramayana.'
            },
            {
                question: 'Which divine bird sacrificed his life trying to rescue Devi Sita from Ravana?',
                options: ['Sampati', 'Jatayu', 'Garuda', 'Sugriva'],
                correct: 1,
                explanation: 'Jatayu fought valiantly against Ravana and attained Moksha through Lord Rama.'
            },
            {
                question: 'Which sacred herb was brought by Lord Hanuman from the Himalayas to revive Lakshmana?',
                options: ['Brahmi', 'Sanjeevani', 'Tulsi', 'Ashwagandha'],
                correct: 1,
                explanation: 'Lord Hanuman brought the entire Dronagiri mountain bearing the divine Sanjeevani herb.'
            },
            {
                question: 'Which divine serpent was used as the rope during the Samudra Manthan?',
                options: ['Shesha', 'Vasuki', 'Takshaka', 'Kaliya'],
                correct: 1,
                explanation: 'Vasuki, the king of serpents, served as the churning rope wrapped around Mount Mandara.'
            }
        ]
    }), []);

    // Fetch user's persistent streak status & live 6-hour cooldown status
    useEffect(() => {
        supabase.rpc('get_user_quiz_streak').then(({ data, error }) => {
            if (data && data.success) {
                const isCool = !!data.cooldown_active && (Number(data.cooldown_seconds_remaining || 0) > 0);
                const remSeconds = Number(data.cooldown_seconds_remaining || 0);

                if (isCool) {
                    setCooldownSeconds(remSeconds);
                    setOnCooldown(true);
                    setQuizStage('already_completed');
                } else if (!isCool && onCooldown) {
                    setCooldownSeconds(0);
                    setOnCooldown(false);
                    setQuizStage('select_category');
                }

                setStreakData(prev => ({
                    streak: Number(data.current_streak || prev.streak || 0),
                    highestStreak: Number(data.highest_streak || prev.highestStreak || 0),
                    playedToday: !!data.played_today,
                    freezesLeft: data.freezes_left ?? prev.freezesLeft
                }));
            }
        }).catch((err) => console.error('Failed to load streak:', err));
    }, [todayPlay]);

    // Active question pool: prioritize DB questions for selected category, fallback to categorySampleQuestions
    const activeQuestions = useMemo(() => {
        let pool = [];
        if (selectedCategory?.id && initialQuestions?.length > 0) {
            const catFiltered = initialQuestions.filter(q => q.category_id === selectedCategory.id);
            if (catFiltered.length > 0) pool = catFiltered;
        }

        if (pool.length > 0) {
            return pool.map(q => ({
                question: q.question,
                options: Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []),
                correct: q.correct_option_index ?? q.correct ?? 0,
                explanation: q.explanation || 'Verified insight from InTrust Daily Trivia Knowledge Engine.'
            }));
        }

        // Category fallback from rich local question bank
        if (selectedCategory?.slug && categorySampleQuestions[selectedCategory.slug]) {
            return categorySampleQuestions[selectedCategory.slug];
        }

        return categorySampleQuestions['general-knowledge'];
    }, [initialQuestions, selectedCategory, categorySampleQuestions]);

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

        const currentQ = activeQuestions[currentQuestionIndex];
        const correctText = currentQ?.options?.[currentQ?.correct] || '';
        const explanation = currentQ?.explanation || '';

        setAnswerFeedback({
            isCorrect: false,
            isTimeOut: true,
            correctText,
            selectedText: 'Time Ran Out',
            explanation,
            pointsEarned: 0,
            totalPoints: score * 10
        });

        setTimeout(() => {
            setAnswerFeedback(null);
            if (currentQuestionIndex < activeQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswerSubmitted(false);
            } else {
                finishQuiz();
            }
        }, 2200);
    };

    // Handle Option Selection in Quiz
    const handleSelectOption = (index) => {
        if (isAnswerSubmitted) return;
        if (selectedOption === index) {
            // Tapping the already selected option confirms and submits
            handleConfirmSubmit(index);
            return;
        }
        setSelectedOption(index);
        playSound('tap', soundEnabled);
    };

    // Explicit confirmation submission (via SUBMIT ANSWER button or second tap)
    const handleConfirmSubmit = (indexToSubmit = selectedOption) => {
        if (isAnswerSubmitted) return;
        const finalIndex = indexToSubmit !== null ? indexToSubmit : 0;
        if (selectedOption === null) {
            setSelectedOption(finalIndex);
        }
        setIsAnswerSubmitted(true);

        const currentQ = activeQuestions[currentQuestionIndex];
        const isCorrect = finalIndex === currentQ?.correct;

        if (isCorrect) {
            setScore(prev => prev + 1);
            playSound('correct', soundEnabled);
            setShowFloatingPoints(true);
            setTimeout(() => setShowFloatingPoints(false), 900);
        } else {
            playSound('incorrect', soundEnabled);
        }

        // Crisp 900ms delay so user sees immediate button feedback, then smoothly advances
        setTimeout(() => {
            setAnswerFeedback(null);
            if (currentQuestionIndex < activeQuestions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswerSubmitted(false);
            } else {
                finishQuiz();
            }
        }, 900);
    };

    // Finish Quiz & Submit to RPC with Real Data
    const finishQuiz = async () => {
        setSubmittingQuiz(true);
        playSound('victory', soundEnabled);

        const finalScore = score + (selectedOption === activeQuestions[currentQuestionIndex]?.correct ? 1 : 0);
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

        // Validate Category ID (never pass dummy non-existent UUID)
        const validCatId = (selectedCategory?.id && selectedCategory.id.length === 36 && selectedCategory.id !== 'c0000000-0000-0000-0000-000000000001')
            ? selectedCategory.id
            : (categories?.[0]?.id || null);

        // Immediate Client-side persistence safeguard: 6-hour cooldown
        const sixHoursSec = 6 * 3600;
        const unlockTimestamp = Date.now() + (sixHoursSec * 1000);
        if (typeof window !== 'undefined' && user?.id) {
            try {
                localStorage.setItem(`intrust_quiz_unlock_${user.id}`, unlockTimestamp.toString());
            } catch (err) {
                console.error('LocalStorage write error:', err);
            }
        }

        try {
            const response = await fetch('/api/daily-challenge/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId: validCatId, score: finalScore }),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.success) {
                const data = payload?.data;
                if (data?.cooldown_active || data?.cooldown_seconds_remaining) {
                    const remSec = Number(data.cooldown_seconds_remaining || sixHoursSec);
                    setCooldownSeconds(remSec);
                    setOnCooldown(true);
                    setQuizStage('already_completed');
                    return;
                }

                const reason = payload?.error || 'Could not record your challenge. Please try again.';
                console.error('[DailyChallenge][complete] request failed', {
                    status: response.status,
                    reason,
                });
                setBookingError(reason);
                setQuizStage('questions');
                setIsAnswerSubmitted(false);
                return;
            }

            const data = payload.data || payload;
            setCompletionResult(data);
            setCooldownSeconds(sixHoursSec);
            setOnCooldown(true);
            const updatedStreak = Number(data.current_streak || 1);
            const updatedHighest = Number(data.highest_streak || updatedStreak);
            const remainingFreezes = data.freeze_used
                ? Math.max(0, (streakData.freezesLeft || 0) - 1)
                : (data.freezes_left ?? streakData.freezesLeft);

            setStreakData(prev => ({
                ...prev,
                streak: updatedStreak,
                highestStreak: updatedHighest,
                playedToday: true,
                freezesLeft: remainingFreezes,
            }));

            // Keep the breadcrumb wallet pill live (MarketingWalletProvider listens)
            const newBalance = data.new_balance_paise;
            if (typeof window !== 'undefined' && newBalance !== undefined && newBalance !== null) {
                const parsedBalance = Number(newBalance);
                if (Number.isFinite(parsedBalance)) {
                    setLiveWalletPaise(parsedBalance);
                    window.dispatchEvent(new CustomEvent('walletBalanceUpdated', {
                        detail: { balance_paise: parsedBalance }
                    }));
                }
            }

            // Dispatch marketingStreakUpdated so sidebar StreakRibbon and parent pages update live
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('marketingStreakUpdated', {
                    detail: {
                        current_streak: updatedStreak,
                        highest_streak: updatedHighest,
                        played_today: true,
                        freezes_left: remainingFreezes,
                    }
                }));
            }
        } catch (e) {
            console.error('[DailyChallenge][complete] network error:', e);
            setBookingError('Network error while recording your challenge. Please check your connection and retry.');
            setQuizStage('questions');
            setIsAnswerSubmitted(false);
            return;
        } finally {
            setSubmittingQuiz(false);
        }

        setQuizStage('sponsor_showcase');
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

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Header with Breadcrumbs, Live Wallet Pill & Role Tabs for Merchants */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
                    <MarketingBreadcrumbs
                        customTitle="Daily Challenge"
                        customSubtitle="Test your knowledge, earn instant cashbacks, and discover featured local merchants."
                        className="flex-1 min-w-0"
                    />
                    <div className="flex items-center gap-2 mt-1 shrink-0">
                        {/* Wallet pill is rendered by MarketingBreadcrumbs (kept in sync via
                            MarketingWalletProvider). liveWalletPaise still drives the
                            wallet-payment sufficiency check below. */}
                        <GuideInfoButton pageKey="/marketing/daily-challenge" scope="marketing" className="shrink-0" />
                    </div>
                </div>

                {/* Tabs for Merchants (Customers never see this switcher) - Clean Parity with Sponsor Portal */}
                {isMerchant && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
                        <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs flex items-center gap-1.5">
                            <span>ðŸŽ® Play Challenge</span>
                        </span>
                        <Link
                            href="/marketing/daily-challenge/sponsor"
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Store size={13} className="text-amber-600" />
                            <span>â­ Book Slot</span>
                        </Link>
                        <Link
                            href="/marketing/daily-challenge/sponsor/history"
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Receipt size={13} className="text-blue-600" />
                            <span>ðŸ“œ My History</span>
                        </Link>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* 1. PLAY CHALLENGE VIEW (Available to BOTH Customers and Merchants)        */}
            {/* ========================================================================= */}
            {activeTab === 'play' && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Live Dynamic Streak Tracker Ribbon */}
                    <StreakRibbon
                        streak={streakData.streak}
                        currentStreak={streakData.streak}
                        highestStreak={streakData.highestStreak}
                        freezesLeft={streakData.freezesLeft}
                        playedToday={streakData.playedToday}
                        milestones={streakConfig?.milestones}
                    />

                                        {/* Clean, Minimal & Premium VIP Sponsor Spotlight */}
                    {/* Fire one impression beacon per sponsor per session for reach analytics */}
                    {todaySponsor?.id && (typeof window !== 'undefined') && trackSponsorImpressionOnce(todaySponsor.id)}

                    <div className="rounded-3xl p-5 sm:p-6 bg-white border border-slate-200/90 shadow-sm space-y-4 relative overflow-hidden transition-all">
                        {/* Subtle top gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />

                        {/* Top Header: Sponsor Brand, Blue Verified Badge & Sponsor CTA */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0 shadow-2xs">
                                    {todaySponsor?.avatar_url ? (
                                        <Image
                                            src={todaySponsor.avatar_url}
                                            alt={todaySponsor?.merchants?.business_name || "Sponsor"}
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                                            {(todaySponsor?.merchants?.business_name || 'InTrust').slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                            â­ Today&apos;s Official Sponsor
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 shadow-2xs">
                                            <svg className="w-3 h-3 text-blue-600 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                            <span>Verified Partner</span>
                                        </span>
                                    </div>
                                    <h4 className="text-base sm:text-lg font-black text-slate-950 mt-1 truncate">
                                        {todaySponsor?.merchants?.business_name || "InTrust Verified Partner Marketplace"}
                                    </h4>
                                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium italic">
                                        &quot;{todaySponsor?.campaign_message || "Exclusive quiz cashbacks & authentic community specials."}&quot;
                                    </p>
                                </div>
                            </div>

                            {isMerchant && (
                                <Link
                                    href="/marketing/daily-challenge/sponsor"
                                    className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95"
                                >
                                    <span>Sponsor Tomorrow</span>
                                    <ArrowRight size={13} />
                                </Link>
                            )}
                        </div>

                        {/* Bottom Row: Static Responsive Products Grid */}
                        {todaySponsor?.products && todaySponsor.products.length > 0 && (
                            <div className="space-y-2.5 pt-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                        Featured Store Products ({todaySponsor.products.length})
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {todaySponsor.products.map((p, pIdx) => {
                                        const isPlatform = p.is_platform_product || !todaySponsor?.merchants?.id;
                                        const isOwnProduct = isMerchant && todaySponsor?.merchants?.id === merchant?.id;

                                        let targetHref = p.slug ? `/shop/product/${p.slug}` : '/shop';
                                        let badgeText = 'Special Offer';
                                        let badgeClass = 'text-blue-700 bg-blue-50 border-blue-100';

                                        if (isMerchant) {
                                            if (isOwnProduct) {
                                                targetHref = '/merchant/inventory';
                                                badgeText = 'Your Store Item';
                                                badgeClass = 'text-indigo-700 bg-indigo-50 border-indigo-200';
                                            } else if (isPlatform) {
                                                targetHref = `/merchant/shopping/wholesale?q=${encodeURIComponent(p.product_name)}`;
                                                badgeText = 'âš¡ Wholesale Available';
                                                badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                            } else {
                                                targetHref = p.slug ? `/shop/product/${p.slug}` : '/shop';
                                                badgeText = 'ðŸª Partner Store (Retail)';
                                                badgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
                                            }
                                        }

                                        return (
                                            <a
                                                key={p.id || pIdx}
                                                href={targetHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    trackSponsorEvent(todaySponsor.id, 'PRODUCT_CLICK', { 
                                                        productId: p.id || p.product_id 
                                                    });
                                                    window.open(targetHref, '_blank', 'noopener,noreferrer');
                                                }}
                                                className="group bg-slate-50/70 hover:bg-white p-3 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 relative"
                                            >
                                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200/60 shrink-0 flex items-center justify-center p-1">
                                                    <Image
                                                        src={p.image_url || '/icons/intrustLogo.png'}
                                                        alt={p.product_name}
                                                        fill
                                                        sizes="48px"
                                                        className="object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                                        {p.product_name}
                                                    </h5>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-black text-slate-950">â‚¹{p.price}</span>
                                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${badgeClass}`}>
                                                            {badgeText}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight size={15} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* State A: Category Selection */}
                    {quizStage === 'select_category' && (
                        onCooldown ? (
                            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md text-center max-w-xl mx-auto space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
                                    <Clock size={32} className="text-amber-500 animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                        ⚡ 6-Hour Challenge Refresh
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-2">
                                        Next Challenge Unlocks Soon!
                                    </h3>
                                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                        You can play every 6 hours! Your {streakData.streak}-day streak is secured. Next challenge unlocks in:
                                    </p>
                                </div>

                                {/* 6-Hour Reverse Countdown Timer Card */}
                                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white shadow-xl border border-white/10 relative overflow-hidden space-y-3">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                                        <span className="flex items-center gap-1.5 text-amber-400">
                                            <Clock size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
                                            <span>Reverse Unlock Countdown</span>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono font-bold text-sky-300">
                                            {cooldownPercentElapsed}% Elapsed
                                        </span>
                                    </div>

                                    {/* Big Monospace Reverse Countdown Digits */}
                                    <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 py-1">
                                        {formattedReverseTimer}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${cooldownPercentElapsed}%` }}
                                        />
                                    </div>

                                    <div className="text-[10px] text-slate-400 font-medium">
                                        Timer automatically unlocks the quiz when it reaches 00:00:00.
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuizStage('already_completed')}
                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                                    >
                                        Review Last Quiz Answers
                                    </button>
                                    <Link
                                        href="/marketing/targets"
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95"
                                    >
                                        Explore Target Prizes →
                                    </Link>
                                    <Link
                                        href="/marketing"
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95"
                                    >
                                        Marketing Hub
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-6">
                                <div className="text-center max-w-lg mx-auto py-1">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs font-black uppercase mb-2 border border-emerald-200 shadow-2xs">
                                        <Trophy size={13} className="text-emerald-600" />
                                        <span>Assured Instant Cashback</span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                                        Choose Today&apos;s Challenge
                                    </h2>
                                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
                                        10 questions to solve. Select any category to begin immediately!
                                    </p>
                                </div>

                            {/* Categories Grid - 2 columns on mobile, 4 on desktop */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
                                {categories.map((cat) => {
                                    const theme = categoryThemeMap[cat.slug] || categoryThemeMap['general-knowledge'];
                                    const Icon = theme.icon || BookOpen;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategory(cat);
                                                setCurrentQuestionIndex(0);
                                                setSelectedOption(null);
                                                setIsAnswerSubmitted(false);
                                                setScore(0);
                                                setQuizStage('questions');
                                            }}
                                            className={`p-3.5 sm:p-4 rounded-2xl text-left border transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-2xs flex flex-col justify-between group bg-white border-slate-200/80 hover:border-blue-400 hover:shadow-md cursor-pointer`}
                                        >
                                            <div>
                                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 ${theme.bg} ${theme.color}`}>
                                                    <Icon size={18} />
                                                </div>
                                                <h3 className="text-xs sm:text-sm font-black text-slate-950 mb-1 truncate">
                                                    {cat.title}
                                                </h3>
                                                <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2 font-medium">
                                                    {cat.description || 'Test your knowledge across curated Indian questions.'}
                                                </p>
                                            </div>

                                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-blue-600">
                                                <span>10 Questions</span>
                                                <span className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform font-black">
                                                    Play <ArrowRight size={11} />
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* State B: Active 10 Questions Loop - Modular Arcade Sky Arena */}
                    {quizStage === 'questions' && (
                        <div className="fixed inset-0 z-50 h-[100dvh] min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#60a5fa] to-[#3b82f6] text-slate-900 flex flex-col justify-between overflow-y-auto select-none">
                            <QuizArena
                                activeQuestions={activeQuestions}
                                currentQuestionIndex={currentQuestionIndex}
                                selectedOption={selectedOption}
                                isAnswerSubmitted={isAnswerSubmitted}
                                score={score}
                                timeLeft={timeLeft}
                                showFloatingPoints={showFloatingPoints}
                                soundEnabled={soundEnabled}
                                streakData={streakData}
                                todaySponsor={todaySponsor}
                                selectedCategory={selectedCategory}
                                showExitConfirm={showExitConfirm}
                                setShowExitConfirm={setShowExitConfirm}
                                setSoundEnabled={setSoundEnabled}
                                handleSelectOption={handleSelectOption}
                                handleConfirmSubmit={handleConfirmSubmit}
                                speakText={speakText}
                                onExitQuiz={() => {
                                    if (streakData.playedToday) {
                                        setQuizStage('already_completed');
                                    } else {
                                        setQuizStage('select_category');
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* ── Post-Quiz Sequential Flow: Sponsor → Reward → Streak → Results ── */}
                    {quizStage === 'sponsor_showcase' && (
                        <div className="max-w-xl mx-auto px-3 sm:px-0">
                            <PostQuizFlow
                                todaySponsor={todaySponsor}
                                score={score}
                                totalQuestions={activeQuestions?.length || 10}
                                streakData={streakData}
                                completionResult={completionResult}
                                todayPlay={todayPlay}
                                dynamicReward={dynamicReward}
                                formattedTodayDate={formattedTodayDate}
                                shareCopied={shareCopied}
                                handleShareResults={handleShareResults}
                                questions={activeQuestions}
                                copiedProductId={copiedProductId}
                                handleShareProductDeal={handleShareProductDeal}
                                isMerchant={isMerchant}
                                profile={profile}
                                onGoBack={() => setQuizStage('select_category')}
                            />
                        </div>
                    )}

                    {/* ── Already Completed (revisit after same-day play) ── */}
                    {(quizStage === 'completed' || quizStage === 'already_completed') && (
                        <div className="max-w-xl mx-auto space-y-5 px-3 sm:px-0">
                            {/* Live 6-Hour Reverse Countdown Timer banner */}
                            {onCooldown && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 text-white shadow-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                            <Clock size={20} className="animate-pulse" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[10px] uppercase font-black text-amber-400 tracking-wider">
                                                Next Quiz Unlocks In
                                            </div>
                                            <div className="text-xs font-medium text-slate-300">
                                                Play every 6 hours for rewards & streaks
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-xl sm:text-2xl font-black text-amber-300 bg-black/40 px-4 py-2 rounded-xl border border-white/10 shrink-0 tracking-wider shadow-inner">
                                        {formattedReverseTimer}
                                    </div>
                                </div>
                            )}

                            <QuizResultsView
                                quizStage={quizStage}
                                score={score}
                                totalQuestions={activeQuestions?.length || 10}
                                streakData={streakData}
                                completionResult={completionResult}
                                todayPlay={todayPlay}
                                dynamicReward={dynamicReward}
                                formattedTodayDate={formattedTodayDate}
                                shareCopied={shareCopied}
                                handleShareResults={handleShareResults}
                                questions={activeQuestions}
                                onCooldown={onCooldown}
                                formattedReverseTimer={formattedReverseTimer}
                            />

                            {/* Shareable streak card — surfaces the live streak
                                (from get_user_quiz_streak) after a completed quiz. */}
                            <StreakShareCard
                                streak={Number(streakData?.streak || 0)}
                                score={score}
                                totalQuestions={activeQuestions?.length || 10}
                                userName={profile?.full_name || user?.user_metadata?.full_name || 'I'}
                                referralCode={profile?.referral_code || user?.user_metadata?.referral_code}
                            />

                            <QuizSponsorShowcase
                                todaySponsor={todaySponsor}
                                copiedProductId={copiedProductId}
                                handleShareProductDeal={handleShareProductDeal}
                                isMerchantViewer={isMerchant}
                            />

                            <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setQuizStage('select_category')}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                                >
                                    â† Back to Challenge Lobby
                                </button>
                                <Link
                                    href="/marketing"
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95"
                                >
                                    Go to Marketing Hub â†’
                                </Link>
                            </div>

                            {isMerchant && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <Link
                                        href="/marketing/daily-challenge/sponsor"
                                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100/80 transition-colors"
                                    >
                                        <Store size={14} />
                                        <span>Sponsor Tomorrow&apos;s Challenge & Lock Slot â†’</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. SPONSOR A CHALLENGE VIEW (Strictly for Merchants)                      */}
            {/* ========================================================================= */}
            {activeTab === 'sponsor' && isMerchant && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md text-center max-w-xl mx-auto space-y-5">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                        <Store size={36} />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                            Merchant Sponsorship Portal
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                            Book exclusive 24-hour billboard placements, showcase catalog products, and get official GST tax invoices in the dedicated Sponsor Portal.
                        </p>
                    </div>
                    <div className="pt-2">
                        <Link
                            href="/marketing/daily-challenge/sponsor"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-all"
                        >
                            <span>Open Daily Challenge Sponsor Portal</span>
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            )}


            {/* Cashback Animation Celebration Modal */}
            <CashbackAnimationModal
                isOpen={showCashbackModal}
                onClose={() => {
                    setShowCashbackModal(false);
                    // Always trigger Streak Milestone Celebration after cashback
                    setShowStreakModal(true);
                }}
                cashbackAmount={completionResult?.reward_paise ? (completionResult.reward_paise / 100) : dynamicReward}
                newBalance={completionResult?.new_balance_paise ? (completionResult.new_balance_paise / 100) : ((merchant?.wallet_balance_paise ? merchant.wallet_balance_paise / 100 : (profile?.wallet_balance || 0)) + dynamicReward)}
                source="Daily Challenge"
            />

            {/* Mystery Milestone Gift Box Modal */}
            <GiftBoxAnimationModal
                isOpen={showGiftBoxModal}
                onClose={() => setShowGiftBoxModal(false)}
                rewardTitle={`â‚¹${dynamicReward} InTrust Cashback`}
                rewardDesc="Congratulations! You solved today's questions and unlocked your daily cashback milestone."
                rewardValue={dynamicReward}
            />



            {/* Daily Streak Celebration & Milestone Modal */}
            <StreakMilestoneModal
                isOpen={showStreakModal}
                onClose={() => setShowStreakModal(false)}
                streak={Math.max(1, Number(completionResult?.current_streak ?? streakData.streak ?? 1))}
                baseRewardPaise={completionResult?.base_reward_paise || (dynamicReward * 100)}
                milestoneBonusPaise={completionResult?.milestone_bonus_paise || 0}
                badge={completionResult?.badge || completionResult?.milestone_badge || ''}
                freezeUsed={completionResult?.freeze_used || false}
            />

            {/* Merchant Sponsorship Booking Celebration Modal */}
            <SponsorshipCelebrationModal
                isOpen={bookingSuccess && !!sponsorshipResult}
                onClose={() => {
                    setBookingSuccess(false);
                    setSponsorshipResult(null);
                    window.location.reload();
                }}
                bookingDetails={sponsorshipResult || {}}
            />
        </div>
    );
}
