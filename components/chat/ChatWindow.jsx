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

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  
  if (isNaN(diffMs)) return '';
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }
}

function isBotTurnComplete(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;

  // 1. Ends with a colon
  if (trimmed.endsWith(':')) {
    return false;
  }

  // 2. Odd count of '**'
  const matches = trimmed.match(/\*\*/g);
  const count = matches ? matches.length : 0;
  if (count % 2 !== 0) {
    return false;
  }

  // 3. Ends with a word character and has no sentence-ending punctuation
  if (/\w$/.test(trimmed)) {
    return false;
  }

  return true;
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
  sessionsPath = "/api/chat/sessions",
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

  // History & Sessions management states
  const [view, setView] = useState('chat'); // 'chat' | 'history-list' | 'history-view'
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [selectedSessionMessages, setSelectedSessionMessages] = useState([]);
  const [selectedSessionLoading, setSelectedSessionLoading] = useState(false);
  const [selectedSessionError, setSelectedSessionError] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
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
        .filter((m) => {
          if (m.sender === 'user') return true;
          if (m.sender === 'bot') {
            return isBotTurnComplete(m.text);
          }
          return false;
        })
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
    [apiPath, buildHistory, sessionId]
  );

  // Fetch sessions from backend API
  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setSessionsError('Please sign in to view your chat history.');
      return;
    }
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await fetch(`${sessionsPath}?limit=30`);
      if (!res.ok) throw new Error('Failed to load past sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Sessions fetch error:', err);
      setSessionsError('Failed to load chat history. Please try again.');
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionsPath, user]);

  const handleOpenHistoryList = useCallback(() => {
    setView('history-list');
    fetchSessions();
  }, [fetchSessions]);

  const handleSelectSession = useCallback(async (sid) => {
    setActiveSessionId(sid);
    setView('history-view');
    setSelectedSessionLoading(true);
    setSelectedSessionError(null);
    setSelectedSessionMessages([]);
    try {
      const res = await fetch(`${historyPath}?sessionId=${sid}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch conversation history');
      const data = await res.json();
      if (data.messages) {
        const mapped = data.messages.map(msg => ({
          id: msg.id,
          sender: msg.role === 'model' ? 'bot' : 'user',
          text: sanitizeOnClient(msg.content),
          timestamp: new Date(msg.created_at),
          status: 'delivered'
        }));
        setSelectedSessionMessages(mapped);
      } else {
        setSelectedSessionMessages([]);
      }
    } catch (err) {
      console.error('Failed to load session history:', err);
      setSelectedSessionError('Failed to load the conversation. Please try again.');
    } finally {
      setSelectedSessionLoading(false);
    }
  }, [historyPath]);

  const handleBackToChat = useCallback(() => {
    setView('chat');
  }, []);

  const handleBackToHistoryList = useCallback(() => {
    setView('history-list');
  }, []);

  const handleNewChat = useCallback(() => {
    setSessionId(null);
    const name =
      profile?.full_name?.split(' ')[0] ||
      user?.user_metadata?.full_name?.split(' ')[0] ||
      'there';
    
    const welcomeText = welcomeMessageBuilder(name);
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: sanitizeOnClient(welcomeText),
        timestamp: new Date(),
        status: 'delivered',
      }
    ]);
    setView('chat');
    setInput('');
    setMicError(null);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [profile, user, welcomeMessageBuilder]);

  // Inject welcome message and reset session on every open
  useEffect(() => {
    if (isOpen) {
      setSessionId(null);
      const name =
        profile?.full_name?.split(' ')[0] ||
        user?.user_metadata?.full_name?.split(' ')[0] ||
        'there';

      const welcomeText = welcomeMessageBuilder(name);
      setMessages([
        {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: sanitizeOnClient(welcomeText),
          timestamp: new Date(),
          status: 'delivered',
        }
      ]);
      setLoading(false);
      setInput('');
      setMicError(null);
      setView('chat');

      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, profile, user, welcomeMessageBuilder]);

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

  return (
    <>
      <style>{`
        /* ── Desktop window ────────────────────────────── */
        .chat-window-overlay {
          position: fixed;
          bottom: 112px;
          right: 24px;
          width: 420px;
          height: 560px;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 16px 56px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          z-index: 99998;
          overflow: hidden;
          border: 1px solid rgba(26,115,232,0.12);
          opacity: 0;
          visibility: hidden;
          transform: translateY(40px) scale(0.9) rotate(2deg);
          pointer-events: none;
          transition: all 0.48s cubic-bezier(0.34, 1.7, 0.64, 1);
          transform-origin: bottom right;
        }
        .chat-window-overlay.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1) rotate(0deg);
          pointer-events: auto;
        }
        /* ── Mobile: true full-screen ─────────────────── */
        @media (max-width: 640px) {
          .chat-window-overlay {
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
            transform-origin: bottom center;
          }
          .chat-window-overlay.is-open {
            transform: translateY(0) scale(1) rotate(0deg);
          }
          /* Swipe handle */
          .chat-swipe-handle {
            display: flex !important;
          }
        }
        /* ── Swipe handle (hidden on desktop) ─────────── */
        .chat-swipe-handle {
          display: none;
          justify-content: center;
          align-items: center;
          padding: 10px 0 4px;
          background: #fff;
          flex-shrink: 0;
        }
        .chat-swipe-handle-bar {
          width: 40px;
          height: 4px;
          background: #d1d9e6;
          border-radius: 4px;
        }
        /* ── Header ──────────────────────────────────── */
        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%);
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 2px 12px ${accentColor}44;
        }
        .chat-header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.18);
          border: 2px solid rgba(255,255,255,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .chat-header-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .chat-header-info h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .chat-header-info p {
          margin: 2px 0 0;
          font-size: 11px;
          opacity: 0.85;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .chat-online-dot {
          width: 7px;
          height: 7px;
          background: #4ade80;
          border-radius: 50%;
          display: inline-block;
          animation: dot-pulse 2s ease-in-out infinite;
        }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(0.8); }
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
        /* ── Quick reply chips ─────────────────────────── */
        .chat-quick-replies {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 8px;
          padding: 8px 0 12px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .chat-quick-replies::-webkit-scrollbar { display: none; }
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
          flex-shrink: 0;
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
        /* ── Input area safe-area ─────────────────────── */
        @media (max-width: 640px) {
          .chat-input-area {
            padding-bottom: calc(10px + env(safe-area-inset-bottom)) !important;
          }
        }

        /* ── History & Sessions Styling ───────────────── */
        .chat-sessions-list {
          flex: 1;
          overflow-y: auto;
          background: #f8f9fc;
          display: flex;
          flex-direction: column;
          -webkit-overflow-scrolling: touch;
        }
        .chat-session-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          min-height: 64px;
          background: #fff;
          border: none;
          border-bottom: 1px solid #e8edf5;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          width: 100%;
          font-family: inherit;
        }
        .chat-session-row:hover {
          background: #f1f5f9;
        }
        .chat-session-row:active {
          transform: scale(0.99);
        }
        .chat-session-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .chat-session-info-container {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chat-session-row-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .chat-session-row-meta h4 {
          margin: 0;
          font-size: 13.5px;
          font-weight: 600;
          color: #1e293b;
        }
        .chat-session-time {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
        }
        .chat-session-preview-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .chat-session-preview {
          margin: 0;
          font-size: 12.5px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .chat-session-badge {
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          border-radius: 12px;
          padding: 2px 6px;
          min-width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .chat-back-btn, .chat-history-btn {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          opacity: 0.8;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
        }
        .chat-back-btn:hover, .chat-history-btn:hover {
          opacity: 1;
          background: rgba(255,255,255,0.12);
        }
        .chat-new-chat-btn:hover {
          background: rgba(255,255,255,0.3) !important;
        }
        .chat-view-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          animation: chat-view-fade 0.25s ease-out;
        }
        @keyframes chat-view-fade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .chat-header {
            padding-top: calc(14px + env(safe-area-inset-top)) !important;
          }
          .chat-readonly-area {
            padding-bottom: calc(16px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      <div className={`chat-window-overlay ${isOpen ? 'is-open' : ''}`} role="dialog" aria-label={`${assistantTitle} Chat`}>
        {/* Swipe handle — visible only on mobile */}
        <div className="chat-swipe-handle" aria-hidden="true">
          <div className="chat-swipe-handle-bar" />
        </div>
        {/* Header */}
        <div className="chat-header">
          {view === 'chat' ? (
            <>
              <div className="chat-header-avatar" aria-hidden="true">
                <img src="/robot-mascot-nobg.png" alt="Assistant" />
              </div>
              <div className="chat-header-info">
                <h3>{assistantTitle}</h3>
                <p><span className="chat-online-dot" />{assistantSubtitle}</p>
              </div>
              <button
                className="chat-history-btn"
                onClick={handleOpenHistoryList}
                aria-label="View history"
                style={{ marginLeft: 'auto', marginRight: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M12 7v5l4 2" />
                </svg>
              </button>
            </>
          ) : view === 'history-list' ? (
            <>
              <button
                className="chat-back-btn"
                onClick={handleBackToChat}
                aria-label="Back to chat"
                style={{ marginRight: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div className="chat-header-info">
                <h3>Chat History</h3>
                <p>Your past conversations</p>
              </div>
              <button
                className="chat-new-chat-btn"
                onClick={handleNewChat}
                aria-label="Start new chat"
                style={{
                  marginLeft: 'auto',
                  marginRight: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{ fontSize: '14px' }}>+</span> New chat
              </button>
            </>
          ) : (
            <>
              <button
                className="chat-back-btn"
                onClick={handleBackToHistoryList}
                aria-label="Back to history list"
                style={{ marginRight: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div className="chat-header-info">
                <h3>Past Conversation</h3>
                <p>Read-only mode</p>
              </div>
              <button
                className="chat-new-chat-btn"
                onClick={handleBackToChat}
                aria-label="Back to live chat"
                style={{
                  marginLeft: 'auto',
                  marginRight: '8px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Live Chat
              </button>
            </>
          )}
          <button
            className="chat-close-btn"
            onClick={closeChat}
            aria-label="Close chat"
            id="chat-close-btn"
            style={view === 'chat' ? {} : { marginLeft: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Dynamic Panels */}
        {view === 'chat' && (
          <div className="chat-view-container">
            {/* Messages */}
            <div className="chat-messages" id="chat-messages-container">
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
        )}

        {view === 'history-list' && (
          <div className="chat-view-container">
            <div className="chat-sessions-list">
              {sessionsLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px' }}>
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Loading past conversations...</p>
                </div>
              )}

              {sessionsError && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '24px', textAlign: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚠️</span>
                  <p style={{ fontSize: '13.5px', color: '#b91c1c' }}>{sessionsError}</p>
                  <button
                    onClick={fetchSessions}
                    style={{
                      background: accentColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '24px', textAlign: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>💬</span>
                  <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>No previous conversations yet.</p>
                  <button
                    onClick={handleNewChat}
                    style={{
                      background: accentColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: `0 4px 12px ${accentColor}33`,
                    }}
                  >
                    Start a new chat
                  </button>
                </div>
              )}

              {!sessionsLoading && !sessionsError && sessions.length > 0 && sessions.map((session) => (
                <button
                  key={session.id}
                  className="chat-session-row"
                  onClick={() => handleSelectSession(session.id)}
                  aria-label={`Conversation from ${formatRelativeTime(session.last_active_at)}. ${session.messageCount} messages.`}
                >
                  <div className="chat-session-icon" style={{ color: accentColor }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="chat-session-info-container">
                    <div className="chat-session-row-meta">
                      <h4>Conversation</h4>
                      <span className="chat-session-time">{formatRelativeTime(session.last_active_at)}</span>
                    </div>
                    <div className="chat-session-preview-line">
                      <p className="chat-session-preview">{session.preview || 'No text preview available'}</p>
                      {session.messageCount > 0 && (
                        <span className="chat-session-badge" style={{ backgroundColor: accentColor }}>
                          {session.messageCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'history-view' && (
          <div className="chat-view-container">
            <div className="chat-messages" id="chat-messages-container">
              {selectedSessionLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {selectedSessionError && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '24px', textAlign: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚠️</span>
                  <p style={{ fontSize: '13.5px', color: '#b91c1c' }}>{selectedSessionError}</p>
                  <button
                    onClick={() => handleSelectSession(activeSessionId)}
                    style={{
                      background: accentColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!selectedSessionLoading && !selectedSessionError && selectedSessionMessages.map((msg) => (
                <div key={msg.id} className={`chat-msg ${msg.sender}`}>
                  <div className="chat-bubble-text">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div
              className="chat-input-area chat-readonly-area"
              style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '13px',
                textAlign: 'center',
                padding: '16px',
                fontWeight: '500',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Viewing a past conversation (read-only)</span>
              <button
                onClick={handleBackToChat}
                style={{
                  background: accentColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: `0 2px 6px ${accentColor}22`,
                }}
              >
                Return to Live Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ChatWindow() {
  return <BaseChatWindow />;
}
