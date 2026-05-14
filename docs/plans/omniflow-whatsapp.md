> **Status:** Implemented

# Implementation Plan: WhatsApp Chatbot + Web Chat UI
## InTrust India Fintech Platform

**Version:** 2.0  
**Date:** April 2026  
**Scope:** Planning only — no code, no UI mockups  
**Stack:** Next.js, Supabase, Tailwind CSS, Omniflow WhatsApp API  

---

## 0. Environment Variables

Add these to `.env.local` before any work begins:

```bash
# Meta / WhatsApp
META_WABA_ID=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_WEBHOOK_VERIFY_TOKEN=

# Omniflow
OMNIFLOW_BASE_URL=https://whatsapp.ominiflow.com
OMNIFLOW_API_TOKEN=
OMNIFLOW_WEBHOOK_SECRET=

# InTrust
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=               # Reuse existing lib/encryption.js key
```

---

## 1. Database Changes

### 1.1 Create `user_channel_bindings` Table
**Purpose:** Link a Supabase auth user to their WhatsApp phone number after OTP verification.

```sql
CREATE TABLE user_channel_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_e164_phone CHECK (phone ~ '^\+[1-9]\d{1,14}$')
);

CREATE INDEX idx_channel_bindings_phone ON user_channel_bindings(phone);
CREATE INDEX idx_channel_bindings_user ON user_channel_bindings(user_id);
```

**Fields:**
- `user_id` — UUID, FK to `auth.users`, CASCADE on delete
- `phone` — E.164 format (e.g., `+9198XXXXXXXX`), UNIQUE
- `whatsapp_opt_in` — BOOLEAN, default `false`
- `linked_at` — auto-set on INSERT
- `updated_at` — auto-set on UPDATE

**RLS:**
- Users can read their own row only.
- Service role key used by backend API routes for writes.

---

### 1.2 Create `whatsapp_message_logs` Table
**Purpose:** Audit log for every inbound and outbound message across both web and WhatsApp channels.

```sql
CREATE TABLE whatsapp_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone_hash TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp')),
  status TEXT DEFAULT 'pending',
  content_preview TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_logs_user_created ON whatsapp_message_logs(user_id, created_at);
CREATE INDEX idx_whatsapp_logs_channel ON whatsapp_message_logs(channel, created_at);
```

**Fields:**
- `user_id` — UUID, FK to `auth.users`, nullable (for unbound inbound messages)
- `phone_hash` — SHA-256 hash of the phone number. Never store raw phone numbers.
- `direction` — `'inbound'` or `'outbound'`
- `message_type` — `'text'`, `'template'`, `'list'`
- `channel` — `'web'` or `'whatsapp'`
- `status` — `'pending'`, `'delivered'`, `'failed'`
- `content_preview` — First 100 chars of the message (for admin debugging, no PII)
- `created_at` — auto-set

**RLS:**
- Users can read only their own logs.
- Admins can read all logs.

**Estimated time:** 2 hours (schema + RLS + local testing)

---

## 2. Backend Routes

### 2.1 `POST /api/whatsapp/link-phone`
**Purpose:** Start the one-time phone linking flow from the Web UI.

**Flow:**
1. Read JWT from the request session (Supabase auth cookie).
2. Validate JWT — extract `user.id` and `user.phone` from Supabase.
3. If `user.phone` is missing, return `400`.
4. Generate 6-digit OTP using `lib/otpUtils.js`.
5. Store OTP temporarily in `otp_codes` table (reuse existing table) with:
   - `phone` = user's phone
   - `code` = OTP
   - `purpose` = `'whatsapp_link'`
   - `expires_at` = `NOW() + INTERVAL '10 minutes'`
6. Call Omniflow API to send template message:
   ```
   POST {{OMNIFLOW_BASE_URL}}/api/wpbox/sendtemplatemessage
   Body:
   {
     "token": "{{OMNIFLOW_API_TOKEN}}",
     "phone": "{{user_phone}}",
     "template_name": "intrust_otp_verification",
     "template_language": "en",
     "components": [
       {
         "type": "body",
         "parameters": [{ "type": "text", "text": "{{otp_code}}" }]
       }
     ]
   }
   ```
7. Return `200` with `{ success: true, message: "OTP sent to your WhatsApp" }`.

