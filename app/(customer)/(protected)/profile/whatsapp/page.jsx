'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function WhatsAppLinkPage() {
  const { user } = useAuth();
  const router = useRouter();

  // — Status fetch —
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // — Retry/Poll state —
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);

  // — Marketing consent toggle —
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();

      setStatus(data);
      // Sync marketing toggle from persisted value
      setMarketingOptIn(data.whatsappMarketingOptIn ?? false);

      if (data.linked === false && data.hasPhone === true && !retried) {
        setRetrying(true);
        setTimeout(async () => {
          try {
            const retryRes = await fetch('/api/whatsapp/status');
            const retryData = await retryRes.json();
            setStatus(retryData);
            setMarketingOptIn(retryData.whatsappMarketingOptIn ?? false);
          } catch {
            setStatus({ linked: false, hasPhone: data.hasPhone });
          } finally {
            setRetried(true);
            setRetrying(false);
          }
        }, 2000);
      }
    } catch {
      setStatus({ linked: false });
    } finally {
      setStatusLoading(false);
    }
  }, [retried]);

  const handleOptOut = async () => {
    try {
      setStatusLoading(true);
      const res = await fetch('/api/whatsapp/opt-out', { method: 'POST' });
      if (res.ok) {
        await fetchStatus();
      } else {
        setStatusLoading(false);
      }
    } catch {
      setStatusLoading(false);
    }
  };

  const handleMarketingToggle = async (newValue) => {
    // Optimistic update
    setMarketingOptIn(newValue);
    setMarketingLoading(true);
    try {
      const res = await fetch('/api/whatsapp/marketing-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optIn: newValue }),
      });
      if (!res.ok) {
        // Rollback on failure
        setMarketingOptIn(!newValue);
      }
    } catch {
      // Rollback on network error
      setMarketingOptIn(!newValue);
    } finally {
      setMarketingLoading(false);
    }
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
        .wa-status-chip.opted-out {
          background: #f1f5f9;
          color: #64748b;
        }
        .wa-status-chip .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .wa-status-chip.linked .dot     { background: #2e7d32; }
        .wa-status-chip.not-linked .dot { background: #c62828; }
        .wa-status-chip.opted-out .dot  { background: #64748b; }
        .wa-detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #5c6880;
          margin-bottom: 20px;
        }
        .wa-instructions, .wa-info-card {
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
        .wa-btn.primary-btn {
          background: #1a73e8;
          box-shadow: 0 4px 16px rgba(26,115,232,0.35);
        }
        .wa-btn.primary-btn:hover:not(:disabled) {
          box-shadow: 0 6px 22px rgba(26,115,232,0.45);
        }
        .wa-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

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

        .wa-optout-link {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          color: #8a95aa;
          cursor: pointer;
          margin-top: 10px;
          text-decoration: underline;
          transition: color 0.15s;
        }
        .wa-optout-link:hover {
          color: #c62828;
        }

        .wa-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(26, 115, 232, 0.3);
          border-radius: 50%;
          border-top-color: #1a73e8;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Notification preference toggles ─────────────────────────────────── */
        .wa-prefs-divider {
          border: none;
          border-top: 1px solid #e8edf5;
          margin: 20px 0 0;
        }
        .wa-pref-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #f0f4ff;
        }
        .wa-pref-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .wa-pref-label .title {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .wa-pref-label .sub {
          font-size: 12px;
          color: #6b7a99;
          margin-top: 2px;
        }
        .wa-toggle {
          position: relative;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }
        .wa-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .wa-toggle-track {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: #ccc;
          cursor: pointer;
          transition: background 0.2s;
        }
        .wa-toggle input:checked + .wa-toggle-track {
          background: #25d366;
        }
        .wa-toggle input:disabled + .wa-toggle-track {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .wa-toggle-track::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        }
        .wa-toggle input:checked + .wa-toggle-track::after {
          transform: translateX(20px);
        }
        .wa-toggle-spinner {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.5);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="wa-page">
        <div className="wa-card">
          <div className="wa-card-header">
            <div className="wa-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2>WhatsApp Alerts</h2>
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
                WhatsApp alerts active
              </div>
              <div className="wa-detail-row">
                <span>📱</span>
                <span><strong>{status.phone}</strong> — linked on {formatDate(status.linkedAt)}</span>
              </div>
              <div className="wa-instructions">
                Your WhatsApp is connected. Message InTrust to check your balance and KYC status anytime.
              </div>

              {status.whatsappOptIn === false ? (
                <div className="wa-status-chip opted-out" style={{ marginBottom: 0, marginTop: '8px' }}>
                  <span className="dot" aria-hidden="true" />
                  Opted out of alerts
                </div>
              ) : (
                <button className="wa-optout-link" onClick={handleOptOut}>
                  Opt out of WhatsApp alerts
                </button>
              )}

              {/* ── Notification preferences ─────────────────────────────────── */}
              <hr className="wa-prefs-divider" />

              {/* Row 1: Master WhatsApp notifications (read-only reflect of whatsapp_opt_in) */}
              <div className="wa-pref-row">
                <div className="wa-pref-label">
                  <div className="title">WhatsApp notifications</div>
                  <div className="sub">Order, wallet &amp; account alerts</div>
                </div>
                <label
                  className="wa-toggle"
                  htmlFor="toggle-whatsapp"
                  title={status.whatsappOptIn ? 'Active' : 'Opted out'}
                >
                  <input
                    id="toggle-whatsapp"
                    type="checkbox"
                    checked={status.whatsappOptIn ?? true}
                    readOnly
                    disabled
                    aria-label="WhatsApp notifications"
                  />
                  <span className="wa-toggle-track" />
                </label>
              </div>

              {/* Row 2: Promotional / marketing consent */}
              <div className="wa-pref-row">
                <div className="wa-pref-label">
                  <div className="title">Promotional messages</div>
                  <div className="sub">Good morning/evening, offers, rewards</div>
                </div>
                <label
                  className="wa-toggle"
                  htmlFor="toggle-marketing"
                  title={
                    !status.whatsappOptIn
                      ? 'Enable WhatsApp alerts first'
                      : marketingOptIn
                      ? 'Receiving promotional messages'
                      : 'Opt in to promotional messages'
                  }
                >
                  <input
                    id="toggle-marketing"
                    type="checkbox"
                    checked={marketingOptIn}
                    disabled={!status.whatsappOptIn || marketingLoading}
                    onChange={(e) => handleMarketingToggle(e.target.checked)}
                    aria-label="Promotional messages"
                  />
                  <span className="wa-toggle-track" />
                  {marketingLoading && <span className="wa-toggle-spinner" aria-hidden="true" />}
                </label>
              </div>
            </>
          ) : status?.hasPhone && !retried ? (
            <div style={{ display: 'flex', alignItems: 'center', color: '#5c6880', fontSize: '14px' }}>
              <div className="wa-spinner" />
              Connecting your WhatsApp…
            </div>
          ) : (
            <>
              <div className="wa-status-chip not-linked">
                <span className="dot" aria-hidden="true" />
                WhatsApp not connected
              </div>

              <div className="wa-info-card">
                Add a mobile number to your profile to automatically receive WhatsApp alerts — no OTP needed.
              </div>

              <button
                className="wa-btn primary-btn"
                onClick={() => router.push('/profile')}
              >
                Go to Profile →
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
