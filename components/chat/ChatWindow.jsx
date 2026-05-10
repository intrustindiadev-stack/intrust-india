'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from './ChatProvider';
import { useAuth } from '@/lib/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { CHAT_HIDDEN_PATHS } from './hiddenPaths';

import { WELCOME_MESSAGE } from '@/lib/chat/promptTemplates';

// Client-side PII regex (mirrors lib/piiFilter.js — kept as a defence-in-depth layer)
const AADHAAR_RE = /(?<!\d)(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?!\d)/g;
const PAN_RE = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g;
const PII_FALLBACK = "I can't share that information here. Please visit your profile page for secure details.";

function sanitizeOnClient(text) {
  if (!text) return text;
  AADHAAR_RE.lastIndex = 0;
  PAN_RE.lastIndex = 0;
  const hasAadhaar = AADHAAR_RE.test(text);
  AADHAAR_RE.lastIndex = 0;
  PAN_RE.lastIndex = 0;
  const hasPan = PAN_RE.test(text);
  AADHAAR_RE.lastIndex = 0;
  PAN_RE.lastIndex = 0;
  return (hasAadhaar || hasPan) ? PII_FALLBACK : text;
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const MAX_MESSAGES = 20;
// Number of most-recent message pairs sent as history to the API
const HISTORY_WINDOW = 8;

const QUICK_REPLIES = [
  { label: '💰 Check Balance', text: 'What is my wallet balance?' },
  { label: '✅ KYC Status', text: 'What is my KYC status?' },
  { label: '🎁 How do gift cards work?', text: 'How do gift cards work on InTrust?' },
  { label: '🏆 Explain reward points', text: 'How do reward points work?' },
  { label: '👥 How do I refer a friend?', text: 'How do I refer a friend and earn rewards?' },
  { label: '📦 Track my orders', text: 'Where can I track my orders?' },
];

/**
 * ChatWindow
 * The chat panel that opens when ChatBubble is clicked.
 * Slide-up animation, typing indicator, auto-scroll, mobile full-screen.
 * Sends multi-turn conversation history on every request.
 */
export function BaseChatWindow({
  apiPath = "/api/chat/message",
  historyPath = "/api/chat/history",
  welcomeMessageBuilder = WELCOME_MESSAGE,
  quickReplies = QUICK_REPLIES,
  assistantTitle = "InTrust Assistant",
  assistantSubtitle = "Online · Always here to help",
  hiddenPaths = CHAT_HIDDEN_PATHS,
  accentColor = "#1a73e8"
}) {
  const { isOpen, closeChat, setHasUnread } = useChat();
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('there');
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null); // user-facing STT error message
  const [sessionId, setSessionId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  // Accumulated finalized transcript across multiple result events
  const finalizedTranscriptRef = useRef('');

  // --- Preflight: detect STT environment support once ---
  const isSttSupported =
    typeof window !== 'undefined' &&
    typeof window.isSecureContext !== 'undefined' &&
    window.isSecureContext &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Helper: cleanly stop the active recognizer and reset state
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (_) { /* ignore if already stopped */ }
      recognitionRef.current = null;
    }
    finalizedTranscriptRef.current = '';
    setIsListening(false);
  }, []);

  // Speech-to-text using Web SpeechRecognition API
  const handleMic = useCallback(() => {
    // --- Preflight checks (Comment 3) ---
    if (!isSttSupported) {
      setMicError('Voice input requires a secure connection (HTTPS) and a supported browser such as Chrome or Safari.');
      return;
    }

    setMicError(null);

    // Stop if already listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    // Reset accumulator for this new session
    finalizedTranscriptRef.current = '';

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    // --- Comment 1: accumulate finalized + interim segments ---
    recognition.onresult = (event) => {
      // Accumulate any newly finalized segments that precede resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalizedTranscriptRef.current += event.results[i][0].transcript;
        }
      }
      // Build the display value: all finalized text + current interim word(s)
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) {
          interim += event.results[i][0].transcript;
        }
      }
      setInput(finalizedTranscriptRef.current + interim);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      finalizedTranscriptRef.current = '';
      setIsListening(false);
      // Auto-focus input so user can edit or send
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    // --- Comment 3: user-facing error messages for known error codes ---
    recognition.onerror = (e) => {
      console.error('[STT] Error:', e.error);
      let userMessage = null;
      switch (e.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          userMessage = 'Microphone access was denied. Please allow mic permissions in your browser settings, then try again.';
          break;
        case 'audio-capture':
          userMessage = 'No microphone was found. Please connect a mic and try again.';
          break;
        case 'network':
          userMessage = 'A network error occurred during speech recognition. Check your connection and try again.';
          break;
        case 'no-speech':
          userMessage = 'No speech detected. Please speak clearly and try again.';
          break;
        default:
          userMessage = `Voice input error: ${e.error}. Please type your message instead.`;
      }
      setMicError(userMessage);
      recognitionRef.current = null;
      finalizedTranscriptRef.current = '';
      setIsListening(false);
    };

    recognition.start();
  }, [isListening, isSttSupported]);

  // --- Comment 2: Stop recognition when chat closes or component unmounts ---
  useEffect(() => {
    if (!isOpen && isListening) {
      stopRecognition();
    }
  }, [isOpen, isListening, stopRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  /**
   * Builds the history array from the current messages state.
   * Maps sender → role and takes the last HISTORY_WINDOW entries.
   * The welcome bot message is excluded from history (it's not a real turn).
   */
  const buildHistory = useCallback(
    (currentMessages) =>
      currentMessages
        .filter((m) => m.sender === 'user' || m.sender === 'bot')
        .map((m) => ({
          role: m.sender === 'bot' ? 'model' : 'user',
          text: m.text,
        }))
        .slice(-HISTORY_WINDOW),
    []
  );

  const sendToAPI = useCallback(
    async (text, currentMessages) => {
      const history = buildHistory(currentMessages);

      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, sessionId }),
      });

      return res.json();
    },
    [buildHistory, sessionId]
  );

  // Inject welcome message once on first open
  useEffect(() => {
    if (isOpen && !hasWelcomed) {
      setHasWelcomed(true);
      const name =
        profile?.full_name?.split(' ')[0] ||
        user?.user_metadata?.full_name?.split(' ')[0] ||
        firstName;

      const fetchHistory = async () => {
        if (!user) {
          addBotMessage(welcomeMessageBuilder(name));
          return;
        }

        setHistoryLoading(true);
        try {
          const res = await fetch(`${historyPath}?limit=50`);
          if (!res.ok) throw new Error('Failed to fetch history');
          const data = await res.json();

          if (data.messages && data.messages.length > 0) {
            const mapped = data.messages.map(msg => ({
              id: msg.id,
              sender: msg.role === 'model' ? 'bot' : 'user',
              text: sanitizeOnClient(msg.content),
              timestamp: new Date(msg.created_at),
              status: 'delivered'
            }));
            setMessages(mapped);
            setSessionId(data.sessionId);
          } else {
            addBotMessage(welcomeMessageBuilder(name));
          }
        } catch (err) {
          console.error('History fetch error:', err);
          addBotMessage(welcomeMessageBuilder(name));
        } finally {
          setHistoryLoading(false);
        }
      };

      fetchHistory();
    }

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasWelcomed, profile, user, firstName, addBotMessage]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    // Capture current messages before adding the user's new message
    const snapshot = [...messages];
    addUserMessage(text);
    setLoading(true);

    try {
      const data = await sendToAPI(text, snapshot);

      if (data.sessionId) setSessionId(data.sessionId);

      if (data.firstName && data.firstName !== 'Customer' && data.firstName !== 'there') {
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
  }, [input, loading, messages, isOpen, addUserMessage, addBotMessage, setHasUnread, sendToAPI]);

  // Quick reply — sends a preset message directly without touching input state
  const handleQuickReply = useCallback(async (text) => {
    if (loading) return;
    const snapshot = [...messages];
    addUserMessage(text);
    setLoading(true);

    try {
      const data = await sendToAPI(text, snapshot);

      if (data.sessionId) setSessionId(data.sessionId);

      if (data.firstName && data.firstName !== 'Customer' && data.firstName !== 'there') {
        setFirstName(data.firstName);
      }
      addBotMessage(data.reply || 'Sorry, I had trouble responding. Please try again.');
      if (!isOpen) setHasUnread(true);
    } catch {
      addBotMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, messages, isOpen, addUserMessage, addBotMessage, setHasUnread, sendToAPI]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const pathname = usePathname();
  const isHidden = hiddenPaths.some((p) => pathname?.startsWith(p));
  if (isHidden) return null;

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .chat-window-overlay {
            bottom: 110px;
            right: 16px;
            left: 16px;
            width: auto;
            height: 65dvh;
            border-radius: 20px;
            transform-origin: bottom center;
          }
        }
        .chat-window-overlay {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: 380px;
          height: 520px;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          z-index: 99998;
          overflow: hidden;
          border: 1px solid rgba(26,115,232,0.15);
          
          /* Premium Spring Animation */
          opacity: 0;
          visibility: hidden;
          transform: translateY(40px) scale(0.9) rotate(2deg);
          pointer-events: none;
          transition: all 0.5s cubic-bezier(0.34, 1.7, 0.64, 1);
          transform-origin: bottom right;
        }
        .chat-window-overlay.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1) rotate(0deg);
          pointer-events: auto;
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px;
          background: ${accentColor};
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
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f8f9fc;
          scroll-behavior: smooth;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: #c5d3e8; border-radius: 4px; }
        .chat-msg {
          max-width: 85%;
          display: flex;
          flex-direction: column;
          gap: 4px;
          animation: msg-in 0.4s cubic-bezier(0.34, 1.7, 0.64, 1);
        }
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-msg.user { align-self: flex-end; align-items: flex-end; }
        .chat-msg.bot  { align-self: flex-start; align-items: flex-start; }
        .chat-bubble-text {
          padding: 10px 14px;
          font-size: 13.5px;
          line-height: 1.5;
          word-break: break-word;
        }
        .chat-bubble-text p {
          margin: 0;
        }
        .chat-bubble-text p + p {
          margin-top: 8px;
        }
        .chat-bubble-text ul, .chat-bubble-text ol {
          margin: 6px 0 6px 20px;
          padding: 0;
        }
        .chat-bubble-text li {
          margin-bottom: 2px;
        }
        .chat-bubble-text a {
          color: inherit;
          text-decoration: underline;
        }
        .chat-msg.user .chat-bubble-text {
          background: ${accentColor};
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
          background: ${accentColor};
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
        .chat-input:focus { border-color: ${accentColor}; background: #fff; }
        .chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${accentColor};
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px ${accentColor}4d;
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.08);
          box-shadow: 0 4px 14px ${accentColor}73;
        }
        .chat-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }
        .chat-send-btn svg { width: 18px; height: 18px; }
        .chat-mic-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: transparent;
          border: 1.5px solid #dde4ef;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          color: #64748b;
        }
        .chat-mic-btn:hover {
          border-color: ${accentColor};
          color: ${accentColor};
          background: ${accentColor}15;
        }
        .chat-mic-btn.listening {
          border-color: #ef4444;
          color: #ef4444;
          background: #fef2f2;
          animation: mic-pulse 1s ease-in-out infinite;
        }
        .chat-mic-btn svg { width: 17px; height: 17px; }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .chat-quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 0;
        }
        .chat-qr-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 500;
          border: 1.5px solid ${accentColor};
          border-radius: 20px;
          background: #fff;
          color: ${accentColor};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.7, 0.64, 1);
          white-space: nowrap;
          font-family: inherit;
          animation: msg-in 0.5s cubic-bezier(0.34, 1.7, 0.64, 1) both;
        }
        .chat-qr-chip:nth-child(1) { animation-delay: 0.1s; }
        .chat-qr-chip:nth-child(2) { animation-delay: 0.15s; }
        .chat-qr-chip:nth-child(3) { animation-delay: 0.2s; }
        .chat-qr-chip:nth-child(4) { animation-delay: 0.25s; }
        .chat-qr-chip:nth-child(5) { animation-delay: 0.3s; }
        .chat-qr-chip:nth-child(6) { animation-delay: 0.35s; }

        .chat-qr-chip:hover {
          background: ${accentColor};
          color: #fff;
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 4px 12px ${accentColor}40;
        }
        .chat-qr-chip:active { transform: scale(0.95); }
      `}</style>

      <div className={`chat-window-overlay ${isOpen ? 'is-open' : ''}`} role="dialog" aria-label={`${assistantTitle} Chat`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-avatar" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white" />
            </svg>
          </div>
          <div className="chat-header-info">
            <h3>{assistantTitle}</h3>
            <p>{assistantSubtitle}</p>
          </div>
          <button
            className="chat-close-btn"
            onClick={closeChat}
            aria-label="Close chat"
            id="chat-close-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages" id="chat-messages-container">
          {historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="chat-typing">
                <span /><span /><span />
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-msg ${msg.sender}`}>
                  <div className="chat-bubble-text">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              ))}

              {/* Quick reply chips — shown only after welcome message, before user sends anything */}
              {messages.length === 1 && !loading && (
                <div className="chat-quick-replies" role="group" aria-label="Quick reply suggestions">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr.text}
                      className="chat-qr-chip"
                      onClick={() => handleQuickReply(qr.text)}
                      aria-label={qr.label}
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <div className="chat-typing" aria-live="polite" aria-label="Assistant is typing">
                  <span /><span /><span />
                </div>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="chat-input-area" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
          {/* Mic error banner (Comment 3) */}
          {micError && (
            <div
              role="alert"
              style={{
                fontSize: '11.5px',
                color: '#b91c1c',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '6px 10px',
                marginBottom: '6px',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
              }}
            >
              <span aria-hidden="true" style={{ flexShrink: 0 }}>🎙️</span>
              <span>{micError} <strong>Type your message below.</strong></span>
              <button
                onClick={() => setMicError(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '13px', flexShrink: 0 }}
                aria-label="Dismiss mic error"
              >✕</button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mic button — hidden when STT is unsupported (Comment 3) */}
          {isSttSupported && (
          <button
            id="chat-mic-btn"
            className={`chat-mic-btn${isListening ? ' listening' : ''}`}
            onClick={handleMic}
            disabled={loading}
            aria-label={isListening ? 'Stop recording' : 'Start voice input'}
            title={isListening ? 'Tap to stop' : 'Speak your message'}
          >
            {isListening ? (
              /* Waveform / stop indicator */
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="7" width="3" height="10" rx="1.5" />
                <rect x="8" y="4" width="3" height="16" rx="1.5" />
                <rect x="13" y="7" width="3" height="10" rx="1.5" />
                <rect x="18" y="9" width="3" height="6" rx="1.5" />
              </svg>
            ) : (
              /* Microphone icon */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M19 10a7 7 0 0 1-14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            )}
          </button>
          )}

          <input
            ref={inputRef}
            id="chat-input"
            className="chat-input"
            type="text"
            placeholder={isListening ? '🎙️ Listening...' : 'Ask anything about InTrust...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={1000}
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
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ChatWindow() {
  return <BaseChatWindow />;
}