**Error handling:**
- `401` — No valid session
- `400` — Phone number not found on user profile
- `500` — Omniflow API failure (log error, return generic message)

**Estimated time:** 4 hours

---

### 2.2 `POST /api/webhooks/omniflow`
**Purpose:** Receive all inbound events from Omniflow (messages, delivery receipts, OTP replies).

**Flow:**
1. Validate webhook signature:
   - Extract `X-Omniflow-Signature` from headers.
   - Compute HMAC-SHA256 of raw request body using `OMNIFLOW_WEBHOOK_SECRET`.
   - Use `crypto.timingSafeEqual` for comparison.
   - If mismatch → return `401` immediately.

2. Parse payload. Expected Omniflow format:
   ```json
   {
     "phone": "9198XXXXXXXX",
     "message": "123456",
     "type": "text",
     "wamid": "wamid.XXX",
     "timestamp": "1713987600"
   }
   ```

3. Normalize phone to E.164 (strip non-digits, ensure `+` prefix).

4. Compute `phone_hash` = SHA-256(normalized_phone).

5. **Check if message is an OTP reply (phone linking):**
   - Query `otp_codes` table for `phone = normalized_phone`, `purpose = 'whatsapp_link'`, `expires_at > NOW()`.
   - If OTP matches and is valid:
     - Insert into `user_channel_bindings`:
       - `user_id` = user ID from the OTP record (look up via phone in `user_profiles`)
       - `phone` = normalized_phone
       - `whatsapp_opt_in` = `true`
     - Delete the OTP record.
     - Send confirmation via Omniflow: *"Your WhatsApp is now linked to your InTrust account."*
     - Log to `whatsapp_message_logs` (channel = `'whatsapp'`, direction = `'outbound'`).
     - Return `200`.
   - If OTP does not match, ignore or send: *"Invalid or expired OTP. Please try again from the website."*

6. **If not an OTP reply, treat as a regular chat message:**
   - Look up `user_channel_bindings` by `phone`.
   - If **no match**:
     - Send reply via Omniflow: *"Please link your WhatsApp first by visiting our website."*
     - Log inbound + outbound to `whatsapp_message_logs`.
     - Return `200`.
   - If **match found**:
     - Fetch financial context from Supabase using service role key:
       - `wallet_balance` from `wallets` table
       - `kyc_status` from `kyc_records` table
       - Last 3 transactions from `transactions` table
     - Build context string:
       ```
       User financial context:
       - Wallet balance: Rs.{balance}
       - KYC status: {status}
       - Last 3 transactions: {tx1}, {tx2}, {tx3}
       User message: {message}
       ```
     - Send context + user message to Omniflow AI endpoint.
     - Receive AI response.
     - **PII check on AI response:**
       - Regex for 12-digit Aadhaar: `\b\d{4}\s?\d{4}\s?\d{4}\b`
       - Regex for PAN: `\b[A-Z]{5}[0-9]{4}[A-Z]\b`
       - If either pattern found → replace entire response with:
         *"I can't share that information here. Please visit your profile page for secure details."*
     - **Intent enforcement (3 intents only):**
       - If user asks about wallet balance → return masked balance.
       - If user asks about KYC → return: *"Your KYC status is: {Verified|Pending|Rejected}."*
       - For any other topic → return:
         *"For further help, please visit intrustindia.com or contact our support team."*
       - The intent check runs before or after AI call (depending on whether Omniflow AI handles intent routing). If Omniflow AI returns an off-topic answer, override it with the fallback.
     - Send final reply via Omniflow `sendmessage` API.
     - Log inbound and outbound to `whatsapp_message_logs`.
     - Return `200`.

**Idempotency:**
- Check `whatsapp_message_logs` for existing `wamid` before processing. If found, return `200` immediately (duplicate webhook).

**Estimated time:** 8 hours

---

### 2.3 `POST /api/chat/message`
**Purpose:** Backend route for the Web Chatbot UI. Mirrors the WhatsApp webhook logic but for web users.

**Flow:**
1. Read JWT from the request session (Supabase auth cookie).
2. Validate JWT — extract `user.id`.
3. If no session → return `401`.
4. Read `message` from request body (max 500 chars).
5. Fetch financial context from Supabase (same queries as WhatsApp handler):
   - `wallet_balance`
   - `kyc_status`
   - Last 3 transactions
