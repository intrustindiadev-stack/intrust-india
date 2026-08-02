'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Info, Gift, Trophy, Shield, TrendingUp, History, Activity } from 'lucide-react';
import { useRewardConfiguration } from '@/hooks/useRewardConfiguration';
import { RewardSectionNav } from './RewardSectionNav';
import { RewardUnsavedChangesBar } from './RewardUnsavedChangesBar';
import { RewardsOverview } from './RewardsOverview';
import { RewardEventList } from './RewardEventList';
import { RewardTierEditor } from './RewardTierEditor';
import { RewardEligibilityEditor } from './RewardEligibilityEditor';
import { RewardLimitsEditor } from './RewardLimitsEditor';
import { RewardRedemptionEditor } from './RewardRedemptionEditor';
import { RewardConfigurationHistory } from './RewardConfigurationHistory';

const SECTIONS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'events', label: 'Earning Rules', icon: Gift },
    { id: 'tiers', label: 'Referral & Tiers', icon: Trophy },
    { id: 'eligibility', label: 'Eligibility', icon: Shield },
    { id: 'limits', label: 'Global Limits', icon: TrendingUp },
    { id: 'audit', label: 'Audit History', icon: History }
];

export function RewardsAdminShell() {
    const config = useRewardConfiguration();
    const [activeSection, setActiveSection] = useState('overview');

    // Handle hash routing for section state
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash && SECTIONS.find(s => s.id === hash)) {
            setActiveSection(hash);
        }
    }, []);

    const handleSectionChange = (sectionId) => {
        // Warning if navigating away with unsaved changes in current section
        const isCurrentDirty = config.dirtySections.includes(activeSection);
        
        if (isCurrentDirty && activeSection !== sectionId) {
            if (!window.confirm('You have unsaved changes in this section. Are you sure you want to switch tabs?')) {
                return;
            }
        }
        
        setActiveSection(sectionId);
        window.history.replaceState(null, '', `#${sectionId}`);
    };

    // Warn before reload if dirty
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (config.dirtySections.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [config.dirtySections]);

    if (config.loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (config.loadError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex flex-col items-center justify-center">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl max-w-md text-center border border-red-100 dark:border-red-800">
                    <Info size={32} className="mx-auto mb-4" />
                    <h2 className="text-lg font-bold mb-2">Configuration Load Error</h2>
                    <p className="text-sm mb-6">{config.loadError}</p>
                    <button 
                        onClick={config.retryFetch}
                        className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Determine if current section is dirty
    let currentSectionDirty = false;
    let sectionToSave = null;
    
    if (activeSection === 'events' || activeSection === 'tiers' || activeSection === 'eligibility') {
        currentSectionDirty = config.dirtySections.includes(activeSection);
        sectionToSave = activeSection;
    } else if (activeSection === 'limits') {
        currentSectionDirty = config.dirtySections.includes('global') || config.dirtySections.includes('levelSettings');
        // Limits page combines 'global' caps and 'levelSettings' metadata. We'll save 'global'.
        sectionToSave = 'global'; 
    }

    // Map section definitions to include dirty state
    const sectionsWithDirty = SECTIONS.map(s => {
        let isDirty = false;
        if (s.id === 'events' || s.id === 'tiers' || s.id === 'eligibility') {
            isDirty = config.dirtySections.includes(s.id);
        } else if (s.id === 'limits') {
            isDirty = config.dirtySections.includes('global') || config.dirtySections.includes('levelSettings');
        }
        return { ...s, isDirty };
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Settings size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                                Reward Configuration
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Manage events, tiers, limits, and system rules
                            </p>
                        </div>
                    </div>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-8">
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <RewardSectionNav 
                            sections={sectionsWithDirty} 
                            activeSection={activeSection} 
                            onSectionChange={handleSectionChange} 
                        />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeSection === 'overview' && <RewardsOverview config={config} onNavigate={handleSectionChange} />}
                            {activeSection === 'events' && <RewardEventList config={config} />}
                            {activeSection === 'tiers' && <RewardTierEditor config={config} />}
                            {activeSection === 'eligibility' && <RewardEligibilityEditor config={config} />}
                            {activeSection === 'limits' && (
                                <>
                                    <RewardLimitsEditor config={config} />
                                    <RewardRedemptionEditor config={config} />
                                </>
                            )}
                            {activeSection === 'audit' && <RewardConfigurationHistory />}
                        </motion.div>
                    </div>
                </div>
            </div>

            <RewardUnsavedChangesBar 
                isDirty={currentSectionDirty}
                isSaving={config.savingSection}
                onSave={() => {
                    if (activeSection === 'limits') {
                        config.saveSection('global').then(() => config.saveSection('levelSettings'));
                    } else {
                        config.saveSection(sectionToSave);
                    }
                }}
                onDiscard={() => {
                    if (activeSection === 'limits') {
                        config.discardChanges('global');
                        config.discardChanges('levelSettings');
                    } else {
                        config.discardChanges(sectionToSave);
                    }
                }}
            />
        </div>
    );
}
