'use client';

import { usePathname } from 'next/navigation';
import { useChat } from './ChatProvider';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * ChatBubble
 * Fixed floating button at bottom-right. Visible only to authenticated
 * users and hidden on auth pages.
 */

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify'];

export default function ChatBubble() {
  const pathname = usePathname();
  const { isOpen, toggleChat, hasUnread } = useChat();
  const { user } = useAuth();

  // Hide on auth pages or when not logged in
  const isAuthPage = AUTH_PATHS.some((p) => pathname?.startsWith(p));
  if (!user || isAuthPage) return null;

  return (
    <>
      <style>{`
        .chat-bubble {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 50;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a73e8, #0d47a1);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(26, 115, 232, 0.45);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          outline: none;
        }
        .chat-bubble:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 28px rgba(26, 115, 232, 0.6);
        }
        .chat-bubble:active {
          transform: scale(0.95);
        }
        .chat-bubble svg {
          width: 26px;
          height: 26px;
          fill: #fff;
          transition: transform 0.25s ease;
        }
        .chat-bubble.open svg {
          transform: rotate(90deg);
        }
        .chat-bubble-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 14px;
          height: 14px;
          background: #e53935;
          border-radius: 50%;
          border: 2px solid #fff;
          animation: pulse-badge 1.5s infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.25); }
        }
      `}</style>

      <button
        id="chat-bubble-btn"
        className={`chat-bubble${isOpen ? ' open' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : 'Open InTrust Assistant'}
        title={isOpen ? 'Close chat' : 'InTrust Assistant'}
      >
        {isOpen ? (
          /* Close (×) icon */
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
        ) : (
          /* Chat bubble icon */
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/>
          </svg>
        )}
        {hasUnread && <span className="chat-bubble-badge" aria-hidden="true" />}
      </button>
    </>
  );
}