6. Build context string (same format as WhatsApp handler).
7. Send context + user message to Omniflow AI endpoint.
8. Receive AI response.
9. **PII check on AI response:**
   - Same Aadhaar and PAN regex as WhatsApp handler.
   - If match found → replace with:
     *"I can't share that information here. Please visit your profile page for secure details."*
10. **Intent enforcement (3 intents only):**
    - Wallet balance → masked balance
    - KYC status → `Verified`, `Pending`, or `Rejected` only
    - Anything else → fallback message
11. Log outbound message to `whatsapp_message_logs` with `channel = 'web'`.
12. Return `200` with JSON:
    ```json
    {
      "reply": "Hi Rahul, your wallet balance is Rs.4,500. Your KYC is Verified."
    }
    ```

**Estimated time:** 4 hours

---

### 2.4 `GET /api/whatsapp/status`
**Purpose:** Check if the current logged-in user has linked their WhatsApp.

**Flow:**
1. Read JWT from session.
2. Query `user_channel_bindings` by `user_id`.
3. Return `200`:
   ```json
   {
     "linked": true,
     "phone": "+9198XXXXXXXX",
     "linked_at": "2026-04-20T10:00:00Z"
   }
   ```
   or `linked: false`.

**Estimated time:** 1 hour

---

## 3. Frontend Components

### 3.1 `components/chat/ChatBubble.jsx`
**Purpose:** Floating chat bubble button fixed at bottom-right of the screen.

**Behavior:**
- Fixed position: `bottom-6 right-6` (Tailwind)
- Hidden on auth pages (`/login`, `/signup`). Use `usePathname()` from Next.js to check current route.
- Only renders if `isAuthenticated` is `true` (from `AuthContext`).
- Displays InTrust logo or chat icon (24×24px).
- Red dot badge for unread replies (CSS `after` pseudo-element, red circle, 10px).
- Click toggles chat window open/close.
- `z-index: 50` to stay above all content.

**State:**
- `isOpen` — boolean
- `hasUnread` — boolean (set to `true` when a new bot reply arrives while window is closed)

**Estimated time:** 3 hours

---

### 3.2 `components/chat/ChatWindow.jsx`
**Purpose:** The actual chat window panel.

**Layout:**
- Desktop: `w-[380px] h-[520px]`, rounded-2xl, shadow-2xl, white background
- Mobile (`< 640px`): `w-full h-[100dvh]`, fixed, full screen
- Position: `bottom-24 right-6` on desktop (above the bubble), `bottom-0 right-0` on mobile
- Slide-up animation: `translate-y-4 opacity-0` → `translate-y-0 opacity-100`, 200ms ease-out

**Header:**
- Left: InTrust logo (32×32px) + "InTrust Assistant" text
- Right: Close button (× icon)
- Height: 56px, border-b, primary brand color background

**Message Area:**
- Scrollable container (`flex-1 overflow-y-auto`)
- User messages: right-aligned, primary color background, white text, rounded-l-2xl rounded-tr-2xl
- Bot messages: left-aligned, gray-100 background, dark text, rounded-r-2xl rounded-tl-2xl
- Timestamps below each bubble: `11:45 AM`, 11px gray text
- Max message width: 80%
- Auto-scroll to bottom on new messages (`useRef` + `scrollIntoView`)

**Typing Indicator:**
- Three animated dots (CSS keyframes, bounce staggered)
- Shown while waiting for `/api/chat/message` response
- Bot avatar placeholder (circle, 28px) on the left

**Input Area:**
- Text input: single line, max 500 chars
- Send button: paper plane icon, disabled while empty or loading
- Height: 56px, border-t
- Enter key submits

**Welcome Message:**
- Auto-injected on first open (when message array is empty):
  > "Hi {firstName} 👋 I'm your InTrust Assistant. Ask me about your wallet balance, KYC status, or anything else!"
- `firstName` pulled from `profile?.full_name` (split on space, take first word) or "there".

**Conversation History:**
- Stored in component state only (`useState` array of message objects).
- No database persistence, no localStorage.
- Max 20 messages (FIFO — shift oldest when limit reached).
- Cleared on logout or browser close.

