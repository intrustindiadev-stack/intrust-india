'use client';

import { useState } from 'react';
import { 
    LayoutDashboard,
    Settings, 
    Trophy, 
    Calendar, 
    Target, 
    Truck, 
    FileText, 
    Save, 
    Plus, 
    Check, 
    AlertCircle, 
    Search, 
    ExternalLink, 
    Edit, 
    Trash2,
    Sparkles, 
    Gift, 
    X, 
    Package, 
    CheckCircle2,
    Building2,
    Briefcase,
    Cpu,
    Globe,
    Coffee,
    Film,
    Zap,
    ShieldCheck,
    Layers,
    Share2,
    Users,
    ArrowUpRight,
    BarChart3,
    Filter,
    Clock,
    BookOpen,
    Copy,
    Eye,
    Phone,
    Mail,
    MapPin,
    Tag,
    HelpCircle,
    Flame
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const CATEGORY_ICON_OPTIONS = [
    { name: 'Building2', label: 'Enterprise / Corporate', icon: Building2 },
    { name: 'Briefcase', label: 'Business & Brands', icon: Briefcase },
    { name: 'Cpu', label: 'Technology / Tech', icon: Cpu },
    { name: 'Globe', label: 'General Knowledge', icon: Globe },
    { name: 'BookOpen', label: 'Mythology & Culture', icon: BookOpen },
    { name: 'Trophy', label: 'Sports & Athletics', icon: Trophy },
    { name: 'Film', label: 'Entertainment & Cinema', icon: Film },
    { name: 'Coffee', label: 'Food & Lifestyle', icon: Coffee },
    { name: 'Zap', label: 'Innovation & Startups', icon: Zap },
    { name: 'ShieldCheck', label: 'Trust & Governance', icon: ShieldCheck },
    { name: 'Sparkles', label: 'Special & Mystery', icon: Sparkles },
    { name: 'Package', label: 'Commerce & Retail', icon: Package }
];

export default function AdminMarketingClient({
    initialRewardsConfig,
    initialStreakConfig,
    initialCategories,
    initialQuestions,
    initialSponsorships,
    initialTargets,
    initialClaims,
    initialTrackingLogs,
    initialMerchants = [],
    overviewStats = {}
}) {
    const [activeTab, setActiveTab] = useState('overview');

    // ─── 1. DYNAMIC CATEGORIES STATE & HANDLERS ───
    const [categoriesList, setCategoriesList] = useState(initialCategories || []);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [categoryForm, setCategoryForm] = useState({
        title: '',
        slug: '',
        icon_name: 'Building2',
        description: '',
        sort_order: (initialCategories?.length || 0) + 1,
        is_active: true
    });
    const [savingCategory, setSavingCategory] = useState(false);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!categoryForm.title.trim()) {
            alert('Please provide a category title');
            return;
        }

        setSavingCategory(true);
        try {
            const slug = categoryForm.slug.trim() || categoryForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const payload = {
                title: categoryForm.title.trim(),
                slug,
                icon_name: categoryForm.icon_name,
                description: categoryForm.description.trim() || null,
                sort_order: parseInt(categoryForm.sort_order, 10) || 0,
                is_active: categoryForm.is_active
            };

            const { data, error } = await supabase
                .from('daily_challenge_categories')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            setCategoriesList(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
            setIsAddCategoryModalOpen(false);
            setCategoryForm({
                title: '',
                slug: '',
                icon_name: 'Building2',
                description: '',
                sort_order: categoriesList.length + 2,
                is_active: true
            });
            alert(`Category "${data.title}" created successfully!`);
        } catch (err) {
            alert('Failed to create category: ' + err.message);
        } finally {
            setSavingCategory(false);
        }
    };

    // Category Edit & Detail States
    const [editingCategory, setEditingCategory] = useState(null);
    const [viewingCategory, setViewingCategory] = useState(null);

    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        if (!editingCategory?.title?.trim()) {
            alert('Please provide a category title');
            return;
        }

        setSavingCategory(true);
        try {
            const slug = editingCategory.slug?.trim() || editingCategory.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const payload = {
                title: editingCategory.title.trim(),
                slug,
                icon_name: editingCategory.icon_name || 'Building2',
                description: editingCategory.description?.trim() || null,
                sort_order: parseInt(editingCategory.sort_order, 10) || 0,
                is_active: editingCategory.is_active
            };

            const { error } = await supabase
                .from('daily_challenge_categories')
                .update(payload)
                .eq('id', editingCategory.id);

            if (error) throw error;

            setCategoriesList(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...payload } : c).sort((a, b) => a.sort_order - b.sort_order));
            setEditingCategory(null);
            alert('Category updated successfully!');
        } catch (err) {
            alert('Failed to update category: ' + err.message);
        } finally {
            setSavingCategory(false);
        }
    };

    const handleToggleCategoryStatus = async (cat) => {
        const updatedStatus = !cat.is_active;
        try {
            const { error } = await supabase
                .from('daily_challenge_categories')
                .update({ is_active: updatedStatus })
                .eq('id', cat.id);

            if (error) throw error;

            setCategoriesList(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: updatedStatus } : c));
        } catch (err) {
            alert('Failed to update category status: ' + err.message);
        }
    };

    const handleDeleteCategory = async (categoryId, title) => {
        if (!confirm(`Are you sure you want to delete "${title}"? Any questions attached to this category will also be removed.`)) return;
        try {
            const { error } = await supabase
                .from('daily_challenge_categories')
                .delete()
                .eq('id', categoryId);

            if (error) throw error;

            setCategoriesList(prev => prev.filter(c => c.id !== categoryId));
            setQuestionsList(prev => prev.filter(q => q.category_id !== categoryId));
            if (viewingCategory?.id === categoryId) setViewingCategory(null);
            alert('Category deleted.');
        } catch (err) {
            alert('Failed to delete category: ' + err.message);
        }
    };

    // ─── 2. DYNAMIC QUESTION BANK STATE & HANDLERS ───
    const [questionsList, setQuestionsList] = useState(initialQuestions || []);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
    const [questionSearch, setQuestionSearch] = useState('');
    const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
    const [questionForm, setQuestionForm] = useState({
        category_id: categoriesList[0]?.id || '',
        question: '',
        options: ['', '', '', ''],
        correct_option_index: 0,
        explanation: '',
        difficulty: 'medium',
        points: 10
    });
    const [savingQuestion, setSavingQuestion] = useState(false);

    // Question Edit & View States
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [viewingQuestion, setViewingQuestion] = useState(null);

    const handleCreateQuestion = async (e) => {
        e.preventDefault();
        if (!questionForm.question.trim()) {
            alert('Please enter question text');
            return;
        }
        if (questionForm.options.some(opt => !opt.trim())) {
            alert('Please fill out all 4 question options.');
            return;
        }

        setSavingQuestion(true);
        try {
            const payload = {
                category_id: questionForm.category_id || categoriesList[0]?.id,
                question: questionForm.question.trim(),
                options: questionForm.options.map(o => o.trim()),
                correct_option_index: parseInt(questionForm.correct_option_index, 10),
                explanation: questionForm.explanation.trim() || 'Educational insight provided by InTrust.',
                difficulty: questionForm.difficulty,
                points: parseInt(questionForm.points, 10) || 10,
                is_active: true
            };

            const { data, error } = await supabase
                .from('daily_challenge_questions')
                .insert(payload)
                .select('*, daily_challenge_categories(id, title, slug)')
                .single();

            if (error) throw error;

            setQuestionsList(prev => [data, ...prev]);
            setIsAddQuestionModalOpen(false);
            setQuestionForm({
                category_id: categoriesList[0]?.id || '',
                question: '',
                options: ['', '', '', ''],
                correct_option_index: 0,
                explanation: '',
                difficulty: 'medium',
                points: 10
            });
            alert('Question added successfully!');
        } catch (err) {
            alert('Failed to add question: ' + err.message);
        } finally {
            setSavingQuestion(false);
        }
    };

    const handleUpdateQuestion = async (e) => {
        e.preventDefault();
        if (!editingQuestion?.question?.trim()) {
            alert('Please enter question text');
            return;
        }
        if (editingQuestion.options?.some(opt => !opt.trim())) {
            alert('Please fill out all 4 question options.');
            return;
        }

        setSavingQuestion(true);
        try {
            const payload = {
                category_id: editingQuestion.category_id,
                question: editingQuestion.question.trim(),
                options: editingQuestion.options.map(o => o.trim()),
                correct_option_index: parseInt(editingQuestion.correct_option_index, 10),
                explanation: editingQuestion.explanation?.trim() || null,
                difficulty: editingQuestion.difficulty,
                points: parseInt(editingQuestion.points, 10) || 10,
                is_active: editingQuestion.is_active
            };

            const { error } = await supabase
                .from('daily_challenge_questions')
                .update(payload)
                .eq('id', editingQuestion.id);

            if (error) throw error;

            const categoryMatch = categoriesList.find(c => c.id === editingQuestion.category_id);
            setQuestionsList(prev => prev.map(q => q.id === editingQuestion.id ? { 
                ...q, 
                ...payload, 
                daily_challenge_categories: categoryMatch ? { id: categoryMatch.id, title: categoryMatch.title, slug: categoryMatch.slug } : q.daily_challenge_categories 
            } : q));
            setEditingQuestion(null);
            alert('Question updated successfully!');
        } catch (err) {
            alert('Failed to update question: ' + err.message);
        } finally {
            setSavingQuestion(false);
        }
    };

    const handleToggleQuestionStatus = async (q) => {
        const newStatus = !q.is_active;
        try {
            const { error } = await supabase
                .from('daily_challenge_questions')
                .update({ is_active: newStatus })
                .eq('id', q.id);

            if (error) throw error;

            setQuestionsList(prev => prev.map(item => item.id === q.id ? { ...item, is_active: newStatus } : item));
        } catch (err) {
            alert('Failed to update question status: ' + err.message);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!confirm('Are you sure you want to delete this question?')) return;
        try {
            const { error } = await supabase
                .from('daily_challenge_questions')
                .delete()
                .eq('id', questionId);

            if (error) throw error;

            setQuestionsList(prev => prev.filter(q => q.id !== questionId));
            if (viewingQuestion?.id === questionId) setViewingQuestion(null);
        } catch (err) {
            alert('Failed to delete question: ' + err.message);
        }
    };

    // ─── 3. DYNAMIC SETTINGS FORM ───
    const [config, setConfig] = useState({
        daily_challenge_reward: (initialRewardsConfig?.daily_challenge_reward_paise || 2500) / 100,
        campaign_share_bonus: (initialRewardsConfig?.campaign_share_bonus_paise || 5000) / 100,
        product_promo_default_cashback: (initialRewardsConfig?.product_promo_default_cashback_paise || 10000) / 100,
        sponsorship_fee: (initialRewardsConfig?.sponsorship_fee_paise || 99900) / 100,
        questions_per_challenge: initialRewardsConfig?.questions_per_challenge || 10
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        setSaveStatus(null);
        try {
            const payload = {
                daily_challenge_reward_paise: Math.round(config.daily_challenge_reward * 100),
                campaign_share_bonus_paise: Math.round(config.campaign_share_bonus * 100),
                product_promo_default_cashback_paise: Math.round(config.product_promo_default_cashback * 100),
                sponsorship_fee_paise: Math.round(config.sponsorship_fee * 100),
                questions_per_challenge: config.questions_per_challenge
            };

            const { error } = await supabase
                .from('marketing_settings')
                .upsert({
                    key: 'rewards_config',
                    value: payload,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            setSaveStatus({ success: true, message: 'Dynamic rewards configuration updated successfully!' });
        } catch (err) {
            setSaveStatus({ success: false, message: err.message || 'Failed to save configuration.' });
        } finally {
            setSavingSettings(false);
        }
    };

    // ─── 4. SPONSORSHIPS STATE & HANDLERS ───
    const [sponsorshipsList, setSponsorshipsList] = useState(initialSponsorships || []);
    const [selectedSponsorship, setSelectedSponsorship] = useState(null);
    const [isAddSponsorshipModalOpen, setIsAddSponsorshipModalOpen] = useState(false);
    const [sponsorshipForm, setSponsorshipForm] = useState({
        merchant_id: initialMerchants[0]?.id || '',
        sponsor_date: '',
        campaign_message: '',
        fee_rupees: 999,
        product_ids_str: '',
        status: 'booked'
    });
    const [savingSponsorship, setSavingSponsorship] = useState(false);

    const handleCreateSponsorship = async (e) => {
        e.preventDefault();
        if (!sponsorshipForm.merchant_id || !sponsorshipForm.sponsor_date) {
            alert('Please choose a merchant and sponsor date.');
            return;
        }

        setSavingSponsorship(true);
        try {
            const productIds = sponsorshipForm.product_ids_str
                ? sponsorshipForm.product_ids_str.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            const payload = {
                merchant_id: sponsorshipForm.merchant_id,
                sponsor_date: sponsorshipForm.sponsor_date,
                campaign_message: sponsorshipForm.campaign_message.trim() || null,
                fee_paise: Math.round((parseFloat(sponsorshipForm.fee_rupees) || 999) * 100),
                product_ids: productIds,
                status: sponsorshipForm.status
            };

            const { data, error } = await supabase
                .from('daily_challenge_sponsorships')
                .insert(payload)
                .select('*, merchants(id, business_name, business_phone, business_email, store_name, city, state)')
                .single();

            if (error) throw error;

            setSponsorshipsList(prev => [data, ...prev].sort((a, b) => new Date(b.sponsor_date) - new Date(a.sponsor_date)));
            setIsAddSponsorshipModalOpen(false);
            setSponsorshipForm({
                merchant_id: initialMerchants[0]?.id || '',
                sponsor_date: '',
                campaign_message: '',
                fee_rupees: 999,
                product_ids_str: '',
                status: 'booked'
            });
            alert('Sponsorship booking created successfully!');
        } catch (err) {
            alert('Failed to create sponsorship: ' + err.message);
        } finally {
            setSavingSponsorship(false);
        }
    };

    const handleUpdateSponsorshipStatus = async (sponsorshipId, newStatus) => {
        try {
            const { error } = await supabase
                .from('daily_challenge_sponsorships')
                .update({ status: newStatus })
                .eq('id', sponsorshipId);

            if (error) throw error;

            setSponsorshipsList(prev => prev.map(s => s.id === sponsorshipId ? { ...s, status: newStatus } : s));
            if (selectedSponsorship?.id === sponsorshipId) {
                setSelectedSponsorship(prev => ({ ...prev, status: newStatus }));
            }
            alert(`Sponsorship status updated to ${newStatus}.`);
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const handleDeleteSponsorship = async (sponsorshipId) => {
        if (!confirm('Are you sure you want to delete this sponsorship booking?')) return;
        try {
            const { error } = await supabase
                .from('daily_challenge_sponsorships')
                .delete()
                .eq('id', sponsorshipId);

            if (error) throw error;

            setSponsorshipsList(prev => prev.filter(s => s.id !== sponsorshipId));
            if (selectedSponsorship?.id === sponsorshipId) setSelectedSponsorship(null);
            alert('Sponsorship removed.');
        } catch (err) {
            alert('Failed to delete sponsorship: ' + err.message);
        }
    };

    // ─── 5. TARGETS STATE & HANDLERS ───
    const [targetsList, setTargetsList] = useState(initialTargets || []);
    const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);
    const [targetForm, setTargetForm] = useState({
        title: '',
        description: '',
        target_audience: 'customer',
        metric_type: 'share_links',
        target_value: 5,
        reward_type: 'cashback',
        reward_value_paise: 50000,
        gift_name: '',
        sort_order: targetsList.length + 1
    });
    const [savingTarget, setSavingTarget] = useState(false);

    // Target Edit & View States
    const [editingTarget, setEditingTarget] = useState(null);
    const [viewingTarget, setViewingTarget] = useState(null);

    const handleCreateTarget = async (e) => {
        e.preventDefault();
        if (!targetForm.title.trim()) {
            alert('Please enter target title');
            return;
        }

        setSavingTarget(true);
        try {
            const payload = {
                title: targetForm.title.trim(),
                description: targetForm.description.trim() || null,
                target_audience: targetForm.target_audience,
                metric_type: targetForm.metric_type,
                target_value: parseInt(targetForm.target_value, 10) || 1,
                reward_type: targetForm.reward_type,
                reward_value_paise: targetForm.reward_type === 'cashback' ? parseInt(targetForm.reward_value_paise, 10) : 0,
                gift_name: targetForm.reward_type === 'physical_gift' ? targetForm.gift_name.trim() : null,
                sort_order: parseInt(targetForm.sort_order, 10) || 1,
                is_active: true
            };

            const { data, error } = await supabase
                .from('marketing_targets')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            setTargetsList(prev => [...prev, data]);
            setIsAddTargetModalOpen(false);
            setTargetForm({
                title: '',
                description: '',
                target_audience: 'customer',
                metric_type: 'share_links',
                target_value: 5,
                reward_type: 'cashback',
                reward_value_paise: 50000,
                gift_name: '',
                sort_order: targetsList.length + 2
            });
            alert('Target created successfully!');
        } catch (err) {
            alert('Failed to create target: ' + err.message);
        } finally {
            setSavingTarget(false);
        }
    };

    const handleUpdateTarget = async (e) => {
        e.preventDefault();
        if (!editingTarget?.title?.trim()) {
            alert('Please enter target title');
            return;
        }

        setSavingTarget(true);
        try {
            const payload = {
                title: editingTarget.title.trim(),
                description: editingTarget.description?.trim() || null,
                target_audience: editingTarget.target_audience,
                metric_type: editingTarget.metric_type,
                target_value: parseInt(editingTarget.target_value, 10) || 1,
                reward_type: editingTarget.reward_type,
                reward_value_paise: editingTarget.reward_type === 'cashback' ? parseInt(editingTarget.reward_value_paise, 10) : 0,
                gift_name: editingTarget.reward_type === 'physical_gift' ? editingTarget.gift_name?.trim() : null,
                sort_order: parseInt(editingTarget.sort_order, 10) || 1,
                is_active: editingTarget.is_active
            };

            const { error } = await supabase
                .from('marketing_targets')
                .update(payload)
                .eq('id', editingTarget.id);

            if (error) throw error;

            setTargetsList(prev => prev.map(t => t.id === editingTarget.id ? { ...t, ...payload } : t).sort((a, b) => a.sort_order - b.sort_order));
            setEditingTarget(null);
            alert('Target updated successfully!');
        } catch (err) {
            alert('Failed to update target: ' + err.message);
        } finally {
            setSavingTarget(false);
        }
    };

    const handleToggleTargetStatus = async (t) => {
        const newStatus = !t.is_active;
        try {
            const { error } = await supabase
                .from('marketing_targets')
                .update({ is_active: newStatus })
                .eq('id', t.id);

            if (error) throw error;

            setTargetsList(prev => prev.map(item => item.id === t.id ? { ...item, is_active: newStatus } : item));
        } catch (err) {
            alert('Failed to update target status: ' + err.message);
        }
    };

    const handleDeleteTarget = async (targetId) => {
        if (!confirm('Are you sure you want to delete this target milestone?')) return;
        try {
            const { error } = await supabase
                .from('marketing_targets')
                .delete()
                .eq('id', targetId);

            if (error) throw error;

            setTargetsList(prev => prev.filter(t => t.id !== targetId));
            if (viewingTarget?.id === targetId) setViewingTarget(null);
            alert('Target deleted.');
        } catch (err) {
            alert('Failed to delete target: ' + err.message);
        }
    };

    // ─── 6. FULFILLMENT STATE ───
    const [claimsList, setClaimsList] = useState(initialClaims || []);
    const [claimFilterType, setClaimFilterType] = useState('all');
    const [claimFilterStatus, setClaimFilterStatus] = useState('all');
    const [claimSearch, setClaimSearch] = useState('');
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const [viewingClaim, setViewingClaim] = useState(null);
    const [selectedTrackingLog, setSelectedTrackingLog] = useState(null);
    const [newGiftAward, setNewGiftAward] = useState({
        user_id: '',
        user_type: 'customer',
        recipient_name: '',
        recipient_phone: '',
        shipping_address: '',
        gift_title: 'Exclusive Mystery Tech Gift Box',
        notes: 'Awarded by Admin for outstanding performance',
        status: 'earned'
    });
    const [submittingAward, setSubmittingAward] = useState(false);
    const [editingClaim, setEditingClaim] = useState(null);
    const [trackingForm, setTrackingForm] = useState({
        status: 'shipped',
        courier_name: 'Blue Dart',
        tracking_number: '',
        tracking_url: '',
        notes: ''
    });
    const [updatingTracking, setUpdatingTracking] = useState(false);

    const openEditTracking = (claim) => {
        setEditingClaim(claim);
        setTrackingForm({
            status: claim.status || 'processing',
            courier_name: claim.courier_name || 'Blue Dart',
            tracking_number: claim.tracking_number || '',
            tracking_url: claim.tracking_url || '',
            notes: claim.notes || ''
        });
    };

    const handleSaveTracking = async (e) => {
        e.preventDefault();
        if (!editingClaim) return;
        setUpdatingTracking(true);
        try {
            const { data, error } = await supabase
                .from('marketing_target_claims')
                .update({
                    status: trackingForm.status,
                    courier_name: trackingForm.courier_name || null,
                    tracking_number: trackingForm.tracking_number || null,
                    tracking_url: trackingForm.tracking_url || null,
                    notes: trackingForm.notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingClaim.id)
                .select()
                .single();

            if (error) throw error;
            setClaimsList(prev => prev.map(c => c.id === editingClaim.id ? { ...c, ...data } : c));
            setEditingClaim(null);
            alert(`Fulfillment status updated for ${data.gift_title || 'Gift'}!`);
        } catch (err) {
            alert('Error updating tracking: ' + err.message);
        } finally {
            setUpdatingTracking(false);
        }
    };

    const handleAwardGift = async (e) => {
        e.preventDefault();
        if (!newGiftAward.user_id || !newGiftAward.gift_title) {
            alert('Please provide at least a User ID and Gift Title.');
            return;
        }
        setSubmittingAward(true);
        try {
            const { data, error } = await supabase
                .from('marketing_target_claims')
                .insert({
                    user_id: newGiftAward.user_id.trim(),
                    user_type: newGiftAward.user_type,
                    gift_title: newGiftAward.gift_title,
                    recipient_name: newGiftAward.recipient_name || null,
                    recipient_phone: newGiftAward.recipient_phone || null,
                    shipping_address: newGiftAward.shipping_address || null,
                    status: newGiftAward.status,
                    notes: newGiftAward.notes || null
                })
                .select()
                .single();

            if (error) throw error;
            setClaimsList(prev => [data, ...prev]);
            setIsAwardModalOpen(false);
            setNewGiftAward({
                user_id: '',
                user_type: 'customer',
                recipient_name: '',
                recipient_phone: '',
                shipping_address: '',
                gift_title: 'Exclusive Mystery Tech Gift Box',
                notes: 'Awarded by Admin for outstanding performance',
                status: 'earned'
            });
            alert('Gift successfully awarded to winner!');
        } catch (err) {
            alert('Failed to award gift: ' + err.message);
        } finally {
            setSubmittingAward(false);
        }
    };

    // ─── 7. DYNAMIC STREAK CONFIGURATION (ADMIN / SUPER ADMIN) ───
    const [streakConfig, setStreakConfig] = useState(initialStreakConfig || {
        monthly_freezes_allowed: 1,
        milestones: [
            { days: 3, bonus_paise: 1000, badge: '3-Day Flame', active: true },
            { days: 7, bonus_paise: 3000, badge: 'Weekly Master', active: true },
            { days: 14, bonus_paise: 7500, badge: 'Bi-Weekly Champion', active: true },
            { days: 30, bonus_paise: 20000, badge: 'InTrust Legend', active: true }
        ]
    });
    const [savingStreakConfig, setSavingStreakConfig] = useState(false);
    const [streakSaveStatus, setStreakSaveStatus] = useState(null);

    const handleSaveStreakConfig = async () => {
        setSavingStreakConfig(true);
        setStreakSaveStatus(null);
        try {
            const payload = {
                monthly_freezes_allowed: parseInt(streakConfig.monthly_freezes_allowed, 10) || 1,
                milestones: (streakConfig.milestones || []).map(m => ({
                    days: parseInt(m.days, 10) || 1,
                    bonus_paise: Math.round(Number(m.bonus_paise || 0)),
                    badge: (m.badge || '').trim(),
                    active: !!m.active
                }))
            };

            const { error } = await supabase
                .from('marketing_settings')
                .upsert({
                    key: 'streak_config',
                    value: payload,
                    description: 'Dynamic streak milestones, freeze tokens, and bonus rewards'
                }, { onConflict: 'key' });

            if (error) throw error;
            setStreakSaveStatus({ success: true, message: 'Streak milestones & freeze settings updated successfully! Live in challenge RPC.' });
        } catch (err) {
            setStreakSaveStatus({ success: false, message: 'Failed to save streak settings: ' + err.message });
        } finally {
            setSavingStreakConfig(false);
        }
    };

    const handleAddStreakMilestone = () => {
        setStreakConfig(prev => ({
            ...prev,
            milestones: [
                ...(prev.milestones || []),
                { days: 5, bonus_paise: 2000, badge: 'Streak Achiever', active: true }
            ]
        }));
    };

    const handleRemoveStreakMilestone = (index) => {
        setStreakConfig(prev => ({
            ...prev,
            milestones: (prev.milestones || []).filter((_, idx) => idx !== index)
        }));
    };

    const handleMilestoneChange = (index, field, value) => {
        setStreakConfig(prev => {
            const updated = [...(prev.milestones || [])];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, milestones: updated };
        });
    };

    // Helper: Dynamic Category Icon Component
    const renderCategoryIcon = (iconName, size = 18) => {
        const found = CATEGORY_ICON_OPTIONS.find(o => o.name === iconName);
        const IconComponent = found?.icon || Layers;
        return <IconComponent size={size} />;
    };

    // Filtered Questions
    const filteredQuestions = questionsList.filter(q => {
        const matchCategory = selectedCategoryFilter === 'all' || q.category_id === selectedCategoryFilter;
        const matchSearch = !questionSearch || q.question.toLowerCase().includes(questionSearch.toLowerCase()) || (q.explanation && q.explanation.toLowerCase().includes(questionSearch.toLowerCase()));
        return matchCategory && matchSearch;
    });

    // Filtered Claims
    const filteredClaims = claimsList.filter(claim => {
        const matchType = claimFilterType === 'all' || claim.user_type === claimFilterType;
        const matchStatus = claimFilterStatus === 'all' || claim.status === claimFilterStatus;
        const matchSearch = !claimSearch || 
            (claim.recipient_name && claim.recipient_name.toLowerCase().includes(claimSearch.toLowerCase())) ||
            (claim.recipient_phone && claim.recipient_phone.includes(claimSearch)) ||
            (claim.gift_title && claim.gift_title.toLowerCase().includes(claimSearch.toLowerCase())) ||
            (claim.tracking_number && claim.tracking_number.toLowerCase().includes(claimSearch.toLowerCase()));
        return matchType && matchStatus && matchSearch;
    });

    return (
        <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* ─── ADMIN HEADER WITH LIVE INDICATORS ─── */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
                            Admin Command Center
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Engine
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
                        Marketing Control Center
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        Full administrative access to categories, question bank, sponsorship revenues, fulfillment & tracking.
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={() => setIsAddCategoryModalOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm transition-all"
                    >
                        <Building2 size={15} />
                        <span>New Category</span>
                    </button>
                    <button
                        onClick={() => setIsAddQuestionModalOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition-all"
                    >
                        <Plus size={15} />
                        <span>Add Question</span>
                    </button>
                </div>
            </div>

            {/* ─── NAVIGATION TABS ─── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-slate-800 scrollbar-none text-xs font-black">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'overview'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <LayoutDashboard size={15} />
                    <span>Executive Overview</span>
                </button>

                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'categories'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <Building2 size={15} />
                    <span>Categories ({categoriesList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('quiz')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'quiz'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <Trophy size={15} />
                    <span>Questions Bank ({questionsList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('sponsorships')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'sponsorships'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <Calendar size={15} />
                    <span>Sponsorships ({sponsorshipsList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('targets')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'targets'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <Target size={15} />
                    <span>Targets & Gifts ({targetsList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('fulfillment')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'fulfillment'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <Truck size={15} />
                    <span>Gift Fulfillment ({claimsList.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'settings'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <Settings size={15} />
                    <span>Dynamic Rewards Config</span>
                </button>

                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all ${
                        activeTab === 'logs'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                >
                    <FileText size={15} />
                    <span>Attribution Stream</span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* 1. EXECUTIVE OVERVIEW DASHBOARD                                           */}
            {/* ========================================================================= */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Stat Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {/* Total Reach */}
                        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Platform Reach</span>
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                                    <BarChart3 size={16} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {(overviewStats.totalClicks || 0).toLocaleString('en-IN')}
                                </span>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">Total Link Clicks Generated</p>
                            </div>
                        </div>

                        {/* Viral Share Links */}
                        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Share Links</span>
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                                    <Share2 size={16} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {(overviewStats.totalLinks || 0).toLocaleString('en-IN')}
                                </span>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    {(overviewStats.totalShares || 0)} Total Shares
                                </p>
                            </div>
                        </div>

                        {/* Sponsorship Revenue */}
                        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Sponsor Revenue</span>
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                                    <Calendar size={16} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    ₹{((overviewStats.totalSponsorshipRevenuePaise || 0) / 100).toLocaleString('en-IN')}
                                </span>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    {sponsorshipsList.length} Merchant Bookings
                                </p>
                            </div>
                        </div>

                        {/* Daily Challenge Engagement */}
                        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Quiz Plays</span>
                                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                                    <Trophy size={16} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {(overviewStats.totalPlays || 0).toLocaleString('en-IN')}
                                </span>
                                <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    Across {categoriesList.length} Categories
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Management Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Dynamic Categories Card */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                        Categories & Segments
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{categoriesList.length} Total</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Dynamic Categories
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Create segments like Enterprise, Startups, Indian Heritage, or Tech to target specific audiences.
                                </p>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <button
                                    onClick={() => setActiveTab('categories')}
                                    className="text-xs font-black text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <span>Manage Categories</span>
                                    <ArrowUpRight size={14} />
                                </button>
                                <button
                                    onClick={() => setIsAddCategoryModalOpen(true)}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 text-xs font-bold hover:bg-indigo-100"
                                >
                                    + Add New
                                </button>
                            </div>
                        </div>

                        {/* Questions Repository Card */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                                        Daily Challenge
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">{questionsList.length} Questions</span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Question Bank
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Curate questions with 4 options, difficulty tiers, points, and educational cultural flashcards.
                                </p>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <button
                                    onClick={() => setActiveTab('quiz')}
                                    className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <span>Open Question Bank</span>
                                    <ArrowUpRight size={14} />
                                </button>
                                <button
                                    onClick={() => setIsAddQuestionModalOpen(true)}
                                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 text-xs font-bold hover:bg-blue-100"
                                >
                                    + Add Question
                                </button>
                            </div>
                        </div>

                        {/* Fulfillment Status Card */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                                        Rewards Logistics
                                    </span>
                                    <span className="text-xs font-bold text-amber-600">
                                        {overviewStats.pendingClaimsCount || 0} Pending
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Gift Fulfillment
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Track mystery physical gift boxes, input Blue Dart/courier AWB tracking numbers, and award winners.
                                </p>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <button
                                    onClick={() => setActiveTab('fulfillment')}
                                    className="text-xs font-black text-amber-600 hover:underline flex items-center gap-1"
                                >
                                    <span>Manage Shipments</span>
                                    <ArrowUpRight size={14} />
                                </button>
                                <button
                                    onClick={() => setIsAwardModalOpen(true)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 text-xs font-bold hover:bg-amber-100"
                                >
                                    Award Gift
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2. DYNAMIC CATEGORIES MANAGEMENT (NEW)                                   */}
            {/* ========================================================================= */}
            {activeTab === 'categories' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Dynamic Marketing Categories ({categoriesList.length})
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Create new custom categories such as <strong>Enterprise</strong>, <strong>B2B Commerce</strong>, or <strong>Culture</strong>.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddCategoryModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black self-start sm:self-auto shadow-sm"
                            >
                                <Plus size={15} />
                                <span>Add Category</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoriesList.map((cat) => (
                                <div
                                    key={cat.id}
                                    className={`p-4 rounded-2xl border transition-all ${
                                        cat.is_active
                                            ? 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                            : 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-200/40 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                                                {renderCategoryIcon(cat.icon_name, 16)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                                    {cat.title}
                                                </h4>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    slug: {cat.slug}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                            cat.is_active
                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {cat.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>

                                    {cat.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                            {cat.description}
                                        </p>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold">
                                        <span className="text-[10px] text-slate-400">Order: #{cat.sort_order}</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setViewingCategory(cat)}
                                                className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                                                title="View Category Details"
                                            >
                                                <Eye size={13} />
                                            </button>
                                            <button
                                                onClick={() => setEditingCategory({ ...cat })}
                                                className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                                                title="Edit Category"
                                            >
                                                <Edit size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleCategoryStatus(cat)}
                                                className="text-[11px] text-blue-600 hover:underline font-bold px-1"
                                            >
                                                {cat.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id, cat.title)}
                                                className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                title="Delete Category"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. DAILY CHALLENGE & QUESTIONS REPOSITORY                                */}
            {/* ========================================================================= */}
            {activeTab === 'quiz' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Question Bank Repository ({filteredQuestions.length})
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Manage challenge questions, multiple-choice options, and cultural explanations.
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap">
                                {/* Category Filter */}
                                <select
                                    value={selectedCategoryFilter}
                                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                >
                                    <option value="all">All Categories ({categoriesList.length})</option>
                                    {categoriesList.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>

                                {/* Search */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={questionSearch}
                                        onChange={(e) => setQuestionSearch(e.target.value)}
                                        placeholder="Search questions..."
                                        className="pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                                    />
                                </div>

                                <button
                                    onClick={() => setIsAddQuestionModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm"
                                >
                                    <Plus size={14} />
                                    <span>Add Question</span>
                                </button>
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredQuestions.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                                    No questions found matching your filter.
                                </div>
                            ) : (
                                filteredQuestions.map((q, idx) => (
                                    <div key={q.id || idx} className="py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-2xl transition-all">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                                                        {q.daily_challenge_categories?.title || 'Category'}
                                                    </span>
                                                    <span className="text-[9px] font-extrabold uppercase text-slate-400">
                                                        {q.difficulty || 'Medium'} • {q.points || 10} pts
                                                    </span>
                                                </div>
                                                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                                    {q.question}
                                                </h4>

                                                {/* Options grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
                                                    {q.options?.map((opt, oIdx) => (
                                                        <div
                                                            key={oIdx}
                                                            className={`p-2 rounded-xl text-xs font-bold border ${
                                                                oIdx === q.correct_option_index
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                                            }`}
                                                        >
                                                            <span className="font-mono text-[10px] mr-1 opacity-70">
                                                                {['A', 'B', 'C', 'D'][oIdx]}:
                                                            </span>
                                                            <span>{opt}</span>
                                                            {oIdx === q.correct_option_index && (
                                                                <Check size={12} className="inline ml-1 text-emerald-600" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {q.explanation && (
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                                                        <strong>Flashcard Insight:</strong> {q.explanation}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => setViewingQuestion(q)}
                                                    className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="View Full Question Details"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingQuestion({ ...q, options: [...(q.options || ['', '', '', ''])] })}
                                                    className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="Edit Question"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleQuestionStatus(q)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        q.is_active 
                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                    title="Toggle Active Status"
                                                >
                                                    {q.is_active ? 'Active' : 'Draft'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title="Delete question"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 4. SPONSORSHIP BOOKINGS SCHEDULE                                         */}
            {/* ========================================================================= */}
            {activeTab === 'sponsorships' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                Merchant Sponsorship Schedule ({sponsorshipsList.length})
                            </h3>
                            <p className="text-xs text-slate-500">Track paid date takeovers, merchant details, tagged products, and live campaigns.</p>
                        </div>
                        <button
                            onClick={() => setIsAddSponsorshipModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm self-start sm:self-auto"
                        >
                            <Plus size={14} />
                            <span>Book Sponsorship</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-extrabold text-[10px]">
                                    <th className="pb-3">Sponsor Date</th>
                                    <th className="pb-3">Merchant</th>
                                    <th className="pb-3">Campaign Message</th>
                                    <th className="pb-3">Fee Paid</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                                {sponsorshipsList.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-3 font-extrabold text-slate-900 dark:text-white">{s.sponsor_date}</td>
                                        <td className="py-3 font-bold">
                                            <div>{s.merchants?.business_name || 'Store'}</div>
                                            <div className="text-[10px] text-slate-400 font-normal">{s.merchants?.business_phone || s.merchant_id?.slice(0, 8)}</div>
                                        </td>
                                        <td className="py-3 max-w-xs truncate">{s.campaign_message || 'N/A'}</td>
                                        <td className="py-3 font-black text-emerald-600">₹{(s.fee_paise / 100).toFixed(0)}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                s.status === 'live' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedSponsorship(s)}
                                                    className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    title="View Full Sponsorship Details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <select
                                                    value={s.status}
                                                    onChange={(e) => handleUpdateSponsorshipStatus(s.id, e.target.value)}
                                                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold border-none"
                                                >
                                                    <option value="booked">Booked</option>
                                                    <option value="live">Live</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteSponsorship(s.id)}
                                                    className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    title="Remove Sponsorship"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 5. TARGETS & MYSTERY GIFTS                                               */}
            {/* ========================================================================= */}
            {activeTab === 'targets' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                                Configured Targets ({targetsList.length})
                            </h3>
                            <p className="text-xs text-slate-500">Milestones that unlock cashbacks or physical gift boxes.</p>
                        </div>
                        <button
                            onClick={() => setIsAddTargetModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs"
                        >
                            <Plus size={14} />
                            <span>New Target</span>
                        </button>
                    </div>

                    <div className="space-y-3">
                        {targetsList.map((t) => (
                            <div key={t.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold uppercase text-slate-400">
                                            Audience: {t.target_audience} • Metric: {t.metric_type} ({t.target_value})
                                        </span>
                                        <span className={`text-[9px] font-black px-2 py-0.2 rounded uppercase ${
                                            t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            {t.is_active ? 'Active' : 'Draft'}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                                        {t.title}
                                    </h4>
                                    {t.description && (
                                        <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                    <span className="text-xs font-black text-emerald-600">
                                        {t.reward_type === 'cashback' ? `₹${(t.reward_value_paise || 0) / 100} Cashback` : `🎁 ${t.gift_name}`}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setViewingTarget(t)}
                                            className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            title="View Target Details"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => setEditingTarget({ ...t })}
                                            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            title="Edit Target"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleTargetStatus(t)}
                                            className="text-[11px] text-blue-600 hover:underline font-bold px-1"
                                        >
                                            {t.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTarget(t.id)}
                                            className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                            title="Delete Target"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 6. GIFT FULFILLMENT MANAGEMENT                                           */}
            {/* ========================================================================= */}
            {activeTab === 'fulfillment' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Physical Gift Claims & Fulfillment
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Track shipments, update Blue Dart / DTDC AWB numbers, and award winners.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAwardModalOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs self-start sm:self-auto shadow-sm"
                            >
                                <Gift size={14} />
                                <span>Award Manual Gift</span>
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex items-center gap-3 flex-wrap mb-4 text-xs font-bold">
                            <select
                                value={claimFilterStatus}
                                onChange={(e) => setClaimFilterStatus(e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                                <option value="all">All Statuses</option>
                                <option value="earned">Earned (Unfulfilled)</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                            </select>

                            <select
                                value={claimFilterType}
                                onChange={(e) => setClaimFilterType(e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                                <option value="all">All Audiences</option>
                                <option value="customer">Customer Winners</option>
                                <option value="merchant">Merchant Winners</option>
                            </select>

                            <input
                                type="text"
                                value={claimSearch}
                                onChange={(e) => setClaimSearch(e.target.value)}
                                placeholder="Search recipient, phone or AWB..."
                                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                                        <th className="pb-3">Winner & Role</th>
                                        <th className="pb-3">Gift Item</th>
                                        <th className="pb-3">Shipping Address</th>
                                        <th className="pb-3">Courier / AWB</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                                    {filteredClaims.map((claim) => (
                                        <tr key={claim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="py-3">
                                                <div className="font-extrabold text-slate-900 dark:text-white">
                                                    {claim.recipient_name || 'Anonymous Winner'}
                                                </div>
                                                <span className="text-[10px] text-slate-400">
                                                    {claim.recipient_phone || claim.user_id.slice(0, 8)} • {claim.user_type}
                                                </span>
                                            </td>
                                            <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">
                                                {claim.gift_title || claim.marketing_targets?.gift_name || 'Mystery Gift Box'}
                                            </td>
                                            <td className="py-3 max-w-xs truncate text-[11px] text-slate-500">
                                                {claim.shipping_address || 'Address pending from user'}
                                            </td>
                                            <td className="py-3 font-mono text-[11px]">
                                                {claim.tracking_number ? (
                                                    <span className="text-emerald-600 font-bold">
                                                        {claim.courier_name}: {claim.tracking_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Not Shipped</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                                    claim.status === 'delivered'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : claim.status === 'shipped'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {claim.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setViewingClaim(claim)}
                                                        className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        title="View Recipient & Delivery Details"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditTracking(claim)}
                                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                                                    >
                                                        Edit Tracking
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 7. DYNAMIC CASHBACKS, REWARDS & STREAK SETTINGS                           */}
            {/* ========================================================================= */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* CARD 1: BASE REWARDS & FEES */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
                                Global Parameters
                            </span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                                Dynamic Cashbacks & Fees
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Update rewards in real-time. Changes apply instantly to live marketing campaigns, challenges, and payouts.
                            </p>
                        </div>

                        {saveStatus && (
                            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                                saveStatus.success 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                                {saveStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                <span>{saveStatus.message}</span>
                            </div>
                        )}

                        <div className="space-y-4 text-xs font-bold">
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Daily Challenge Base Completion Reward (₹)
                                </label>
                                <input
                                    type="number"
                                    value={config.daily_challenge_reward}
                                    onChange={(e) => setConfig(prev => ({ ...prev, daily_challenge_reward: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Campaign Link Share Bonus (₹)
                                </label>
                                <input
                                    type="number"
                                    value={config.campaign_share_bonus}
                                    onChange={(e) => setConfig(prev => ({ ...prev, campaign_share_bonus: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Product Promotion Default Cashback (₹)
                                </label>
                                <input
                                    type="number"
                                    value={config.product_promo_default_cashback}
                                    onChange={(e) => setConfig(prev => ({ ...prev, product_promo_default_cashback: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Daily Challenge Merchant Sponsorship Fee (₹)
                                </label>
                                <input
                                    type="number"
                                    value={config.sponsorship_fee}
                                    onChange={(e) => setConfig(prev => ({ ...prev, sponsorship_fee: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/25 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <Save size={16} />
                            <span>{savingSettings ? 'Saving Changes...' : 'Save Rewards Config'}</span>
                        </button>
                    </div>

                    {/* CARD 2: DYNAMIC STREAK & FREEZE SYSTEM CONTROLS (ADMIN / SUPER ADMIN) */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-600 border border-orange-200 dark:border-orange-800">
                                    <Flame size={12} className="text-orange-500" />
                                    <span>Gamification Engine</span>
                                </span>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                                    Streak Milestones & Freeze Config
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Dynamic streak bonuses and freeze protections. Evaluated atomically inside database RPCs.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddStreakMilestone}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 text-xs font-black shrink-0 transition-all"
                            >
                                <Plus size={14} />
                                <span>Add Milestone</span>
                            </button>
                        </div>

                        {streakSaveStatus && (
                            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                                streakSaveStatus.success 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}>
                                {streakSaveStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                <span>{streakSaveStatus.message}</span>
                            </div>
                        )}

                        {/* Monthly Freeze Allowance */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                            <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                                Monthly Streak Freeze Tokens Allowed per User
                            </label>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                If a user misses a single day, a freeze token automatically shields their active streak from resetting.
                            </p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    value={streakConfig.monthly_freezes_allowed ?? 1}
                                    onChange={(e) => setStreakConfig(prev => ({ ...prev, monthly_freezes_allowed: parseInt(e.target.value, 10) || 0 }))}
                                    className="w-24 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                                />
                                <span className="text-xs font-semibold text-slate-500">Tokens / Calendar Month</span>
                            </div>
                        </div>

                        {/* Milestones List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Configured Streak Milestones ({(streakConfig.milestones || []).length})
                            </h4>

                            <div className="space-y-2.5">
                                {(streakConfig.milestones || []).map((m, idx) => (
                                    <div 
                                        key={idx} 
                                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black text-[11px] flex items-center justify-center">
                                                    #{idx + 1}
                                                </span>
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                    {m.days} Consecutive Days
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!m.active}
                                                        onChange={(e) => handleMilestoneChange(idx, 'active', e.target.checked)}
                                                        className="rounded text-orange-600 focus:ring-orange-500"
                                                    />
                                                    <span>Active</span>
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveStreakMilestone(idx)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    title="Remove Milestone"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Target Days</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={m.days}
                                                    onChange={(e) => handleMilestoneChange(idx, 'days', parseInt(e.target.value, 10) || 1)}
                                                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-black"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Bonus Reward (₹)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={(m.bonus_paise || 0) / 100}
                                                    onChange={(e) => handleMilestoneChange(idx, 'bonus_paise', Math.round((parseFloat(e.target.value) || 0) * 100))}
                                                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-black text-emerald-600 dark:text-emerald-400"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Milestone Badge</label>
                                                <input
                                                    type="text"
                                                    value={m.badge || ''}
                                                    placeholder="e.g. 7-Day Flame"
                                                    onChange={(e) => handleMilestoneChange(idx, 'badge', e.target.value)}
                                                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveStreakConfig}
                            disabled={savingStreakConfig}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 disabled:opacity-50 transition-all active:scale-95"
                        >
                            <Save size={16} />
                            <span>{savingStreakConfig ? 'Saving Milestones...' : 'Save Streak Configuration'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 8. ATTRIBUTION & EVENT LOGS                                              */}
            {/* ========================================================================= */}
            {activeTab === 'logs' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">
                        Live Tracking Event Stream (Audit Log)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                                    <th className="pb-3">Timestamp</th>
                                    <th className="pb-3">Event Type</th>
                                    <th className="pb-3">Link Code</th>
                                    <th className="pb-3">IP</th>
                                    <th className="pb-3">Payload</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {initialTrackingLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="py-2.5 text-slate-400">{new Date(log.created_at).toLocaleTimeString('en-IN')}</td>
                                        <td className="py-2.5 font-bold text-blue-600">{log.event_type}</td>
                                        <td className="py-2.5 font-bold">{log.marketing_share_links?.code || 'N/A'}</td>
                                        <td className="py-2.5 text-slate-400">{log.visitor_ip || '127.0.0.1'}</td>
                                        <td className="py-2.5 text-slate-500 max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
                                        <td className="py-2.5 text-right">
                                            <button
                                                onClick={() => setSelectedTrackingLog(log)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-sans font-bold inline-flex items-center gap-1"
                                            >
                                                <Eye size={12} />
                                                <span>Inspect</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── MODAL: CREATE CATEGORY (DYNAMIC) ─── */}
            {isAddCategoryModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Building2 size={18} className="text-indigo-600" />
                                <span>Create Marketing Category</span>
                            </h3>
                            <button onClick={() => setIsAddCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Category Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.title}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCategoryForm(prev => ({
                                            ...prev,
                                            title: val,
                                            slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                                        }));
                                    }}
                                    placeholder="e.g. Enterprise & Industry"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Slug (URL Identifier)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.slug}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                                    placeholder="e.g. enterprise"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Category Icon
                                </label>
                                <select
                                    value={categoryForm.icon_name}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon_name: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                >
                                    {CATEGORY_ICON_OPTIONS.map(opt => (
                                        <option key={opt.name} value={opt.name}>
                                            {opt.label} ({opt.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Corporate giants, Indian unicorns, supply chain, and B2B commerce."
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="flex items-center gap-4 pt-1">
                                <div className="flex-1">
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Sort Order
                                    </label>
                                    <input
                                        type="number"
                                        value={categoryForm.sort_order}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 1 }))}
                                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input
                                        type="checkbox"
                                        id="cat_active"
                                        checked={categoryForm.is_active}
                                        onChange={(e) => setCategoryForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="cat_active" className="font-bold text-slate-700 dark:text-slate-300">
                                        Active
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddCategoryModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingCategory}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingCategory ? 'Creating...' : 'Create Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: ADD QUESTION (DYNAMIC) ─── */}
            {isAddQuestionModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Trophy size={18} className="text-blue-600" />
                                <span>Add New Quiz Question</span>
                            </h3>
                            <button onClick={() => setIsAddQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateQuestion} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Target Category *
                                </label>
                                <select
                                    value={questionForm.category_id}
                                    onChange={(e) => setQuestionForm(prev => ({ ...prev, category_id: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                >
                                    {categoriesList.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} ({c.slug})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Question Text *
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={questionForm.question}
                                    onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                                    placeholder="e.g. Which Indian conglomerate founded Tata Steel in 1907?"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                                />
                            </div>

                            {/* 4 Options */}
                            <div className="space-y-2">
                                <label className="block font-bold text-slate-700 dark:text-slate-300">
                                    Answer Options (Mark Correct Answer) *
                                </label>
                                {['A', 'B', 'C', 'D'].map((label, idx) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct_option"
                                            checked={questionForm.correct_option_index === idx}
                                            onChange={() => setQuestionForm(prev => ({ ...prev, correct_option_index: idx }))}
                                            className="text-blue-600"
                                            title={`Mark option ${label} as correct answer`}
                                        />
                                        <span className="font-mono font-bold w-4 text-slate-400">{label}:</span>
                                        <input
                                            type="text"
                                            required
                                            value={questionForm.options[idx]}
                                            onChange={(e) => {
                                                const newOpts = [...questionForm.options];
                                                newOpts[idx] = e.target.value;
                                                setQuestionForm(prev => ({ ...prev, options: newOpts }));
                                            }}
                                            placeholder={`Option ${label}`}
                                            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Educational Insight / Flashcard Explanation
                                </label>
                                <textarea
                                    rows={2}
                                    value={questionForm.explanation}
                                    onChange={(e) => setQuestionForm(prev => ({ ...prev, explanation: e.target.value }))}
                                    placeholder="Shown to the user immediately after answering to teach Indian heritage & commerce."
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={questionForm.difficulty}
                                        onChange={(e) => setQuestionForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Points
                                    </label>
                                    <input
                                        type="number"
                                        value={questionForm.points}
                                        onChange={(e) => setQuestionForm(prev => ({ ...prev, points: parseInt(e.target.value, 10) || 10 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddQuestionModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingQuestion}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingQuestion ? 'Adding...' : 'Add Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: CREATE TARGET (DYNAMIC) ─── */}
            {isAddTargetModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Target size={18} className="text-blue-600" />
                                <span>Create Performance Target</span>
                            </h3>
                            <button onClick={() => setIsAddTargetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTarget} className="space-y-3 text-xs font-bold">
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">Target Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={targetForm.title}
                                    onChange={(e) => setTargetForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Share 10 Verified Products"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Audience</label>
                                    <select
                                        value={targetForm.target_audience}
                                        onChange={(e) => setTargetForm(prev => ({ ...prev, target_audience: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="merchant">Merchant</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Metric</label>
                                    <select
                                        value={targetForm.metric_type}
                                        onChange={(e) => setTargetForm(prev => ({ ...prev, metric_type: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="share_links">Share Links</option>
                                        <option value="quiz_streak">Quiz Streak</option>
                                        <option value="store_sales">Store Sales</option>
                                        <option value="link_clicks">Link Clicks</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Target Value</label>
                                    <input
                                        type="number"
                                        value={targetForm.target_value}
                                        onChange={(e) => setTargetForm(prev => ({ ...prev, target_value: parseInt(e.target.value, 10) || 1 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Reward Type</label>
                                    <select
                                        value={targetForm.reward_type}
                                        onChange={(e) => setTargetForm(prev => ({ ...prev, reward_type: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="cashback">Cashback (₹)</option>
                                        <option value="physical_gift">Physical Gift</option>
                                    </select>
                                </div>
                            </div>

                            {targetForm.reward_type === 'cashback' ? (
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Cashback Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={targetForm.reward_value_paise / 100}
                                        onChange={(e) => setTargetForm(prev => ({ ...prev, reward_value_paise: (parseFloat(e.target.value) || 0) * 100 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Physical Gift Item Name</label>
                                    <input
                                        type="text"
                                        value={targetForm.gift_name}
                                        onChange={(e) => setTargetForm(prev => ({ ...prev, gift_name: e.target.value }))}
                                        placeholder="e.g. Wireless Smart Earbuds"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddTargetModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingTarget}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingTarget ? 'Saving...' : 'Create Target'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: AWARD MANUAL GIFT ─── */}
            {isAwardModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Gift size={18} className="text-indigo-600" />
                                <span>Award Manual Gift to Winner</span>
                            </h3>
                            <button onClick={() => setIsAwardModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAwardGift} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">User ID *</label>
                                <input
                                    type="text"
                                    required
                                    value={newGiftAward.user_id}
                                    onChange={(e) => setNewGiftAward(prev => ({ ...prev, user_id: e.target.value }))}
                                    placeholder="UUID of Customer or Merchant"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Winner Role</label>
                                    <select
                                        value={newGiftAward.user_type}
                                        onChange={(e) => setNewGiftAward(prev => ({ ...prev, user_type: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="merchant">Merchant</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        value={newGiftAward.status}
                                        onChange={(e) => setNewGiftAward(prev => ({ ...prev, status: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    >
                                        <option value="earned">Earned (Unfulfilled)</option>
                                        <option value="processing">Processing</option>
                                        <option value="shipped">Shipped</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gift Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={newGiftAward.gift_title}
                                    onChange={(e) => setNewGiftAward(prev => ({ ...prev, gift_title: e.target.value }))}
                                    placeholder="e.g. Mystery Tech Box / Smart Earbuds"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Recipient Name</label>
                                    <input
                                        type="text"
                                        value={newGiftAward.recipient_name}
                                        onChange={(e) => setNewGiftAward(prev => ({ ...prev, recipient_name: e.target.value }))}
                                        placeholder="Full Name"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={newGiftAward.recipient_phone}
                                        onChange={(e) => setNewGiftAward(prev => ({ ...prev, recipient_phone: e.target.value }))}
                                        placeholder="+91..."
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Address</label>
                                <textarea
                                    rows={2}
                                    value={newGiftAward.shipping_address}
                                    onChange={(e) => setNewGiftAward(prev => ({ ...prev, shipping_address: e.target.value }))}
                                    placeholder="Full delivery address with pincode..."
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAwardModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingAward}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {submittingAward ? 'Awarding...' : 'Award Gift'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: EDIT COURIER TRACKING ─── */}
            {editingClaim && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Truck size={18} className="text-blue-600" />
                                <span>Update Courier & Fulfillment</span>
                            </h3>
                            <button onClick={() => setEditingClaim(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTracking} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Fulfillment Status
                                </label>
                                <select
                                    value={trackingForm.status}
                                    onChange={(e) => setTrackingForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                >
                                    <option value="earned">Earned (Unfulfilled)</option>
                                    <option value="processing">Processing & Packing</option>
                                    <option value="shipped">Shipped via Courier</option>
                                    <option value="delivered">Delivered to Winner</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Courier Partner
                                    </label>
                                    <select
                                        value={trackingForm.courier_name}
                                        onChange={(e) => setTrackingForm(prev => ({ ...prev, courier_name: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    >
                                        <option value="Blue Dart">Blue Dart</option>
                                        <option value="Delhivery">Delhivery</option>
                                        <option value="DTDC">DTDC</option>
                                        <option value="India Post">India Post</option>
                                        <option value="Shadowfax">Shadowfax</option>
                                        <option value="Hand Delivered">Hand Delivered</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        AWB / Tracking No.
                                    </label>
                                    <input
                                        type="text"
                                        value={trackingForm.tracking_number}
                                        onChange={(e) => setTrackingForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                                        placeholder="e.g. 748392019"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Direct Tracking URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={trackingForm.tracking_url}
                                    onChange={(e) => setTrackingForm(prev => ({ ...prev, tracking_url: e.target.value }))}
                                    placeholder="https://www.bluedart.com/tracking?awb=..."
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Fulfillment Notes
                                </label>
                                <textarea
                                    rows={2}
                                    value={trackingForm.notes}
                                    onChange={(e) => setTrackingForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Dispatched via air express. Estimated arrival within 48h."
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingClaim(null)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingTracking}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {updatingTracking ? 'Saving...' : 'Save & Publish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: EDIT CATEGORY (DYNAMIC) ─── */}
            {editingCategory && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit size={18} className="text-indigo-600" />
                                <span>Edit Category</span>
                            </h3>
                            <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateCategory} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Category Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingCategory.title || ''}
                                    onChange={(e) => setEditingCategory(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Slug (URL Identifier)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingCategory.slug || ''}
                                    onChange={(e) => setEditingCategory(prev => ({ ...prev, slug: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Category Icon
                                </label>
                                <select
                                    value={editingCategory.icon_name || 'Building2'}
                                    onChange={(e) => setEditingCategory(prev => ({ ...prev, icon_name: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                >
                                    {CATEGORY_ICON_OPTIONS.map(opt => (
                                        <option key={opt.name} value={opt.name}>
                                            {opt.label} ({opt.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingCategory.description || ''}
                                    onChange={(e) => setEditingCategory(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="flex items-center gap-4 pt-1">
                                <div className="flex-1">
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Sort Order
                                    </label>
                                    <input
                                        type="number"
                                        value={editingCategory.sort_order ?? 1}
                                        onChange={(e) => setEditingCategory(prev => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <input
                                        type="checkbox"
                                        id="edit_cat_active"
                                        checked={Boolean(editingCategory.is_active)}
                                        onChange={(e) => setEditingCategory(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="edit_cat_active" className="font-bold text-slate-700 dark:text-slate-300">
                                        Active
                                    </label>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingCategory(null)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingCategory}
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingCategory ? 'Updating...' : 'Update Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: VIEW CATEGORY DETAIL ─── */}
            {viewingCategory && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                                    {renderCategoryIcon(viewingCategory.icon_name, 20)}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        {viewingCategory.title}
                                    </h3>
                                    <span className="text-[11px] font-mono text-slate-400">/{viewingCategory.slug}</span>
                                </div>
                            </div>
                            <button onClick={() => setViewingCategory(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</span>
                                <p className="text-slate-700 dark:text-slate-300 font-medium">
                                    {viewingCategory.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-bold">Status</span>
                                    <span className={`text-xs font-black uppercase ${viewingCategory.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {viewingCategory.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-bold">Sort Order</span>
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                        #{viewingCategory.sort_order}
                                    </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-bold">Questions</span>
                                    <span className="text-xs font-black text-indigo-600">
                                        {questionsList.filter(q => q.category_id === viewingCategory.id).length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const cat = viewingCategory;
                                    setViewingCategory(null);
                                    setEditingCategory({ ...cat });
                                }}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5"
                            >
                                <Edit size={13} />
                                <span>Edit Category</span>
                            </button>
                            <button
                                onClick={() => setViewingCategory(null)}
                                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: EDIT QUESTION (DYNAMIC) ─── */}
            {editingQuestion && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit size={18} className="text-blue-600" />
                                <span>Edit Quiz Question</span>
                            </h3>
                            <button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateQuestion} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Target Category *
                                </label>
                                <select
                                    value={editingQuestion.category_id || ''}
                                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, category_id: e.target.value }))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                >
                                    {categoriesList.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.title} ({c.slug})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Question Text *
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    value={editingQuestion.question || ''}
                                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, question: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                                />
                            </div>

                            {/* 4 Options */}
                            <div className="space-y-2">
                                <label className="block font-bold text-slate-700 dark:text-slate-300">
                                    Answer Options (Mark Correct Answer) *
                                </label>
                                {['A', 'B', 'C', 'D'].map((label, idx) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="edit_correct_option"
                                            checked={editingQuestion.correct_option_index === idx}
                                            onChange={() => setEditingQuestion(prev => ({ ...prev, correct_option_index: idx }))}
                                            className="text-blue-600"
                                            title={`Mark option ${label} as correct`}
                                        />
                                        <span className="font-mono font-bold w-4 text-slate-400">{label}:</span>
                                        <input
                                            type="text"
                                            required
                                            value={editingQuestion.options?.[idx] || ''}
                                            onChange={(e) => {
                                                const newOpts = [...(editingQuestion.options || ['', '', '', ''])];
                                                newOpts[idx] = e.target.value;
                                                setEditingQuestion(prev => ({ ...prev, options: newOpts }));
                                            }}
                                            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Educational Insight / Flashcard Explanation
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingQuestion.explanation || ''}
                                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={editingQuestion.difficulty || 'medium'}
                                        onChange={(e) => setEditingQuestion(prev => ({ ...prev, difficulty: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Points
                                    </label>
                                    <input
                                        type="number"
                                        value={editingQuestion.points ?? 10}
                                        onChange={(e) => setEditingQuestion(prev => ({ ...prev, points: parseInt(e.target.value, 10) || 10 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="edit_q_active"
                                    checked={Boolean(editingQuestion.is_active)}
                                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="edit_q_active" className="font-bold text-slate-700 dark:text-slate-300">
                                    Question is Active
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingQuestion(null)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingQuestion}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingQuestion ? 'Updating...' : 'Update Question'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: VIEW QUESTION DETAIL ─── */}
            {viewingQuestion && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600">
                                    {viewingQuestion.daily_challenge_categories?.title || 'Category'}
                                </span>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    {viewingQuestion.difficulty} • {viewingQuestion.points} pts
                                </span>
                            </div>
                            <button onClick={() => setViewingQuestion(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                {viewingQuestion.question}
                            </h3>

                            <div className="space-y-2">
                                {viewingQuestion.options?.map((opt, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
                                            idx === viewingQuestion.correct_option_index
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-black'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono opacity-60 font-bold">{['A', 'B', 'C', 'D'][idx]}:</span>
                                            <span>{opt}</span>
                                        </div>
                                        {idx === viewingQuestion.correct_option_index && (
                                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                                                <Check size={12} /> Correct
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {viewingQuestion.explanation && (
                                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                                    <strong className="block font-black mb-0.5">Flashcard Insight:</strong>
                                    {viewingQuestion.explanation}
                                </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span>ID: <code className="font-mono">{viewingQuestion.id?.slice(0, 8)}</code></span>
                                <span>Status: <strong className={viewingQuestion.is_active ? "text-emerald-600" : "text-slate-500"}>{viewingQuestion.is_active ? 'Active' : 'Disabled'}</strong></span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const q = viewingQuestion;
                                    setViewingQuestion(null);
                                    setEditingQuestion({ ...q, options: [...(q.options || ['', '', '', ''])] });
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5"
                            >
                                <Edit size={13} />
                                <span>Edit Question</span>
                            </button>
                            <button
                                onClick={() => setViewingQuestion(null)}
                                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: MANUAL BOOK SPONSORSHIP (ADMIN) ─── */}
            {isAddSponsorshipModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" />
                                <span>Book Merchant Sponsorship</span>
                            </h3>
                            <button onClick={() => setIsAddSponsorshipModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSponsorship} className="space-y-3.5 text-xs font-bold">
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Select Merchant *
                                </label>
                                <select
                                    required
                                    value={sponsorshipForm.merchant_id}
                                    onChange={(e) => setSponsorshipForm(prev => ({ ...prev, merchant_id: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                >
                                    <option value="">-- Choose Merchant --</option>
                                    {initialMerchants?.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.business_name} ({m.business_phone || m.id.slice(0, 8)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                        Sponsor Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={sponsorshipForm.sponsor_date}
                                        onChange={(e) => setSponsorshipForm(prev => ({ ...prev, sponsor_date: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                        Fee Paid (₹)
                                    </label>
                                    <input
                                        type="number"
                                        value={sponsorshipForm.fee_rupees}
                                        onChange={(e) => setSponsorshipForm(prev => ({ ...prev, fee_rupees: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Campaign Message / Header Quote
                                </label>
                                <textarea
                                    rows={2}
                                    value={sponsorshipForm.campaign_message}
                                    onChange={(e) => setSponsorshipForm(prev => ({ ...prev, campaign_message: e.target.value }))}
                                    placeholder="e.g. Shop Authentic Pure Desi Ghee & Dry Fruits with 15% Extra Cashback today!"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Tagged Product UUIDs (Comma separated, optional)
                                </label>
                                <input
                                    type="text"
                                    value={sponsorshipForm.product_ids_str}
                                    onChange={(e) => setSponsorshipForm(prev => ({ ...prev, product_ids_str: e.target.value }))}
                                    placeholder="uuid-1, uuid-2"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">
                                    Initial Status
                                </label>
                                <select
                                    value={sponsorshipForm.status}
                                    onChange={(e) => setSponsorshipForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                >
                                    <option value="booked">Booked</option>
                                    <option value="live">Live</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddSponsorshipModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSponsorship}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingSponsorship ? 'Booking...' : 'Confirm Sponsorship'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: VIEW SPONSORSHIP DETAIL ─── */}
            {selectedSponsorship && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    selectedSponsorship.status === 'live' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : selectedSponsorship.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {selectedSponsorship.status}
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Sponsorship for {selectedSponsorship.sponsor_date}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedSponsorship(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Merchant Profile Details */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                    {selectedSponsorship.merchants?.business_name || 'Store'}
                                </h4>
                                <span className="font-mono text-[10px] text-slate-400">
                                    ID: {selectedSponsorship.merchant_id?.slice(0, 8)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 pt-1">
                                {selectedSponsorship.merchants?.business_phone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone size={12} className="text-blue-600 shrink-0" />
                                        <span>{selectedSponsorship.merchants.business_phone}</span>
                                    </div>
                                )}
                                {selectedSponsorship.merchants?.business_email && (
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Mail size={12} className="text-indigo-600 shrink-0" />
                                        <span className="truncate">{selectedSponsorship.merchants.business_email}</span>
                                    </div>
                                )}
                                {selectedSponsorship.merchants?.city && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={12} className="text-rose-600 shrink-0" />
                                        <span>{selectedSponsorship.merchants.city}, {selectedSponsorship.merchants.state || 'India'}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <Tag size={12} className="text-emerald-600 shrink-0" />
                                    <span>Fee: <strong>₹{(selectedSponsorship.fee_paise / 100).toFixed(0)}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Campaign message banner */}
                        {selectedSponsorship.campaign_message && (
                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/60 text-xs">
                                <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Featured Campaign Message</span>
                                <p className="font-bold text-slate-900 dark:text-white italic">
                                    &ldquo;{selectedSponsorship.campaign_message}&rdquo;
                                </p>
                            </div>
                        )}

                        {/* Tagged Products */}
                        <div className="text-xs space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                Tagged Challenge Showcase Products ({Array.isArray(selectedSponsorship.product_ids) ? selectedSponsorship.product_ids.length : 0})
                            </span>
                            {Array.isArray(selectedSponsorship.product_ids) && selectedSponsorship.product_ids.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                                    {selectedSponsorship.product_ids.map((pid, idx) => (
                                        <span key={idx} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                            {typeof pid === 'string' ? pid.slice(0, 8) : JSON.stringify(pid)}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-[11px] italic">No specific products tagged. Platform general takeover.</p>
                            )}
                        </div>

                        {/* Status Switcher Buttons */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Change Status</span>
                            <div className="grid grid-cols-4 gap-2">
                                {['booked', 'live', 'completed', 'cancelled'].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleUpdateSponsorshipStatus(selectedSponsorship.id, st)}
                                        className={`py-1.5 rounded-xl font-bold uppercase text-[10px] transition-all ${
                                            selectedSponsorship.status === st
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => handleDeleteSponsorship(selectedSponsorship.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
                            >
                                <Trash2 size={13} />
                                <span>Delete Sponsorship</span>
                            </button>
                            <button
                                onClick={() => setSelectedSponsorship(null)}
                                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: EDIT TARGET (DYNAMIC) ─── */}
            {editingTarget && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Edit size={18} className="text-blue-600" />
                                <span>Edit Target Milestone</span>
                            </h3>
                            <button onClick={() => setEditingTarget(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTarget} className="space-y-3 text-xs font-bold">
                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">Target Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingTarget.title || ''}
                                    onChange={(e) => setEditingTarget(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    value={editingTarget.description || ''}
                                    onChange={(e) => setEditingTarget(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Audience</label>
                                    <select
                                        value={editingTarget.target_audience || 'customer'}
                                        onChange={(e) => setEditingTarget(prev => ({ ...prev, target_audience: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="merchant">Merchant</option>
                                        <option value="all">All Users</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Metric</label>
                                    <select
                                        value={editingTarget.metric_type || 'share_links'}
                                        onChange={(e) => setEditingTarget(prev => ({ ...prev, metric_type: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="share_links">Share Links</option>
                                        <option value="quiz_streak">Quiz Streak</option>
                                        <option value="store_sales">Store Sales</option>
                                        <option value="link_clicks">Link Clicks</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Target Value</label>
                                    <input
                                        type="number"
                                        value={editingTarget.target_value ?? 1}
                                        onChange={(e) => setEditingTarget(prev => ({ ...prev, target_value: parseInt(e.target.value, 10) || 1 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Reward Type</label>
                                    <select
                                        value={editingTarget.reward_type || 'cashback'}
                                        onChange={(e) => setEditingTarget(prev => ({ ...prev, reward_type: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    >
                                        <option value="cashback">Cashback (₹)</option>
                                        <option value="physical_gift">Physical Gift</option>
                                    </select>
                                </div>
                            </div>

                            {editingTarget.reward_type === 'cashback' ? (
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Cashback Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={(editingTarget.reward_value_paise || 0) / 100}
                                        onChange={(e) => setEditingTarget(prev => ({ ...prev, reward_value_paise: (parseFloat(e.target.value) || 0) * 100 }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 mb-1">Physical Gift Item Name</label>
                                    <input
                                        type="text"
                                        value={editingTarget.gift_name || ''}
                                        onChange={(e) => setEditingTarget(prev => ({ ...prev, gift_name: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="edit_target_active"
                                    checked={Boolean(editingTarget.is_active)}
                                    onChange={(e) => setEditingTarget(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="edit_target_active" className="text-slate-700 dark:text-slate-300">
                                    Target is Active
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingTarget(null)}
                                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingTarget}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-sm disabled:opacity-50"
                                >
                                    {savingTarget ? 'Saving...' : 'Update Target'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: VIEW TARGET DETAIL ─── */}
            {viewingTarget && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    viewingTarget.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                                }`}>
                                    {viewingTarget.is_active ? 'Active' : 'Draft'}
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    {viewingTarget.title}
                                </h3>
                            </div>
                            <button onClick={() => setViewingTarget(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            {viewingTarget.description && (
                                <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                                    {viewingTarget.description}
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-bold">Target Metric</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {viewingTarget.metric_type} ({viewingTarget.target_value})
                                    </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-bold">Audience</span>
                                    <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                                        {viewingTarget.target_audience}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                                <span className="text-[10px] text-emerald-600 block font-bold uppercase">Reward</span>
                                <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                    {viewingTarget.reward_type === 'cashback' 
                                        ? `₹${(viewingTarget.reward_value_paise || 0) / 100} Instant Wallet Cashback` 
                                        : `🎁 ${viewingTarget.gift_name}`}
                                </span>
                            </div>

                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold">
                                <span className="text-slate-500">Total User Claims Awarded:</span>
                                <span className="text-indigo-600 font-black">
                                    {claimsList.filter(c => c.target_id === viewingTarget.id).length} Claims
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const t = viewingTarget;
                                    setViewingTarget(null);
                                    setEditingTarget({ ...t });
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1"
                            >
                                <Edit size={13} />
                                <span>Edit Target</span>
                            </button>
                            <button
                                onClick={() => setViewingTarget(null)}
                                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: VIEW CLAIM & WINNER SHIPMENT DETAIL ─── */}
            {viewingClaim && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    viewingClaim.status === 'delivered'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : viewingClaim.status === 'shipped'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {viewingClaim.status}
                                </span>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">
                                    Shipment Details
                                </h3>
                            </div>
                            <button onClick={() => setViewingClaim(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            {/* Gift Item */}
                            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase block mb-0.5">Mystery Gift Item</span>
                                <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                                    {viewingClaim.gift_title || viewingClaim.marketing_targets?.gift_name || 'Mystery Gift Box'}
                                </h4>
                            </div>

                            {/* Recipient Profile */}
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Recipient</span>
                                <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                                    {viewingClaim.recipient_name || 'Anonymous Winner'}
                                </div>
                                <div className="text-slate-500 font-semibold flex items-center gap-2">
                                    {viewingClaim.recipient_phone && (
                                        <span>Phone: <strong>{viewingClaim.recipient_phone}</strong></span>
                                    )}
                                    <span>Role: <strong>{viewingClaim.user_type}</strong></span>
                                </div>
                            </div>

                            {/* Shipping Address with Copy Action */}
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Address</span>
                                    {viewingClaim.shipping_address && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(viewingClaim.shipping_address);
                                                alert('Address copied to clipboard!');
                                            }}
                                            className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <Copy size={11} />
                                            <span>Copy</span>
                                        </button>
                                    )}
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                                    {viewingClaim.shipping_address || 'No shipping address provided yet.'}
                                </p>
                            </div>

                            {/* Courier Tracking */}
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tracking & Courier</span>
                                {viewingClaim.tracking_number ? (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{viewingClaim.courier_name}</span>
                                            <div className="font-mono text-xs text-emerald-600 font-bold">AWB: {viewingClaim.tracking_number}</div>
                                        </div>
                                        <a
                                            href={viewingClaim.tracking_url || `https://www.google.com/search?q=${encodeURIComponent((viewingClaim.courier_name || 'courier') + ' tracking ' + viewingClaim.tracking_number)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 text-[11px] font-bold flex items-center gap-1"
                                        >
                                            <span>Track Live</span>
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic">No courier dispatched yet.</p>
                                )}
                            </div>

                            {viewingClaim.notes && (
                                <p className="text-[11px] text-slate-400 italic">
                                    Notes: {viewingClaim.notes}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    const c = viewingClaim;
                                    setViewingClaim(null);
                                    openEditTracking(c);
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1"
                            >
                                <Truck size={13} />
                                <span>Edit Courier / Tracking</span>
                            </button>
                            <button
                                onClick={() => setViewingClaim(null)}
                                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-bold text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MODAL: INSPECT ATTRIBUTION STREAM LOG ─── */}
            {selectedTrackingLog && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-50 text-blue-600 font-mono">
                                    {selectedTrackingLog.event_type}
                                </span>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                                    Attribution Event Inspection
                                </h3>
                            </div>
                            <button onClick={() => setSelectedTrackingLog(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs font-mono">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Timestamp</span>
                                    <span className="text-slate-800 dark:text-slate-200">
                                        {new Date(selectedTrackingLog.created_at).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Link Code</span>
                                    <span className="text-blue-600 font-bold">
                                        {selectedTrackingLog.marketing_share_links?.code || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Visitor IP</span>
                                    <span>{selectedTrackingLog.visitor_ip || '127.0.0.1'}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-sans block font-bold">Source Platform</span>
                                    <span className="capitalize font-sans font-bold text-slate-800 dark:text-slate-200">
                                        {selectedTrackingLog.marketing_share_links?.source || 'direct'}
                                    </span>
                                </div>
                            </div>

                            {selectedTrackingLog.user_agent && (
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 break-all">
                                    User-Agent: {selectedTrackingLog.user_agent}
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-slate-400 font-sans font-bold uppercase">JSON Metadata Payload</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(selectedTrackingLog.metadata, null, 2));
                                            alert('Payload copied!');
                                        }}
                                        className="text-[10px] text-blue-600 font-sans hover:underline flex items-center gap-1"
                                    >
                                        <Copy size={11} />
                                        <span>Copy JSON</span>
                                    </button>
                                </div>
                                <pre className="p-3 rounded-2xl bg-slate-900 text-emerald-400 text-[11px] overflow-x-auto max-h-40 scrollbar-thin">
                                    {JSON.stringify(selectedTrackingLog.metadata, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setSelectedTrackingLog(null)}
                                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-700 dark:text-slate-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
