'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
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
    Receipt
} from 'lucide-react';
import CashbackAnimationModal from '@/components/marketing/animations/CashbackAnimationModal';
import GiftBoxAnimationModal from '@/components/marketing/animations/GiftBoxAnimationModal';
import MarketingBreadcrumbs from '@/components/marketing/layout/MarketingBreadcrumbs';
import SabpaisaPaymentModal from '@/components/payment/SabpaisaPaymentModal';
import StreakRibbon from '@/components/marketing/challenge/StreakRibbon';
import StreakMilestoneModal from '@/components/marketing/challenge/StreakMilestoneModal';
import SponsorshipCelebrationModal from '@/components/marketing/animations/SponsorshipCelebrationModal';
import TrophyChampionVector from '@/components/marketing/graphics/TrophyChampionVector';
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
    initialQuestions = [],
    initialStreak = {},
    streakConfig = {},
    todaySponsor,
    todayPlay,
    todayDateStr,
    secondsUntilMidnightIST = 0,
    existingSponsorships = [],
    merchantInventory = [],
    rewardsConfig = {}
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

    // Live Indian Standard Time (IST) Midnight Countdown State
    const [secondsToMidnight, setSecondsToMidnight] = useState(secondsUntilMidnightIST || 0);

    // Dynamic Streak States initialized from live DB RPC
    const [streakData, setStreakData] = useState({
        streak: Number(initialStreak?.current_streak || 0),
        highestStreak: Number(initialStreak?.highest_streak || 0),
        playedToday: !!initialStreak?.played_today || !!todayPlay,
        freezesLeft: initialStreak?.freezes_left ?? 1
    });
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);

    // Answer feedback overlay state for front-of-screen right/wrong popups
    const [answerFeedback, setAnswerFeedback] = useState(null);

    // Post-game one-by-one sponsored products showcase index & hover pause state
    const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
    const [isShowcasePaused, setIsShowcasePaused] = useState(false);

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
                    // 12:00 AM IST turnover! Re-fetch streak and unlock challenge automatically
                    supabase.rpc('get_user_quiz_streak').then(({ data }) => {
                        if (data) {
                            setStreakData({
                                streak: data.current_streak,
                                highestStreak: data.highest_streak,
                                playedToday: data.played_today,
                                freezesLeft: data.freezes_left
                            });
                            if (!data.played_today) {
                                setQuizStage('select_category');
                            }
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
                explanation: 'Infosys was founded in 1981 with an initial capital of ₹10,000.'
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
                explanation: 'Nestlé launched Maggi 2-Minute Noodles in India in 1983.'
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
                question: 'Which decentralized digital ledger technology forms the basis of cryptocurrencies?',
                options: ['Quantum Key', 'Blockchain', 'Cloud Computing', 'Mesh Network'],
                correct: 1,
                explanation: 'Blockchain is a cryptographically secured, decentralized, distributed ledger.'
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
                question: 'What digital document is generated under GST for transport of goods valued above ₹50,000?',
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
            explanation
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

    // Handle Option Selection in Quiz with front-of-screen popup
    const handleSelectOption = (index) => {
        if (isAnswerSubmitted) return;
        setSelectedOption(index);
        setIsAnswerSubmitted(true);

        const currentQ = activeQuestions[currentQuestionIndex];
        const isCorrect = index === currentQ?.correct;
        const correctText = currentQ?.options?.[currentQ?.correct] || '';
        const selectedText = currentQ?.options?.[index] || '';
        const explanation = currentQ?.explanation || '';

        setAnswerFeedback({
            isCorrect,
            isTimeOut: false,
            correctText,
            selectedText,
            explanation
        });

        if (isCorrect) {
            setScore(prev => prev + 1);
            playSound('correct', soundEnabled);
            setShowFloatingPoints(true);
            setTimeout(() => setShowFloatingPoints(false), 900);
        } else {
            playSound('incorrect', soundEnabled);
        }

        // Wait 2.2s so user clearly sees correct answer & trivia hint before sliding to next question
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

    // Finish Quiz & Submit to RPC with Real Data
    const finishQuiz = async () => {
        setSubmittingQuiz(true);
        playSound('victory', soundEnabled);
        try {
            const finalScore = score + (selectedOption === activeQuestions[currentQuestionIndex]?.correct ? 1 : 0);
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

                // Dispatch walletBalanceUpdated event so top navbar wallet updates live
                if (typeof window !== 'undefined' && data.new_balance_paise !== undefined) {
                    window.dispatchEvent(new CustomEvent('walletBalanceUpdated', {
                        detail: { balance_paise: data.new_balance_paise }
                    }));
                }
            }
        } catch (e) {
            console.error('Error recording quiz play:', e);
        } finally {
            setSubmittingQuiz(false);
            // Show sponsored showcase first if sponsor products exist
            if (todaySponsor?.products && todaySponsor.products.length > 0) {
                setQuizStage('sponsored_showcase');
                setActiveShowcaseIndex(0);
            } else {
                setQuizStage('completed');
                setShowCashbackModal(true);
            }
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

    // Handle Sponsorship Booking via secure backend API route
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
            const res = await fetch('/api/marketing/sponsor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sponsorDate: selectedDate.dateStr,
                    productIds: selectedProducts.map(p => p.id),
                    campaignMessage,
                    paymentMethod: 'wallet'
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data?.error || 'Failed to book sponsorship');
            }

            setBookingSuccess(true);
            setSponsorshipResult({
                sponsorDate: selectedDate.dateStr,
                products: selectedProducts,
                feePaidRupees: dynamicSponsorFee,
                merchantName: merchant?.business_name || 'Partner Store',
                campaignMessage
            });
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
            const res = await fetch('/api/marketing/sponsor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sponsorDate: selectedDate.dateStr,
                    productIds: selectedProducts.map(p => p.id),
                    campaignMessage,
                    paymentMethod: 'sabpaisa',
                    clientTxnId: txnResult?.clientTxnId || txnResult?.txnId || 'SABPAISA_' + Date.now()
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data?.error || 'Failed to finalize sponsorship booking');
            }

            setBookingSuccess(true);
            setSponsorshipResult({
                sponsorDate: selectedDate.dateStr,
                products: selectedProducts,
                feePaidRupees: dynamicSponsorFee,
                merchantName: merchant?.business_name || 'Partner Store',
                campaignMessage
            });
        } catch (err) {
            setBookingError(err.message);
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 lg:space-y-7 animate-fadeIn">
            {/* Header with Breadcrumbs & Role Tabs for Merchants */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 sm:pb-4">
                <MarketingBreadcrumbs
                    customTitle="Daily Challenge & Quiz"
                    customSubtitle="Test your knowledge, earn instant cashbacks, and discover featured local merchants."
                />

                {/* Tabs for Merchants (Customers never see this switcher) - Clean Parity with Sponsor Portal */}
                {isMerchant && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
                        <span className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs flex items-center gap-1.5">
                            <span>🎮 Play Challenge</span>
                        </span>
                        <Link
                            href="/marketing/daily-challenge/sponsor"
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Store size={13} className="text-amber-600" />
                            <span>⭐ Book Slot</span>
                        </Link>
                        <Link
                            href="/marketing/daily-challenge/sponsor/history"
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                            <Receipt size={13} className="text-blue-600" />
                            <span>📜 My History</span>
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
                    />

                    {/* Clean, Minimal & Premium VIP Sponsor Spotlight */}
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
                                            ⭐ Today's Official Sponsor
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
                                        "{todaySponsor?.campaign_message || "Exclusive quiz cashbacks & authentic community specials."}"
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
                                                badgeText = '⚡ Wholesale Available';
                                                badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                            } else {
                                                targetHref = p.slug ? `/shop/product/${p.slug}` : '/shop';
                                                badgeText = '🏪 Partner Store (Retail)';
                                                badgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
                                            }
                                        }

                                        return (
                                            <a
                                                key={p.id || pIdx}
                                                href={targetHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
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
                                                        <span className="text-xs font-black text-slate-950">₹{p.price}</span>
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
                        streakData.playedToday ? (
                            <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200/90 shadow-sm text-center max-w-xl mx-auto space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
                                    <Flame size={32} className="fill-amber-500 animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ✓ Today's Challenge Completed
                                    </span>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-950 mt-2">
                                        Streak Secured for Today!
                                    </h3>
                                    <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1 max-w-md mx-auto">
                                        You've already claimed today's cashback and secured your {streakData.streak}-day streak. The next daily challenge unlocks at 12:00 AM IST midnight!
                                    </p>
                                </div>

                                {/* Live Midnight Countdown Pill */}
                                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-mono text-xs font-bold shadow-sm">
                                    <Clock size={14} className="text-amber-400" />
                                    <span>Next Challenge Unlocks in: {formattedTimeUntilMidnight} (12:00 AM IST)</span>
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
                                        Choose Today's Challenge
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

                    {/* State B: Active 10 Questions Loop - Crisp Light Mode Arena */}
                    {quizStage === 'questions' && (
                        <div className="fixed inset-0 z-50 h-[100dvh] min-h-screen bg-slate-50/95 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] text-slate-900 flex flex-col justify-between overflow-y-auto">
                            {/* Quiz Control Top HUD */}
                            <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 shadow-2xs">
                                <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 text-xs font-black">
                                    {/* Left: Back / Exit Button */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setQuizStage('select_category')}
                                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                            title="Exit Quiz"
                                        >
                                            <ArrowLeft size={14} />
                                            <span>Exit</span>
                                        </button>
                                        <span className="text-slate-600 text-[11px] font-bold hidden sm:inline truncate max-w-[140px]">
                                            {selectedCategory?.title || 'Daily Quiz'}
                                        </span>
                                    </div>

                                    {/* Center: Minimal Clean Sponsor Pill */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/90 text-[11px] font-bold shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider hidden xs:inline">Sponsored by</span>
                                        <span className="font-extrabold text-slate-900 max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] truncate">
                                            {todaySponsor?.merchants?.business_name || "InTrust Partner"}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200/80 shrink-0">
                                            <svg className="w-2.5 h-2.5 text-blue-600 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                            <span>Verified</span>
                                        </span>
                                    </div>

                                    {/* Right: Streak, Score, Timer, Sound Mute */}
                                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[9px] sm:text-[10px] font-black border border-orange-200">
                                            <Flame size={11} className="text-orange-500 animate-bounce" />
                                            <span>{streakData.streak}d</span>
                                        </div>

                                        <div className="flex items-center gap-1 text-emerald-600 font-black text-[11px] sm:text-xs">
                                            <Star size={12} className="fill-emerald-500" />
                                            <span>{score * 10} pts</span>
                                        </div>

                                        {/* Dynamic Countdown Timer */}
                                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border transition-all ${
                                            timeLeft <= 5 
                                                ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
                                                : timeLeft <= 10 
                                                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                                                : 'bg-slate-100 text-slate-800 border-slate-200'
                                        }`}>
                                            <Clock size={10} />
                                            <span>{timeLeft}s</span>
                                        </div>

                                        {/* Sound Toggle */}
                                        <button
                                            type="button"
                                            onClick={() => setSoundEnabled(prev => !prev)}
                                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
                                        >
                                            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Animated Progress Bar */}
                                <div className="max-w-4xl mx-auto w-full h-1 mt-2.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300"
                                        style={{ width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Centered Question Arena Card */}
                            <div className="flex-1 flex flex-col justify-center max-w-xl sm:max-w-2xl mx-auto w-full px-4 py-4 sm:py-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentQuestionIndex}
                                        initial={{ opacity: 0, x: 40, scale: 0.98 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -40, scale: 0.98 }}
                                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                        className="relative bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl overflow-hidden"
                                    >
                                        {/* Floating +10 Points Animation */}
                                        <AnimatePresence>
                                            {showFloatingPoints && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                    animate={{ opacity: 1, y: -24, scale: 1.15 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute top-4 right-5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-500/25 flex items-center gap-1 z-20 pointer-events-none"
                                                >
                                                    <Sparkles size={12} />
                                                    <span>+10 PTS</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Question Meta Header with Category & Progress Stepper */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                {selectedCategory?.title || 'Daily Quiz'}
                                            </span>

                                            {/* Stepper Dots & Question Number */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {activeQuestions.map((_, i) => (
                                                        <span
                                                            key={i}
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                                i === currentQuestionIndex 
                                                                    ? 'w-5 bg-blue-600' 
                                                                    : i < currentQuestionIndex 
                                                                    ? 'w-1.5 bg-emerald-500' 
                                                                    : 'w-1.5 bg-slate-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-black text-slate-500 ml-1">
                                                    Q{currentQuestionIndex + 1}/{activeQuestions.length}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Question Prompt */}
                                        <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-950 mb-5 leading-snug tracking-tight">
                                            {activeQuestions[currentQuestionIndex]?.question}
                                        </h3>

                                        {/* Options with A, B, C, D badges */}
                                        <div className="space-y-2.5">
                                            {activeQuestions[currentQuestionIndex]?.options?.map((opt, idx) => {
                                                const isSelected = selectedOption === idx;
                                                const isCorrect = activeQuestions[currentQuestionIndex]?.correct === idx;
                                                const optionLetters = ['A', 'B', 'C', 'D'];
                                                let btnStyle = "border-slate-200 bg-slate-50/80 text-slate-800 hover:bg-blue-50/70 hover:border-blue-400 hover:text-blue-950";

                                                if (isAnswerSubmitted) {
                                                    if (isCorrect) {
                                                        btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 font-black scale-[1.01]";
                                                    } else if (isSelected && !isCorrect) {
                                                        btnStyle = "border-rose-500 bg-rose-50 text-rose-950 animate-shake font-black";
                                                    }
                                                }

                                                return (
                                                    <motion.button
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.18, delay: idx * 0.04 }}
                                                        disabled={isAnswerSubmitted}
                                                        onClick={() => handleSelectOption(idx)}
                                                        className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs ${btnStyle}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                                                isAnswerSubmitted && isCorrect 
                                                                    ? 'bg-emerald-500 text-white' 
                                                                    : isAnswerSubmitted && isSelected && !isCorrect 
                                                                    ? 'bg-rose-500 text-white' 
                                                                    : 'bg-white border border-slate-200 text-slate-700'
                                                            }`}>
                                                                {optionLetters[idx]}
                                                            </span>
                                                            <span className="break-words whitespace-normal text-left font-semibold">{opt}</span>
                                                        </div>
                                                        {isAnswerSubmitted && isCorrect && (
                                                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                                        )}
                                                        {isAnswerSubmitted && isSelected && !isCorrect && (
                                                            <XCircle size={18} className="text-rose-600 shrink-0" />
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Minimal Footer */}
                            <div className="w-full py-3 text-center border-t border-slate-200 text-[10px] text-slate-500 font-semibold bg-white/80 backdrop-blur-md">
                                InTrust Arena • Verified daily trivia challenges with instant wallet cashbacks
                            </div>

                            {/* Front-of-Screen Answer & Hint Modal Overlay */}
                            <AnimatePresence>
                                {answerFeedback && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs pointer-events-none"
                                    >
                                        <motion.div
                                            initial={{ scale: 0.7, y: 20, opacity: 0 }}
                                            animate={{ scale: 1, y: 0, opacity: 1 }}
                                            exit={{ scale: 0.8, y: -10, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 420, damping: 26 }}
                                            className={`max-w-xs sm:max-w-md w-full p-5 sm:p-6 rounded-3xl border-2 text-center shadow-2xl flex flex-col items-center gap-3.5 bg-white ${
                                                answerFeedback.isCorrect 
                                                    ? 'border-emerald-500 shadow-emerald-500/25 ring-4 ring-emerald-500/10' 
                                                    : 'border-rose-500 shadow-rose-500/25 ring-4 ring-rose-500/10'
                                            }`}
                                        >
                                            {/* Status Badge & Icon */}
                                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                                                answerFeedback.isCorrect 
                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 animate-bounce' 
                                                    : 'bg-rose-500 text-white shadow-rose-500/30'
                                            }`}>
                                                {answerFeedback.isCorrect ? (
                                                    <CheckCircle2 size={36} className="stroke-[2.5]" />
                                                ) : (
                                                    <XCircle size={36} className="stroke-[2.5]" />
                                                )}
                                            </div>

                                            <div className="space-y-0.5">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                                    answerFeedback.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {answerFeedback.isCorrect ? 'Awesome!' : (answerFeedback.isTimeOut ? "Time's Up!" : "Incorrect!")}
                                                </span>
                                                <h4 className={`text-lg sm:text-xl font-black tracking-tight ${
                                                    answerFeedback.isCorrect ? 'text-emerald-600' : 'text-rose-600'
                                                }`}>
                                                    {answerFeedback.isCorrect ? 'CORRECT! 🎉' : 'INCORRECT! ❌'}
                                                </h4>
                                            </div>

                                            {/* Correct Answer Display */}
                                            <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-left">
                                                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider mb-0.5">
                                                    {answerFeedback.isCorrect ? 'Your Answer' : 'Correct Answer'}
                                                </span>
                                                <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                                                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                                    <span>{answerFeedback.correctText}</span>
                                                </span>
                                            </div>

                                            {/* Hint / Trivia Fact Display */}
                                            {answerFeedback.explanation && (
                                                <div className="w-full bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 text-left">
                                                    <span className="text-[10px] font-extrabold uppercase text-blue-700 flex items-center gap-1 mb-1">
                                                        <Lightbulb size={12} className="text-amber-500 shrink-0" />
                                                        <span>Trivia Hint & Fact</span>
                                                    </span>
                                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                                        {answerFeedback.explanation}
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* State B.5: Post-Quiz Full-Screen Sponsored Products Showcase */}
                    {quizStage === 'sponsored_showcase' && (
                        <div className="fixed inset-0 z-50 h-[100dvh] min-h-screen bg-slate-50/95 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] text-slate-900 flex flex-col justify-between overflow-y-auto">
                            {/* Top Sponsor Spotlight Header */}
                            <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 sticky top-0 z-30 shadow-2xs">
                                <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                                            {todaySponsor?.avatar_url ? (
                                                <Image
                                                    src={todaySponsor.avatar_url}
                                                    alt={todaySponsor?.merchants?.business_name || "Sponsor"}
                                                    fill
                                                    sizes="40px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                                                    {(todaySponsor?.merchants?.business_name || 'InTrust').slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Today's Official Sponsor</span>
                                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200/80">
                                                    <svg className="w-2.5 h-2.5 text-blue-600 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                                    <span>Verified Partner</span>
                                                </span>
                                            </div>
                                            <h3 className="text-sm sm:text-base font-black text-slate-950 truncate">
                                                {todaySponsor?.merchants?.business_name || "InTrust Partner Marketplace"}
                                            </h3>
                                        </div>
                                    </div>

                                    {todaySponsor?.products?.length > 1 && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs font-black text-slate-500 hidden sm:inline">
                                                Product {activeShowcaseIndex + 1} of {todaySponsor.products.length}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setActiveShowcaseIndex(prev => (prev - 1 + todaySponsor.products.length) % todaySponsor.products.length)}
                                                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
                                                    title="Previous Product"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setActiveShowcaseIndex(prev => (prev + 1) % todaySponsor.products.length)}
                                                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 transition cursor-pointer"
                                                    title="Next Product"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Centered Product Showcase Card */}
                            <div className="flex-1 flex flex-col justify-center max-w-lg sm:max-w-xl mx-auto w-full px-4 py-6 sm:py-8">
                                {(() => {
                                    const currentProd = todaySponsor?.products?.[activeShowcaseIndex] || todaySponsor?.products?.[0];
                                    if (!currentProd) return null;

                                    return (
                                        <motion.div
                                            key={activeShowcaseIndex}
                                            initial={{ opacity: 0, scale: 0.96 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.25 }}
                                            onMouseEnter={() => setIsShowcasePaused(true)}
                                            onMouseLeave={() => setIsShowcasePaused(false)}
                                            className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xl relative overflow-hidden"
                                        >
                                            {/* Top Tag & Discount Badge */}
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-black flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-blue-600" />
                                                    Daily Quiz Featured Special
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black">
                                                    Special Offer
                                                </span>
                                            </div>

                                            {/* Product Image Frame */}
                                            <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 mb-5 group">
                                                <Image
                                                    src={currentProd.image_url || '/icons/intrustLogo.png'}
                                                    alt={currentProd.product_name || 'Sponsored Product'}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, 550px"
                                                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                                                    priority
                                                />
                                            </div>

                                            {/* Product Title & Sponsor Store */}
                                            <div className="space-y-1.5 mb-4">
                                                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                                    Sold by {todaySponsor?.merchants?.business_name || 'Verified Merchant'}
                                                </div>
                                                <h2 className="text-lg sm:text-xl font-black text-slate-950 leading-snug">
                                                    {currentProd.product_name || 'Premium InTrust Product'}
                                                </h2>
                                                <div className="flex items-baseline gap-2 pt-1">
                                                    <span className="text-2xl sm:text-3xl font-black text-slate-950">
                                                        ₹{Number(currentProd.price || 499).toLocaleString('en-IN')}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 line-through">
                                                        ₹{(Number(currentProd.price || 499) * 1.25).toFixed(0)}
                                                    </span>
                                                    <span className="text-xs font-black text-emerald-600">
                                                        (20% OFF)
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Dot Indicators for multi-product */}
                                            {todaySponsor?.products?.length > 1 && (
                                                <div className="flex items-center justify-center gap-1.5 py-2 mb-4">
                                                    {todaySponsor.products.map((_, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setActiveShowcaseIndex(idx)}
                                                            className={`h-2 rounded-full transition-all cursor-pointer ${
                                                                idx === activeShowcaseIndex ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                                                            }`}
                                                            aria-label={`Showcase product ${idx + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Action Button: Merchant Role Check */}
                                            <div className="pt-2">
                                                {isMerchant ? (
                                                    <div className="w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 text-center shadow-2xs">
                                                        <Lock size={15} className="text-amber-600 shrink-0" />
                                                        <span>You cannot buy from other merchants (Merchant Account)</span>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={currentProd.slug ? `/shop/product/${currentProd.slug}` : `/shop/product/${currentProd.id}`}
                                                        target="_blank"
                                                        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer"
                                                    >
                                                        <ShoppingBag size={18} />
                                                        <span>Buy Now on Store →</span>
                                                    </Link>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })()}
                            </div>

                            {/* Sticky Bottom Bar to Proceed to Cashback & Streak Celebration */}
                            <div className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 sm:px-8 py-3.5 sticky bottom-0 z-30 shadow-lg">
                                <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="text-center sm:text-left">
                                        <span className="text-[11px] font-bold text-slate-500 block">Quiz Complete</span>
                                        <span className="text-sm font-black text-emerald-600 flex items-center gap-1 justify-center sm:justify-start">
                                            <Sparkles size={14} />
                                            ₹{completionResult?.reward_paise ? (completionResult.reward_paise / 100).toFixed(2) : dynamicReward.toFixed(2)} Ready to Claim
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setQuizStage('completed');
                                            setShowCashbackModal(true);
                                        }}
                                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-950/20 active:scale-95 transition-all cursor-pointer"
                                    >
                                        <span>Claim Cashback & Streak Bonus</span>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* State C: Already Completed / Completion Screen */}
                    {(quizStage === 'completed' || quizStage === 'already_completed') && (
                        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xl text-center space-y-4 sm:space-y-5">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20"
                                >
                                    <Trophy size={32} className="sm:w-10 sm:h-10 animate-bounce" />
                                </motion.div>

                                <div className="space-y-1.5">
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                        {quizStage === 'already_completed' ? "You're All Caught Up Today!" : "Challenge Completed!"}
                                    </h2>
                                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                                        {quizStage === 'already_completed'
                                            ? "You have solved today's quiz. Come back tomorrow after midnight IST for fresh challenges!"
                                            : `You scored ${score} out of ${activeQuestions.length}! Your streak is actively locked in.`}
                                    </p>
                                </div>

                                {/* Streak Counter Block */}
                                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-around">
                                    <div className="text-center">
                                        <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Current Streak</div>
                                        <div className="text-xl sm:text-2xl font-black text-orange-500 flex items-center justify-center gap-1 mt-0.5">
                                            <Flame size={18} className="animate-pulse" />
                                            {streakData.streak} Days
                                        </div>
                                    </div>
                                    <div className="w-px h-8 sm:h-10 bg-slate-200 dark:bg-slate-700" />
                                    <div className="text-center">
                                        <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Cashback Won</div>
                                        <div className="text-xl sm:text-2xl font-black text-emerald-500 flex items-center justify-center gap-1 mt-0.5">
                                            <Award size={18} />
                                            ₹{completionResult?.reward_paise ? (completionResult.reward_paise / 100).toFixed(2) : (todayPlay?.cashback_awarded_paise ? (todayPlay.cashback_awarded_paise / 100).toFixed(2) : dynamicReward.toFixed(2))}
                                        </div>
                                    </div>
                                </div>

                                {/* Reward Status Banner */}
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                                    <div className="text-left">
                                        <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-400">
                                            Reward Credited
                                        </span>
                                        <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                            + ₹{completionResult?.reward_paise ? (completionResult.reward_paise / 100).toFixed(2) : (todayPlay?.cashback_awarded_paise ? (todayPlay.cashback_awarded_paise / 100).toFixed(2) : dynamicReward.toFixed(2))} Cashback
                                        </div>
                                        {completionResult?.milestone_bonus_paise > 0 && (
                                            <span className="text-[10px] font-bold text-amber-600 block">
                                                (Includes ₹{(completionResult.milestone_bonus_paise / 100).toFixed(0)} streak milestone bonus!)
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-emerald-600">
                                        InTrust Wallet
                                    </span>
                                </div>

                                {/* Actionable Next-Step Redirects */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                    <Link
                                        href="/marketing/transactions"
                                        className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <Wallet size={14} />
                                        <span>View in Passbook</span>
                                    </Link>
                                    <Link
                                        href="/marketing/targets"
                                        className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <Gift size={14} />
                                        <span>Mystery Targets</span>
                                    </Link>
                                    <Link
                                        href="/marketing"
                                        className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <ChevronRight size={14} />
                                        <span>Marketing Hub</span>
                                    </Link>
                                </div>

                                {isMerchant && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <Link
                                            href="/marketing/daily-challenge/sponsor"
                                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100/80 transition-colors"
                                        >
                                            <Store size={14} />
                                            <span>Sponsor Tomorrow's Challenge & Lock Slot →</span>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Sponsor Featured Products Showcase (Products displayed LATER on completion screen) */}
                            {todaySponsor?.products && todaySponsor.products.length > 0 && (
                                <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5 dark:from-amber-950/30 dark:via-amber-900/20 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/60 text-left space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                    Featured Products from Today's Sponsor
                                                </span>
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                                                    ✓ Verified
                                                </span>
                                            </div>
                                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                                {todaySponsor?.merchants?.business_name || "Partner Store"}
                                            </h3>
                                        </div>
                                        <a
                                            href="/shop"
                                            className="text-xs font-black text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 shrink-0"
                                        >
                                            <span>Explore Shop</span>
                                            <ArrowRight size={12} />
                                        </a>
                                    </div>

                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {todaySponsor?.campaign_message || "Special rewards unlocked! Redeem your quiz cashback on these authentic verified products."}
                                    </p>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                        {todaySponsor.products.slice(0, 4).map((p) => (
                                            <div 
                                                key={p.id}
                                                className="group bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between"
                                            >
                                                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                                                    <Image
                                                        src={p.image_url || '/icons/intrustLogo.png'}
                                                        alt={p.product_name}
                                                        fill
                                                        sizes="(max-width: 640px) 50vw, 25vw"
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                                        {p.product_name}
                                                    </h4>
                                                    <div className="flex items-baseline justify-between gap-1">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                                            ₹{p.price}
                                                        </span>
                                                        <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                                            Cashback
                                                        </span>
                                                    </div>
                                                </div>
                                                <a
                                                    href={p.slug ? `/shop/product/${p.slug}` : '/shop'}
                                                    className="mt-2 w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black text-center transition-all block active:scale-95 shadow-xs"
                                                >
                                                    Shop Now
                                                </a>
                                            </div>
                                        ))}
                                    </div>
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* Left Column: Calendar & Booking Form */}
                            <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                                {/* Step 1: Select Date */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                            1
                                        </div>
                                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                            Select an Available Date
                                        </h3>
                                    </div>

                                    {/* Date Status Legend */}
                                    <div className="flex items-center gap-3 sm:gap-4 text-[11px] font-bold text-slate-500 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800 flex-wrap">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Available
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            Booked
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                                            Your Booking
                                        </span>
                                    </div>

                                    {/* Calendar Strip */}
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2">
                                        {calendarDays.map((day) => {
                                            const isSelected = selectedDate?.dateStr === day.dateStr;
                                            const isAvailable = day.status === 'available';
                                            return (
                                                <button
                                                    key={day.dateStr}
                                                    disabled={!isAvailable}
                                                    onClick={() => setSelectedDate(day)}
                                                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-center border transition-all ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 font-black'
                                                            : isAvailable
                                                            ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 text-slate-800 dark:text-slate-200'
                                                            : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <div className="text-[9px] font-extrabold uppercase opacity-75">
                                                        {day.dayName}
                                                    </div>
                                                    <div className="text-base font-black my-0.5">
                                                        {day.dayNum}
                                                    </div>
                                                    <div className="text-[9px] font-bold">
                                                        {day.monthName}
                                                    </div>
                                                    <div className="mt-0.5 text-[8px] sm:text-[9px] font-extrabold">
                                                        {day.status === 'available' ? 'AVAILABLE' : day.status === 'my_booking' ? 'YOURS' : 'BOOKED'}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 2: Select Up to 4 Store Products */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                                2
                                            </div>
                                            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                                Select Up to 4 Store Products ({selectedProducts.length} / 4)
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Inventory list picker */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
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
                                                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                            isPicked
                                                                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500'
                                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                                            {item.image_url && (
                                                                <img src={item.image_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                                            )}
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                {item.product_name || item.title || 'Product'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs font-black text-slate-900 dark:text-white">₹{item.price}</span>
                                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center text-xs ${
                                                                isPicked ? 'bg-blue-600 text-white' : 'border border-slate-300'
                                                            }`}>
                                                                {isPicked && <Check size={10} />}
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
                                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                                            3
                                        </div>
                                        <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                            Campaign Message (Optional)
                                        </h3>
                                    </div>
                                    <textarea
                                        value={campaignMessage}
                                        onChange={(e) => setCampaignMessage(e.target.value)}
                                        placeholder="e.g. Discover our fresh organic harvest & exclusive festival discounts!"
                                        rows={2}
                                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Pricing & Instant Checkout */}
                            <div className="space-y-4 sm:space-y-6">
                                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs sticky top-20 sm:top-24">
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200">
                                        Sponsorship Checkout
                                    </span>
                                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1.5 mb-3">
                                        Daily Challenge Sponsorship
                                    </h3>

                                    <div className="space-y-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                                                Instant Lock (Live)
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
                                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                                    paymentMethod === 'wallet'
                                                        ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-500 ring-1 ring-blue-500/30'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <Wallet size={15} className={paymentMethod === 'wallet' ? 'text-blue-600' : 'text-slate-400'} />
                                                    {paymentMethod === 'wallet' && <Check size={12} className="text-blue-600" />}
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">InTrust Wallet</span>
                                                <span className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                                                    ₹{((merchant?.wallet_balance_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setPaymentMethod('sabpaisa')}
                                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                                                    paymentMethod === 'sabpaisa'
                                                        ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-500 ring-1 ring-blue-500/30'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between w-full mb-1">
                                                    <CreditCard size={15} className={paymentMethod === 'sabpaisa' ? 'text-blue-600' : 'text-slate-400'} />
                                                    {paymentMethod === 'sabpaisa' && <Check size={12} className="text-blue-600" />}
                                                </div>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">SabPaisa Gateway</span>
                                                <span className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">UPI, Cards, NetBank</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="py-3 flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800">
                                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                                            Sponsorship Fee
                                        </span>
                                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
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