**Message object shape:**
```js
{
  id: string,        // crypto.randomUUID()
  sender: 'user' | 'bot',
  text: string,
  timestamp: Date,
  status: 'sent' | 'delivered' | 'error'
}
```

**PII Filtering on Display:**
- Before rendering any bot reply, run regex check:
  - Aadhaar: `/\b\d{4}\s?\d{4}\s?\d{4}\b/`
  - PAN: `/\b[A-Z]{5}[0-9]{4}[A-Z]\b/`
- If detected → replace displayed text with:
  > "I can't share that information here. Please visit your profile page for secure details."

**Estimated time:** 8 hours

---

### 3.3 `components/chat/ChatProvider.jsx`
**Purpose:** Lightweight context provider to share chat open/close state between bubble and window.

**Exports:**
- `isOpen`, `toggleChat()`, `closeChat()`, `openChat()`
- `hasUnread`, `setHasUnread(boolean)`

**Usage:**
- Wrap around `ChatBubble` and `ChatWindow` in `app/layout.js`.

**Estimated time:** 1 hour

---

### 3.4 `app/(customer)/profile/whatsapp/page.jsx`
**Purpose:** Profile settings page section for linking WhatsApp.

**Content:**
- Section title: "Connect WhatsApp"
- Current status:
  - If linked: "✅ WhatsApp connected to +9198XXXXXXXX (linked on 20 Apr 2026)"
  - If not linked: "❌ WhatsApp not connected"
- "Send OTP" button:
  - Calls `POST /api/whatsapp/link-phone`
  - Disabled while loading
  - On success: show "Check your WhatsApp for an OTP. Reply with the code to complete linking."
- Instructions text: "We'll send a one-time code to your registered phone number via WhatsApp."

**Data fetching:**
- Call `GET /api/whatsapp/status` on mount to show current linking status.

**Estimated time:** 3 hours

---

### 3.5 Root Layout Integration
**File:** `app/layout.js`

**Changes:**
- Import `ChatProvider`, `ChatBubble`, `ChatWindow`.
- Render `<ChatProvider>` inside `<AuthProvider>` (so `isAuthenticated` is available).
- Render `<ChatBubble />` and `<ChatWindow />` inside `<ChatProvider>`.
- Both components internally check `isAuthenticated` before rendering anything.

**Estimated time:** 30 minutes

---

## 4. Omniflow Integration Steps

### 4.1 Account Setup
1. Register at `https://whatsapp.ominiflow.com` using the business email.
2. Complete KYC verification inside Omniflow dashboard.
3. Connect Meta WABA to Omniflow:
   - In Omniflow → Settings → WhatsApp → Connect Meta Account.
   - Authorize with Meta Business Manager credentials.
   - Select the verified phone number.
4. Note down the Omniflow API token after login (`POST /api/login`).

### 4.2 Configure Webhook in Omniflow
1. In Omniflow dashboard → Webhooks → Add Endpoint.
2. URL: `https://intrustindia.com/api/webhooks/omniflow`
3. Method: `POST`
4. Secret: Generate a 32-char random string → save as `OMNIFLOW_WEBHOOK_SECRET`.
5. Events to subscribe:
   - `message_received` — inbound messages from users
   - `message_status` — delivery/read receipts (optional, for logging)
6. Save and verify — Omniflow will send a test ping. Ensure the route returns `200`.

### 4.3 Create WhatsApp Message Template
**Template name:** `intrust_otp_verification`
**Category:** `Authentication`
**Language:** `en`
**Body:**
```
Your InTrust verification code is: {{1}}.

This code will expire in 10 minutes. Do not share it with anyone.
```

**Steps:**
1. In Omniflow dashboard → Templates → Create New.
2. Fill in the above body with one variable `{{1}}`.
3. Submit to Meta for approval (typically 24–48 hours).
4. Once approved, note the exact template name for use in `/api/whatsapp/link-phone`.

### 4.4 API Token Management
- Store `OMNIFLOW_API_TOKEN` in environment variables.
- Token expiry: Check Omniflow docs. If tokens expire, implement a refresh logic in a utility function (e.g., `lib/omniflow.js`) that caches the token and refreshes before expiry.
- For now, manual rotation via `.env.local` is acceptable.

