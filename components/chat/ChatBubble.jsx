'use client';

import { usePathname } from 'next/navigation';
import { useChat } from './ChatProvider';
import { useAuth } from '@/lib/contexts/AuthContext';
import { CHAT_HIDDEN_PATHS } from './hiddenPaths';

/**
 * ChatBubble
 * Fixed floating button at bottom-right. Visible only to authenticated
 * users and hidden on auth/admin pages (see hiddenPaths.js).
 */
export function BaseChatBubble({
  hiddenPaths = CHAT_HIDDEN_PATHS,
  bubbleImage = "/robot-mascot-nobg.png",
  closeAccentColor = "#1565c0",
  ariaLabel = "Open InTrust Assistant",
  assistantTitle = "InTrust Assistant"
}) {
  const pathname = usePathname();
  const { isOpen, toggleChat, hasUnread } = useChat();
  const { user } = useAuth();


  // On /shop/[merchantSlug] pages the FloatingCart bar sits at bottom-0 on desktop
  // (≈ 64 px tall). Shift the bubble above it so they don't overlap.
  const isShopPage = /^\/shop\/[^/]+/.test(pathname ?? '');

  return (
    <>
      <style>{`
        .chat-bubble-btn {
          position: fixed;
          bottom: 28px; /* overridden on shop pages by .on-shop-page */
          right: 28px;
          z-index: 9999;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.5s cubic-bezier(0.34, 1.7, 0.64, 1);
          outline: none;
          animation: bubble-float 3s ease-in-out infinite;
          padding: 0;
        }
        .chat-bubble-btn.is-open {
          transform: scale(0.9) rotate(0deg);
          animation: none;
        }
        .chat-bubble-btn:hover {
          transform: scale(1.1);
          animation: none;
        }
        .chat-bubble-btn:active {
          transform: scale(0.94);
        }
        @keyframes bubble-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        .chat-bubble-content {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Persistent stack for smooth transitions */
        .chat-mascot-wrapper, .chat-close-wrapper {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s cubic-bezier(0.34, 1.7, 0.64, 1);
        }

        .chat-mascot-wrapper {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .chat-bubble-btn.is-open .chat-mascot-wrapper {
          opacity: 0;
          transform: scale(0.4) rotate(90deg);
          pointer-events: none;
        }

        .chat-close-wrapper {
          opacity: 0;
          transform: scale(0.4) rotate(-90deg);
          pointer-events: none;
        }
        .chat-bubble-btn.is-open .chat-close-wrapper {
          opacity: 1;
          transform: scale(1) rotate(0deg);
          pointer-events: auto;
        }

        .chat-close-icon-inner {
          background: ${closeAccentColor};
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .chat-mascot-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15));
        }

        .chat-bubble-badge {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 16px;
          height: 16px;
          background: #ef5350;
          border-radius: 50%;
          border: 2.5px solid #fff;
          animation: badge-pulse 1.5s ease-in-out infinite;
          z-index: 10000;
          transition: opacity 0.3s ease;
        }
        .chat-bubble-btn.is-open .chat-bubble-badge {
          opacity: 0;
        }

        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.3); }
        }
        /* Lift bubble above the desktop FloatingCart bar on shop pages */
        .chat-bubble-btn.on-shop-page {
          bottom: 96px;
        }
        @media (max-width: 768px) {
          .chat-bubble-btn {
            bottom: 165px;
            right: 16px;
            width: 75px;
            height: 75px;
          }
          /* On mobile the FloatingCart is at bottom-[92px], bubble is already at 165px — no change needed */
        }
      `}</style>

      <button
        id="chat-bubble-btn"
        className={`chat-bubble-btn ${isOpen ? 'is-open' : ''} ${isShopPage ? 'on-shop-page' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : ariaLabel}
        title={isOpen ? 'Close chat' : assistantTitle}
      >
        <div className="chat-bubble-content">
          {/* ── Robot mascot wrapper ── */}
          <div className="chat-mascot-wrapper">
            <img
              src={bubbleImage}
              alt={`${assistantTitle} Mascot`}
              className="chat-mascot-img"
            />
          </div>

          {/* ── Close icon wrapper ── */}
          <div className="chat-close-wrapper">
            <div className="chat-close-icon-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {hasUnread && <span className="chat-bubble-badge" aria-hidden="true" />}
      </button>

    </>
  );
}

export default function ChatBubble() {
  return <BaseChatBubble />;
}
