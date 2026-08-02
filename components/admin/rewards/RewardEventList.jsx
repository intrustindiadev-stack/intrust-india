import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import { RewardSettingCard } from './RewardSettingCard';
import { RewardEventCard } from './RewardEventCard';
import { RewardEventEditor } from './RewardEventEditor';

const EVENTS = [
    { key: 'signup_reward', name: 'Signup', description: 'When a new user registers an account.', type: 'fixed' },
    { key: 'purchase_reward', name: 'Purchase', description: 'When a user makes a successful purchase.', type: 'rate' },
    { key: 'kyc_complete_reward', name: 'KYC Complete', description: 'When a user successfully verifies KYC.', type: 'fixed' },
    { key: 'merchant_onboard_reward', name: 'Merchant Onboard', description: 'When a merchant completes onboarding.', type: 'fixed' },
    { key: 'subscription_renewal_reward', name: 'Subscription Renewal', description: 'When a subscription is renewed.', type: 'fixed' },
    { key: 'daily_login_reward', name: 'Daily Login', description: 'When a user logs in for the day.', type: 'fixed' },
    { key: 'wallet_topup_reward', name: 'Wallet Top-up', description: 'When a user adds funds to their wallet.', type: 'rate' }
];

export function RewardEventList({ config }) {
    const { draftConfig, updateDraft } = config;
    const [editingEvent, setEditingEvent] = useState(null);

    if (!draftConfig) return null;

    return (
        <RewardSettingCard
            icon={Gift}
            title="Earning Rules"
            description="Configure how many points users earn for specific actions"
            iconBgClass="bg-emerald-50 dark:bg-emerald-900/20"
            iconTextClass="text-emerald-600 dark:text-emerald-400"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EVENTS.map(eventInfo => (
                    <RewardEventCard
                        key={eventInfo.key}
                        eventInfo={eventInfo}
                        eventData={draftConfig.events[eventInfo.key]}
                        onConfigure={() => setEditingEvent(eventInfo)}
                        onToggleActive={(isActive) => {
                            if (!isActive && !window.confirm(`Are you sure you want to disable ${eventInfo.name} rewards?`)) {
                                return;
                            }
                            updateDraft('events', [eventInfo.key, '_is_active'], isActive);
                        }}
                    />
                ))}
            </div>

            {editingEvent && (
                <RewardEventEditor
                    eventInfo={editingEvent}
                    eventData={draftConfig.events[editingEvent.key]}
                    onClose={() => setEditingEvent(null)}
                    onChange={(field, value) => updateDraft('events', [editingEvent.key, field], value)}
                />
            )}
        </RewardSettingCard>
    );
}