### 4.5 Outbound API Calls (Shared Utility)
Create `lib/omniflow.js` with helper functions:

**`sendWhatsAppMessage(phone, message)`**
- Calls `POST /api/wpbox/sendmessage`
- Body: `{ token, phone, message }`
- Returns `{ success, messageId }` or throws.

**`sendTemplateMessage(phone, templateName, language, components)`**
- Calls `POST /api/wpbox/sendtemplatemessage`
- Body: `{ token, phone, template_name, template_language, components }`

**`callOmniflowAI(contextString, userMessage)`**
- This depends on Omniflow's AI endpoint. If Omniflow exposes an AI chat endpoint, document it here.
- If not, use a direct OpenAI/Claude call with the context string as the system prompt.
- **Decision needed:** Confirm with Omniflow whether AI responses are generated internally or if we need to bring our own LLM.

**Estimated time:** 4 hours (account setup + template approval wait is external; coding is 4 hours)

---

## 5. Implementation Order

Build in this exact order. Each step depends on the previous one.

| Step | Task | Depends On | Why First |
|------|------|-----------|-----------|
| 1 | Add environment variables to `.env.local` and Vercel dashboard | — | Everything else needs these |
| 2 | Create `user_channel_bindings` and `whatsapp_message_logs` tables in Supabase | Step 1 | All routes need these tables |
| 3 | Create `lib/omniflow.js` utility (sendmessage, sendtemplatemessage) | Step 1 | Shared by multiple routes |
| 4 | Build `POST /api/whatsapp/link-phone` | Steps 2, 3 | OTP generation + template sending |
| 5 | Build `POST /api/webhooks/omniflow` (OTP verification + basic reply) | Steps 2, 3, 4 | Receives OTP replies and future chat messages |
| 6 | Build `POST /api/chat/message` | Steps 2, 3 | Web chat backend |
| 7 | Build `GET /api/whatsapp/status` | Step 2 | Profile page needs this |
| 8 | Build `components/chat/ChatProvider.jsx` | — | State sharing for chat components |
| 9 | Build `components/chat/ChatWindow.jsx` | Step 8 | Core UI |
| 10 | Build `components/chat/ChatBubble.jsx` | Steps 8, 9 | Trigger for chat window |
| 11 | Integrate chat components into `app/layout.js` | Steps 8–10 | Makes chat global |
| 12 | Build `app/(customer)/profile/whatsapp/page.jsx` | Steps 4, 7 | User-facing linking UI |
| 13 | Add PII filtering utility (`lib/piiFilter.js`) | — | Shared across web and WhatsApp |
| 14 | Wire PII filter into `/api/webhooks/omniflow` and `ChatWindow.jsx` | Step 13 | Security requirement |
| 15 | Add intent enforcement (3 intents) to both backend routes | — | Limits bot scope |
| 16 | Test end-to-end: link phone → send WhatsApp message → get reply | Steps 1–15 | Integration validation |
| 17 | Test web chat: open bubble → send message → get reply | Steps 1–15 | Integration validation |
| 18 | Code review + cleanup | Steps 1–17 | Polish before merge |

---

## 6. Estimated Time Per Section

Assumptions: single mid-level full-stack developer, familiar with the existing InTrust codebase, Supabase, and Next.js App Router.

| Section | Task | Hours |
|---------|------|-------|
| **Database** | Create `user_channel_bindings` table + RLS | 2 |
| **Database** | Create `whatsapp_message_logs` table + RLS + indexes | 2 |
| **Backend** | `POST /api/whatsapp/link-phone` | 4 |
| **Backend** | `POST /api/webhooks/omniflow` (OTP verify + chat handler) | 8 |
| **Backend** | `POST /api/chat/message` | 4 |
| **Backend** | `GET /api/whatsapp/status` | 1 |
| **Backend** | `lib/omniflow.js` utility | 3 |
| **Backend** | `lib/piiFilter.js` utility | 1 |
| **Frontend** | `ChatProvider.jsx` | 1 |
| **Frontend** | `ChatWindow.jsx` (UI + state + scrolling + typing) | 8 |
| **Frontend** | `ChatBubble.jsx` (bubble + unread dot + toggle) | 3 |
| **Frontend** | Integrate into `app/layout.js` | 0.5 |
| **Frontend** | Profile WhatsApp linking page | 3 |
| **Omniflow** | Account setup + webhook config + template creation | 4 |
| **Integration** | End-to-end testing (WhatsApp + Web) | 4 |
| **Buffer** | Debugging, edge cases, code review | 4 |
| **Total** | | **52.5 hours** |

