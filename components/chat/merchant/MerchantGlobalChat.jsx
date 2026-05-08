'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MERCHANT_CHAT_HIDDEN_PATHS } from '../hiddenPaths';
import MerchantChatBubble from './MerchantChatBubble';
import MerchantChatWindow from './MerchantChatWindow';

export default function MerchantGlobalChat() {
  const pathname = usePathname();
  const { user } = useAuth();

  // If user isn't logged in, or if we're on a path where chat shouldn't show, render nothing.
  const isHidden = MERCHANT_CHAT_HIDDEN_PATHS.some((p) => pathname?.startsWith(p));
  if (!user || isHidden) return null;

  return (
    <>
      <MerchantChatBubble />
      <MerchantChatWindow />
    </>
  );
}
