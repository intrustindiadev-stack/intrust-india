'use client';

import { usePathname } from 'next/navigation';
import ChatBubble from './ChatBubble';
import ChatWindow from './ChatWindow';
import { CHAT_HIDDEN_PATHS } from './hiddenPaths';

export default function GlobalChat() {
  const pathname = usePathname();

  const isChatDisabled = CHAT_HIDDEN_PATHS.some((path) => pathname?.startsWith(path));

  if (isChatDisabled) {
    return null;
  }

  return (
    <>
      <ChatBubble />
      <ChatWindow />
    </>
  );
}
