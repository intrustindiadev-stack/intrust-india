'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from './ChatProvider';
import { useAuth } from '@/lib/contexts/AuthContext';

// Client-side PII regex (mirrors lib/piiFilter.js)
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const PII_FALLBACK = "I can't share that information here. Please visit your profile page for secure details.";

function sanitizeOnClient(text) {
  if (!text) return text;
  // Reset lastIndex before each test (global regex side effect)
  AADHAAR_RE.lastIndex = 0;
  PAN_RE.lastIndex = 0;
  if (AADHAAR_RE.test(text) || PAN_RE.test(text)) return PII_FALLBACK;
  return text;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const MAX_MESSAGES = 20;

/**
 * ChatWindow
 * The chat panel that opens when ChatBubble is clicked.
 * Slide-up animation, typing indicator, auto-scroll, mobile full-screen.
 */
export default function ChatWindow() {
  const { isOpen, closeChat, setHasUnread } = useChat();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('there');
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Inject welcome message once on first open
  useEffect(() => {
    if (isOpen && !hasWelcomed) {
      setHasWelcomed(true);
      const name =
        profile?.full_name?.split(' ')[0] ||
        user?.user_metadata?.full_name?.split(' ')[0] ||
        firstName;
      addBotMessage(
        `Hi ${name} 👋 I'm your InTrust Assistant. Ask me about your wallet balance, KYC status, or anything else!`
      );
    }

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const addBotMessage = useCallback((text) => {
    const safe = sanitizeOnClient(text);
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: safe,
          timestamp: new Date(),
          status: 'delivered',
        },
      ];
      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
    });
  }, []);

  const addUserMessage = useCallback((text) => {
    const msg = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date(),
      status: 'sent',
    };
    setMessages((prev) => {
      const next = [...prev, msg];
      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
    });
    return msg;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    addUserMessage(text);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (data.firstName && data.firstName !== 'Customer') {
        setFirstName(data.firstName);
      }

      if (data.reply) {
        addBotMessage(data.reply);
        if (!isOpen) setHasUnread(true);
      } else {
        addBotMessage('Sorry, I had trouble responding. Please try again.');
      }
    } catch {
      addBotMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, isOpen, addUserMessage, addBotMessage, setHasUnread]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .chat-window-overlay {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: 380px;
          height: 520px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          z-index: 49;
          overflow: hidden;
          animation: chat-slide-up 0.22s ease-out;
          border: 1px solid rgba(26,115,232,0.15);
        }
        @media (max-width: 640px) {
          .chat-window-overlay {
            bottom: 0;
            right: 0;
            width: 100vw;
            height: 100dvh;
            border-radius: 0;
          }
        }
        @keyframes chat-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #1a73e8, #0d47a1);
          color: #fff;
          flex-shrink: 0;
        }
        .chat-header-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chat-header-info h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .chat-header-info p {
          margin: 0;
          font-size: 11px;
          opacity: 0.8;
        }
        .chat-close-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          opacity: 0.8;
          transition: opacity 0.15s;
          display: flex;
          align-items: center;
        }
        .chat-close-btn:hover { opacity: 1; }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #f8f9fc;
          scroll-behavior: smooth;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: #c5d3e8; border-radius: 4px; }
        .chat-msg {
          max-width: 80%;
          display: flex;
          flex-direction: column;
          gap: 3px;
          animation: msg-in 0.18s ease-out;
        }
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chat-msg.user { align-self: flex-end; align-items: flex-end; }
        .chat-msg.bot  { align-self: flex-start; align-items: flex-start; }
        .chat-bubble-text {
          padding: 10px 14px;
          font-size: 13.5px;
          line-height: 1.5;
          word-break: break-word;
        }
        .chat-msg.user .chat-bubble-text {
          background: linear-gradient(135deg, #1a73e8, #1557b0);
          color: #fff;
          border-radius: 18px 18px 4px 18px;
        }
        .chat-msg.bot .chat-bubble-text {
          background: #fff;
          color: #1a1a2e;
          border-radius: 18px 18px 18px 4px;
          border: 1px solid #e8edf5;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .chat-msg-time {
          font-size: 10.5px;
          color: #8a9bb5;
          padding: 0 4px;
        }
        .chat-typing {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
          background: #fff;
          border-radius: 18px 18px 18px 4px;
          border: 1px solid #e8edf5;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .chat-typing span {
          width: 7px;
          height: 7px;
          background: #1a73e8;
          border-radius: 50%;
          animation: bounce-dot 1.2s infinite ease-in-out;
        }
        .chat-typing span:nth-child(1) { animation-delay: 0s; }
        .chat-typing span:nth-child(2) { animation-delay: 0.15s; }
        .chat-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.75); opacity: 0.5; }
          40%            { transform: scale(1.1);  opacity: 1; }
        }
        .chat-input-area {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-top: 1px solid #e8edf5;
          background: #fff;
          flex-shrink: 0;
          gap: 8px;
        }
        .chat-input {
          flex: 1;
          border: 1.5px solid #dde4ef;
          border-radius: 22px;
          padding: 9px 16px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.2s;
          background: #f6f8fc;
          color: #1a1a2e;
          resize: none;
          font-family: inherit;
          max-height: 100px;
          overflow-y: auto;
        }
        .chat-input:focus { border-color: #1a73e8; background: #fff; }
        .chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a73e8, #0d47a1);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(26,115,232,0.3);
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 4px 14px rgba(26,115,232,0.45);
        }
        .chat-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }
        .chat-send-btn svg { width: 18px; height: 18px; }
      `}</style>

      <div className="chat-window-overlay" role="dialog" aria-label="InTrust Assistant Chat">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white"/>
            </svg>
          </div>
          <div className="chat-header-info">
            <h3>InTrust Assistant</h3>
            <p>Powered by Omniflow AI</p>
          </div>
          <button
            className="chat-close-btn"
            onClick={closeChat}
            aria-label="Close chat"
            id="chat-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages" id="chat-messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-msg ${msg.sender}`}>
              <div className="chat-bubble-text">{msg.text}</div>
              <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
            </div>
          ))}

          {loading && (
            <div className="chat-typing" aria-live="polite" aria-label="Assistant is typing">
              <span /><span /><span />
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            id="chat-input"
            className="chat-input"
            type="text"
            placeholder="Ask about balance, KYC..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            disabled={loading}
            aria-label="Type your message"
          />
          <button
            id="chat-send-btn"
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            {/* Paper plane icon */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
