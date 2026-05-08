'use client';

import { BaseChatBubble } from '../ChatBubble';
import { MERCHANT_CHAT_HIDDEN_PATHS } from '../hiddenPaths';

export default function MerchantChatBubble() {
  return (
    <BaseChatBubble
      hiddenPaths={MERCHANT_CHAT_HIDDEN_PATHS}
      bubbleImage="/robot-mascot-nobg.png"
      ariaLabel="Open Merchant Assistant"
      assistantTitle="Merchant Assistant"
      closeAccentColor="#D4AF37"
    />
  );
}