**Breakdown by feature:**
- WhatsApp Chatbot (backend heavy): ~28 hours
- Web Chat UI (frontend heavy): ~16 hours
- Shared utilities + integration: ~8.5 hours

---

## 7. Shared Utility: PII Filter

**File:** `lib/piiFilter.js`

**Function:** `sanitizeMessage(text)`

**Logic:**
1. Check for Aadhaar pattern: `/\b\d{4}\s?\d{4}\s?\d{4}\b/g`
2. Check for PAN pattern: `/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g`
3. If either match found → return fallback string.
4. If no match → return original text.

**Usage:**
- Called in `/api/webhooks/omniflow` after receiving AI response, before sending to user.
- Called in `ChatWindow.jsx` before rendering any bot message.

**Fallback message:**
> "I can't share that information here. Please visit your profile page for secure details."

**Estimated time:** 1 hour (included in total above)

---

---

## 8. Shared Utility: Intent Enforcer

> ⚠️ **DEPRECATED for the Web Chat channel** — see Section 10 for the current web chat implementation.

The intent enforcer (`lib/intentEnforcer.js`) has been reduced to a no-op shim for the web channel. `enforceIntent()` now always returns `null` and the web chat route no longer calls it.

**The WhatsApp webhook (`/api/webhooks/omniflow`) is a separate pipeline and retains its own narrower intent scope.** This section remains authoritative for that channel.

Original intent enforcement logic (balance / KYC / fallback) has been replaced in the web channel by Gemini's system instruction + account context + knowledge base, which can handle all three of those queries — plus dozens more — without hard-coded keyword matching.

---

## 9. Notes & Decisions

### 9.1 Omniflow AI vs External LLM
- **If Omniflow provides an AI endpoint:** Use it. Pass the context string as a system prompt or pre-pended message.
- **If Omniflow does not provide AI:** Bring your own OpenAI/Claude API key. Call it directly from `/api/webhooks/omniflow` and `/api/chat/message`.
- **Decision needed before Step 6.**
- **Web channel decision (implemented):** Gemini Flash via `@google/genai` SDK is used directly for the web chat channel.

### 9.2 Phone Number Source
- The plan assumes `auth.users.phone` or `user_profiles.phone` exists and is verified.
- If phone is not stored on the user record, the "Connect WhatsApp" flow must first collect and verify the phone number.

### 9.3 WhatsApp 24-Hour Window
- Free-form messages (`sendmessage`) only work if the user has sent a message within the last 24 hours.
- Template messages (`sendtemplatemessage`) are required for outbound messages outside the window.
- The OTP template (`intrust_otp_verification`) handles the linking flow.
- Regular chat replies use `sendmessage` because users are actively messaging.

### 9.4 Out of Scope (Explicitly Skipped)
The following are **not** part of this plan and should not be built:
- Cross-channel state memory (Web ↔ WhatsApp handoff)
- Gift card or purchase flows in chat
- Human agent escalation
- Redis caching layer
- Load testing infrastructure
- Multi-role bot responses (merchant vs customer logic)
- File/image uploads in web chat
- Chat history persistence in database or localStorage
- Push notifications for new messages
- Real-time subscriptions for live chat updates

---

## 10. Web Chat (Gemini) — Implemented Scope

> This section supersedes Sections 2.3, 7, and 8 **for the web channel only**.
> WhatsApp sections remain authoritative for the WhatsApp pipeline.

### 10.1 Architecture

Omniflow does **not** provide a web chat AI. The web chat channel uses **Google Gemini** (`@google/genai` SDK) directly, with a curated account snapshot and a website knowledge base injected into the system instruction.

```
POST /api/chat/message
  ↓ auth check (Supabase cookie)
  ↓ buildUserContext() — parallel Supabase queries
  ↓ buildSystemInstruction(context + INTRUST_KNOWLEDGE_BASE)
  ↓ GoogleGenAI.chats.create({ systemInstruction, history }).sendMessage(message)
  ↓ maskPII(reply)               ← in-place masking, not whole-reply wipe
  ↓ whatsapp_message_logs insert (best-effort)
  → { reply, firstName }
```

