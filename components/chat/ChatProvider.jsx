'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ChatContext = createContext(null);

/**
 * ChatProvider
 * Lightweight context provider that shares chat open/close state
 * between ChatBubble and ChatWindow.
 * Wrap around both in app/layout.js inside AuthProvider.
 */
export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setHasUnread(false); // Clear badge when opening
      return !prev;
    });
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{ isOpen, toggleChat, openChat, closeChat, hasUnread, setHasUnread }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
