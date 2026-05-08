'use client';

import { BaseChatWindow } from '../ChatWindow';
import { MERCHANT_CHAT_HIDDEN_PATHS } from '../hiddenPaths';

import { MERCHANT_WELCOME_MESSAGE } from '@/lib/chat/merchantPromptTemplates';

const MERCHANT_QUICK_REPLIES = [
  { label: '📦 Today\'s orders', text: 'Show me today\'s orders' },
  { label: '💸 My payouts', text: 'What is my payout status?' },
  { label: '📊 Sales summary', text: 'Give me a sales summary' },
  { label: '🛒 Low-stock items', text: 'Which items are low on stock?' },
  { label: '🪙 Subscription status', text: 'What is my subscription status?' },
  { label: '🆔 KYC & bank status', text: 'What is my KYC and bank verification status?' },
];

export default function MerchantChatWindow() {
  return (
    <BaseChatWindow
      apiPath="/api/merchant/chat/message"
      historyPath="/api/merchant/chat/history"
      quickReplies={MERCHANT_QUICK_REPLIES}
      assistantTitle="Merchant Assistant"
      assistantSubtitle="Online · Here to help your business"
      hiddenPaths={MERCHANT_CHAT_HIDDEN_PATHS}
      accentColor="#D4AF37"
      welcomeMessageBuilder={MERCHANT_WELCOME_MESSAGE}
    />
  );
}