### 10.2 Endpoint Contract

**`POST /api/chat/message`**

Request body:
```json
{
  "message": "string (max 1000 chars)",
  "history": [
    { "role": "user",  "text": "previous user turn" },
    { "role": "model", "text": "previous bot turn" }
  ]
}
```
- `history` is optional. Client sends last 8 turns. Server trims to 8 and validates shape.

Response:
```json
{
  "reply": "string",
  "firstName": "string"
}
```

### 10.3 Feature Surface (What the Bot Can Answer)

| Topic | Grounding | Page |
|---|---|---|
| Wallet balance | Live `customer_wallets.balance_paise` | /customer/wallet |
| KYC status | Live `user_profiles.kyc_status` | /customer/profile/kyc |
| Recent transactions | Last 5 from `customer_wallet_transactions` | /customer/transactions |
| Reward points | Live `reward_points.points_balance` | /customer/rewards |
| Active gift cards | Count + total from `customer_gift_cards` | /customer/my-giftcards |
| Recent orders | Last 3 from `customer_orders` | /customer/orders |
| Referral code | Live `user_profiles.referral_code` | /customer/refer |
| Store credits | Live `customer_store_credits.balance_paise` | /customer/store-credits |
| How gift cards work | Knowledge base | /customer/gift-cards |
| How to add money | Knowledge base | /customer/wallet |
| How rewards work | Knowledge base | /customer/rewards |
| How to refer a friend | Knowledge base | /customer/refer |
| NFC service overview | Knowledge base | /customer/nfc-service |
| Solar services overview | Knowledge base | /customer/solar |
| Shopping & orders | Knowledge base | /customer/shop, /customer/orders |
| KYC documents required | Knowledge base | /customer/profile/kyc |
| Merchant apply | Knowledge base | /customer/merchant-apply |
| Contact / support | Knowledge base | /contact |

### 10.4 PII Safety Policy

- **In-place masking** (`maskPII()`): detected Aadhaar/PAN substrings are masked in-place.
  - Aadhaar → `XXXX XXXX 1234` (last 4 digits visible).
  - PAN → `XXXXX1234X` (middle 4 digits visible).
- **Client-side defence-in-depth** (`sanitizeOnClient()` in `ChatWindow.jsx`): if PII slips through, the full message is replaced with the fallback string before display.
- **Account context** never includes raw Aadhaar or PAN numbers.
- **Knowledge base** never includes secrets, keys, or raw account numbers.

### 10.5 Explicitly Out of Scope (Web Chat)

- File/image uploads in chat
- Payments or cart actions initiated via chat
- Admin / merchant actions via chat
- Human agent escalation
- Persistent chat history (in-memory session only)

### 10.6 Required Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | — | Get from [aistudio.google.com](https://aistudio.google.com/app/apikey). Must be in `.env.local`. |
| `GEMINI_MODEL` | No | `gemini-flash-latest` | Swap to `gemini-2.0-flash` or `gemini-1.5-pro` without code changes. |

### 10.7 Files Changed

| File | Change |
|---|---|
| `app/api/chat/message/route.js` | Full rewrite — `@google/genai` SDK, multi-turn history, rich context |
| `lib/chat/knowledgeBase.js` | NEW — website feature encyclopedia |
| `lib/chat/promptTemplates.js` | NEW — system instruction builder + WELCOME_MESSAGE |
| `lib/chat/buildContext.js` | NEW — parallel account snapshot fetcher |
| `lib/piiFilter.js` | Upgraded — added `maskPII()`, tightened Aadhaar regex |
| `lib/intentEnforcer.js` | Gutted to no-op shim (deprecated for web) |
| `components/chat/hiddenPaths.js` | NEW — single source of truth for hidden paths |
| `components/chat/ChatBubble.jsx` | Uses shared `CHAT_HIDDEN_PATHS` |
| `components/chat/ChatWindow.jsx` | Sends history, 6 quick replies, 1000 char limit |
| `package.json` | `@google/generative-ai` → `@google/genai` |
| `.env.example` | Added `GEMINI_MODEL` optional var |

---

**End of Document**

