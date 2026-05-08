'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * /app/(customer)/profile/whatsapp/page.jsx
 * Profile settings section for linking / managing a WhatsApp number.
 *
 * Two-step flow:
 *   Step 1 — "Send OTP to WhatsApp" button (calls /api/whatsapp/link-phone)
 *   Step 2 — OTP entry form (calls /api/whatsapp/verify-otp) with:
 *              • 6-digit input with iOS/Android/WebOTP autofill
 *              • 60-second resend cooldown
 *              • "Use a different number" cancel action
 *
 * The webhook reply path (Flow A in /api/webhooks/omniflow) still works as a
 * fallback — both paths upsert to the same user_channel_bindings table.
 */
export default function WhatsAppLinkPage() {
  const { user } = useAuth();
  const router = useRouter();

  // — Status fetch —
  const [status, setStatus] = useState(null);   // { linked, phone, linkedAt } | null
  const [statusLoading, setStatusLoading] = useState(true);

  // — Step 1: Send OTP —
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // — Step 2: OTP entry —
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const cooldownRef = useRef(null);
  const otpInputRef = useRef(null);

  // Fetch current linking status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Start 60-second cooldown after OTP is sent
  useEffect(() => {
    if (otpSent) {
      startCooldown();
    }
    return () => clearInterval(cooldownRef.current);
  }, [otpSent]);

  // Auto-focus OTP input when step 2 mounts
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpSent]);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ linked: false });
    } finally {
      setStatusLoading(false);
    }
  }

  function startCooldown() {
    clearInterval(cooldownRef.current);
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const handleSendOtp = async () => {
    setSending(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/whatsapp/link-phone', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
      } else {
        // Move to step 2
        setSuccessMsg('');
        setErrorMsg('');
        setOtp('');
        setOtpSent(true);
      }
    } catch {
      setErrorMsg('Network error. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp('');
    setErrorMsg('');
    await handleSendOtp();
    // startCooldown() is triggered via the otpSent useEffect on re-render,
    // but since otpSent stays true we need to restart it manually here.
    startCooldown();
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || verifying) return;

    setVerifying(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        // On invalid OTP (400) clear the field so user can retry cleanly
        if (res.status === 400) setOtp('');
        setErrorMsg(data.error || 'Verification failed. Please try again.');
      } else {
        // Success — show brief confirmation then redirect to profile
        setSuccessMsg('WhatsApp connected! Redirecting...');
        setErrorMsg('');
        setOtpSent(false);
        clearInterval(cooldownRef.current);
        await fetchStatus();
        setTimeout(() => router.push('/profile'), 1500);
      }
    } catch {
      setErrorMsg('Network error. Please check your connection.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpKeyDown = (e) => {
    if (e.key === 'Enter') handleVerifyOtp();
  };

  const handleCancelOtp = () => {
    setOtpSent(false);
    setOtp('');
    setErrorMsg('');
    setSuccessMsg('');
    clearInterval(cooldownRef.current);
    setCooldown(0);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <style>{`
        .wa-page {
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 16px;
          font-family: var(--font-outfit, sans-serif);
        }
        .wa-card {
          background: #fff;
          border: 1px solid #e8edf5;
          border-radius: 16px;
          padding: 28px 28px 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .wa-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .wa-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #25d366, #128c7e);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wa-card-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1a1a2e;
        }
        .wa-card-header p {
          margin: 2px 0 0;
          font-size: 13px;
          color: #6b7a99;
        }
        .wa-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .wa-status-chip.linked {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .wa-status-chip.not-linked {
          background: #fce4ec;
          color: #c62828;
        }
        .wa-status-chip .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .wa-status-chip.linked .dot     { background: #2e7d32; }
        .wa-status-chip.not-linked .dot { background: #c62828; }
        .wa-detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #5c6880;
          margin-bottom: 20px;
        }
        .wa-instructions {
          background: #f0f4ff;
          border-left: 3px solid #1a73e8;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          color: #3d4a6e;
          margin-bottom: 22px;
          line-height: 1.6;
        }
        .wa-btn {
          width: 100%;
          padding: 13px 24px;
          border-radius: 12px;
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(37,211,102,0.35);
        }
        .wa-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(37,211,102,0.45);
        }
        .wa-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .wa-success-msg {
          margin-top: 14px;
          padding: 12px 14px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.5;
        }
        .wa-error-msg {
          margin-top: 14px;
          padding: 12px 14px;
          background: #fce4ec;
          color: #c62828;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.5;
        }
        .wa-skeleton {
          height: 20px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          border-radius: 6px;
          animation: skeleton-shine 1.4s infinite;
          margin-bottom: 12px;
          width: 60%;
        }
        @keyframes skeleton-shine {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── OTP entry styles ── */
        .wa-otp-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .wa-otp-label {
          font-size: 13px;
          color: #4a5568;
          margin-bottom: 10px;
          text-align: center;
          line-height: 1.5;
        }
        .wa-otp-input {
          width: 100%;
          max-width: 240px;
          padding: 14px 0;
          font-size: 28px;
          font-weight: 700;
          font-family: 'Courier New', 'Roboto Mono', monospace;
          letter-spacing: 0.22em;
          text-align: center;
          border: 2px solid #c9d4ea;
          border-radius: 12px;
          outline: none;
          color: #1a1a2e;
          background: #f8faff;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
          appearance: none;
          margin-bottom: 18px;
        }
        .wa-otp-input:focus {
          border-color: #25d366;
          box-shadow: 0 0 0 3px rgba(37,211,102,0.15);
          background: #fff;
        }
        .wa-otp-input::placeholder {
          color: #c9d4ea;
          letter-spacing: 0.1em;
          font-size: 20px;
        }
        .wa-resend-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 13px;
          color: #6b7a99;
        }
        .wa-resend-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          color: #1a73e8;
          text-decoration: underline;
          transition: color 0.15s;
        }
        .wa-resend-btn:disabled {
          color: #a0aec0;
          cursor: not-allowed;
          text-decoration: none;
        }
        .wa-resend-btn:hover:not(:disabled) {
          color: #1557b0;
        }
        .wa-cancel-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          color: #8a95aa;
          cursor: pointer;
          margin-top: 18px;
          text-decoration: underline;
          transition: color 0.15s;
        }
        .wa-cancel-btn:hover {
          color: #4a5568;
        }
        .wa-divider {
          width: 100%;
          border: none;
          border-top: 1px solid #eef1f8;
          margin: 20px 0;
        }
      `}</style>

      <div className="wa-page">
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-icon" aria-hidden="true">
              {/* WhatsApp icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2>Connect WhatsApp</h2>
              <p>Get instant updates on your account via WhatsApp</p>
            </div>
          </div>

          {statusLoading ? (
            <div aria-busy="true" aria-label="Loading status">
              <div className="wa-skeleton" />
              <div className="wa-skeleton" style={{ width: '40%' }} />
            </div>
          ) : status?.linked ? (
            <>
              <div className="wa-status-chip linked">
                <span className="dot" aria-hidden="true" />
                WhatsApp connected
              </div>
              <div className="wa-detail-row">
                <span>📱</span>
                <span><strong>{status.phone}</strong> — linked on {formatDate(status.linkedAt)}</span>
              </div>
              <div className="wa-instructions">
                Your WhatsApp is connected. You can now message InTrust on WhatsApp to check your wallet balance and KYC status anytime.
              </div>
              {successMsg && (
                <div className="wa-success-msg" role="status" aria-live="polite">
                  ✅ {successMsg}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="wa-status-chip not-linked">
                <span className="dot" aria-hidden="true" />
                WhatsApp not connected
              </div>

              {!otpSent ? (
                /* ── Step 1: Send OTP ── */
                <>
                  <div className="wa-instructions">
                    We&apos;ll send a one-time code to your registered phone number via WhatsApp.
                    Enter the code on this page to complete the linking — no need to reply on WhatsApp.
                  </div>

                  <button
                    id="wa-send-otp-btn"
                    className="wa-btn"
                    onClick={handleSendOtp}
                    disabled={sending}
                    aria-busy={sending}
                  >
                    {sending ? (
                      'Sending OTP...'
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                        Send OTP to WhatsApp
                      </>
                    )}
                  </button>

                  {successMsg && (
                    <div className="wa-success-msg" role="status" aria-live="polite">
                      ✅ {successMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div className="wa-error-msg" role="alert">
                      ❌ {errorMsg}
                    </div>
                  )}
                </>
              ) : (
                /* ── Step 2: Enter OTP ── */
                <div className="wa-otp-section">
                  <div className="wa-instructions" style={{ width: '100%', marginBottom: '20px' }}>
                    A 6-digit code has been sent to your WhatsApp. Enter it below to complete linking.
                  </div>

                  <p className="wa-otp-label">Enter the 6-digit code from WhatsApp</p>

                  <input
                    ref={otpInputRef}
                    id="wa-otp-input"
                    className="wa-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => {
                      // Strip non-digits, clamp to 6 chars
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(cleaned);
                    }}
                    onKeyDown={handleOtpKeyDown}
                    aria-label="One-time password"
                    aria-describedby="wa-otp-hint"
                    disabled={verifying}
                  />

                  <button
                    id="wa-verify-otp-btn"
                    className="wa-btn"
                    onClick={handleVerifyOtp}
                    disabled={otp.length !== 6 || verifying}
                    aria-busy={verifying}
                    style={{ width: '100%' }}
                  >
                    {verifying ? 'Verifying...' : 'Verify & Connect'}
                  </button>

                  {errorMsg && (
                    <div className="wa-error-msg" role="alert" style={{ width: '100%' }}>
                      ❌ {errorMsg}
                    </div>
                  )}

                  <hr className="wa-divider" />

                  <div className="wa-resend-row" id="wa-otp-hint">
                    <span>Didn&apos;t get the code?</span>
                    <button
                      className="wa-resend-btn"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || sending}
                      aria-label={cooldown > 0 ? `Resend available in ${cooldown} seconds` : 'Resend OTP'}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                    </button>
                  </div>

                  <button
                    className="wa-cancel-btn"
                    onClick={handleCancelOtp}
                    aria-label="Use a different number or cancel"
                  >
                    Use a different number / Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
