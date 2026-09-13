'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from './ChatProvider';
import { useAuth } from '@/lib/contexts/AuthContext';
import { CHAT_HIDDEN_PATHS } from './hiddenPaths';

/**
 * ChatBubble
 * Fixed floating button at bottom-right. Visible only to authenticated
 * users and hidden on auth/admin pages (see hiddenPaths.js).
 * Dynamically coordinates with the FloatingCart to glide up with an
 * elastic spring animation when the cart opens/appears, and glides back
 * down when the cart is empty or closed.
 */
export function BaseChatBubble({
  hiddenPaths = CHAT_HIDDEN_PATHS,
  bubbleImage = "/robot-mascot-nobg.png",
  closeAccentColor = "#1565c0",
  ariaLabel = "Open InTrust Assistant",
  assistantTitle = "InTrust Assistant",
  /* mobile bottom offset when cart is not active */
  mobileBottom = "78px",
}) {
  const pathname = usePathname();
  const { isOpen, toggleChat, hasUnread, hasFloatingCart } = useChat();
  const { user } = useAuth();
  const [hasCartLocal, setHasCartLocal] = useState(false);

  // Synchronize cart state via DOM attribute and window custom events
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setHasCartLocal(document.body.getAttribute('data-floating-cart') === 'true');
    }

    const handleCartEvent = (e) => {
      if (e?.detail && typeof e.detail.visible === 'boolean') {
        setHasCartLocal(e.detail.visible);
      }
    };
    window.addEventListener('intrust:floating-cart', handleCartEvent);
    return () => window.removeEventListener('intrust:floating-cart', handleCartEvent);
  }, []);

  // Reset cart presence on navigation to routes where floating cart is definitely not used
  useEffect(() => {
    if (pathname && !pathname.startsWith('/shop')) {
      setHasCartLocal(false);
    }
  }, [pathname]);

  const isCartActive = Boolean(hasFloatingCart || hasCartLocal);

  return (
    <>
      <style>{`
        /* ── Bubble button ─────────────────────────────── */
        .chat-bubble-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.45s cubic-bezier(0.34, 1.7, 0.64, 1),
                      bottom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          outline: none;
          animation: bubble-float 3.2s ease-in-out infinite;
          padding: 0;
        }
        /* Desktop: glide up when floating cart appears */
        .chat-bubble-btn.has-cart {
          bottom: 104px;
        }

        .chat-bubble-btn.is-open {
          transform: scale(0.88) rotate(0deg);
          animation: none;
        }
        .chat-bubble-btn:hover {
          transform: scale(1.12);
          animation: none;
        }
        .chat-bubble-btn:active {
          transform: scale(0.93);
        }
        @keyframes bubble-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }

        /* ── Inner content ─────────────────────────────── */
        .chat-bubble-content {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-mascot-wrapper, .chat-close-wrapper {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.45s cubic-bezier(0.34, 1.7, 0.64, 1);
        }
        .chat-mascot-wrapper {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
        .chat-bubble-btn.is-open .chat-mascot-wrapper {
          opacity: 0;
          transform: scale(0.35) rotate(90deg);
          pointer-events: none;
        }
        .chat-close-wrapper {
          opacity: 0;
          transform: scale(0.35) rotate(-90deg);
          pointer-events: none;
        }
        .chat-bubble-btn.is-open .chat-close-wrapper {
          opacity: 1;
          transform: scale(1) rotate(0deg);
          pointer-events: auto;
        }
        .chat-close-icon-inner {
          background: ${closeAccentColor};
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.22);
        }
        .chat-mascot-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 6px 14px rgba(0,0,0,0.18));
        }

        /* ── Unread badge ─────────────────────────────── */
        .chat-bubble-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 15px;
          height: 15px;
          background: #ef5350;
          border-radius: 50%;
          border: 2px solid #fff;
          animation: badge-pulse 1.5s ease-in-out infinite;
          z-index: 10000;
          transition: opacity 0.3s ease;
        }
        .chat-bubble-btn.is-open .chat-bubble-badge {
          opacity: 0;
        }
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.35); }
        }

        /* ── "Hi 👋" attention tooltip ────────────────── */
        .chat-bubble-tooltip {
          position: absolute;
          right: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1a1a2e;
          color: #fff;
          font-size: 12.5px;
          font-weight: 600;
          white-space: nowrap;
          padding: 6px 12px;
          border-radius: 20px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          pointer-events: none;
          animation: tooltip-appear 0.5s cubic-bezier(0.34,1.7,0.64,1) 1.2s both,
                     tooltip-fade   0.4s ease-in 5s both;
        }
        .chat-bubble-tooltip::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          border: 6px solid transparent;
          border-right: none;
          border-left-color: #1a1a2e;
        }
        @keyframes tooltip-appear {
          from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
        @keyframes tooltip-fade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .chat-bubble-btn.is-open .chat-bubble-tooltip {
          display: none;
        }

        /* ── Mobile overrides ─────────────────────────── */
        @media (max-width: 768px) {
          .chat-bubble-btn {
            bottom: ${mobileBottom};
            right: 14px;
            width: 62px;
            height: 62px;
          }
          /* Mobile: glide up above the floating cart bar when cart is active */
          .chat-bubble-btn.has-cart {
            bottom: calc(${mobileBottom} + 72px);
          }
        }
      `}</style>

      <button
        id="chat-bubble-btn"
        className={`chat-bubble-btn ${isOpen ? 'is-open' : ''} ${isCartActive ? 'has-cart' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : ariaLabel}
        title={isOpen ? 'Close chat' : assistantTitle}
      >
        <div className="chat-bubble-content">
          {/* ── "Hi 👋" tooltip ── */}
          {!isOpen && (
            <span className="chat-bubble-tooltip" aria-hidden="true">
              Hi 👋 Need help?
            </span>
          )}

          {/* ── Robot mascot ── */}
          <div className="chat-mascot-wrapper">
            <img
              src={bubbleImage}
              alt={`${assistantTitle} Mascot`}
              className="chat-mascot-img"
            />
          </div>

          {/* ── Close icon ── */}
          <div className="chat-close-wrapper">
            <div className="chat-close-icon-inner">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
  const pathname = usePathname();
  const isShopRoute = pathname?.startsWith('/shop');
  const isPdpRoute = pathname?.startsWith('/shop/product');
  
  // Normal resting positions:
  // On PDP, clear the sticky bottom action bar (84px).
  // On standard shop/customer pages with bottom nav, clear the bottom nav (78px).
  // When a floating cart appears, BaseChatBubble dynamically springs up +72px.
  const mobileBottom = isPdpRoute ? "84px" : isShopRoute ? "78px" : "80px";
  return <BaseChatBubble mobileBottom={mobileBottom} />;
}
