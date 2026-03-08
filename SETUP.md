# 🚀 INTRUST Platform - Setup Guide

## 📦 What We've Built (Phase 1)

### ✅ Completed Features:
1. **Premium Mobile-First Homepage**
   - Glassmorphism navbar with auth integration
   - Animated search bar with glow effects
   - Auto-playing carousel (4 slides)
   - Prelink button grid (8 services)
   - Premium color palette (#171A21, #617073, #7A93AC, #92BCEA, #AFB3F7)

2. **Authentication System**
   - OTP-based login (phone number)
   - Supabase Auth integration
   - Auth Context with role-based access
   - Protected routes ready

3. **Design System**
   - Inter font (UI)
   - Outfit font (headings)
   - CSS animations (fadeIn, slideUp, glow, shimmer, float)
   - Glassmorphism utilities
   - Touch-friendly mobile interactions

---

## 🛠️ Initial Setup Steps

### 1. Create Supabase Project
```bash
# Go to https://supabase.com
# Create a new project (select India region for data residency)
# Note down your Project URL and Anon Key
```

### 2. Configure Environment Variables
```bash
# Copy the example env file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SprintVerify API Configuration (for automated KYC)
SPRINT_VERIFY_BASE_URL=https://uat.paysprint.in/sprintverify-uat/api/v1
SPRINT_VERIFY_JWT_KEY=your-jwt-token-from-sprintverify
SPRINT_VERIFY_AUTHORIZED_KEY=your-authorized-key-from-sprintverify
SPRINT_VERIFY_PARTNER_ID=your-partner-id-from-sprintverify

# NOTE: For PRODUCTION, ensure SPRINT_VERIFY_BASE_URL is set to https://api.paysprint.in/api/v1
# and all keys are production-level credentials.
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

### 3. Set Up Database Schema
```bash
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents from supabase-schema.sql
# 3. Run the SQL script
# 4. Verify tables are created in Table Editor
```

### 4. Enable Supabase Auth (Phone)
```bash
# In Supabase Dashboard:
# 1. Go to Authentication → Providers
# 2. Enable Phone provider
# 3. Configure SMS provider (Twilio/MessageBird/etc.)
#    OR use Supabase's built-in SMS for testing
# 4. Add your callback URL: http://localhost:3000/auth/callback
```

### 4b. Enable Identity Linking
```bash
# Important for Google linking from Profile:
# 1. Go to Authentication → Providers → Advanced
# 2. Ensure "Allow linking identities" is toggled ON
# Otherwise linkIdentity() in the profile page will fail.
```

### 5. Configure SprintVerify API (Automated KYC)
```bash
# 1. Contact SprintVerify to get API credentials
# 2. Get JWT Token and Authorized Key for PAN verification
# 3. Update environment variables with your credentials
# 4. Test API connectivity using the test script:
npm run test:sprint-verify

# The KYC system will now automatically:
# - Verify PAN numbers via SprintVerify API
# - Approve KYC if PAN is valid
# - Reject KYC if PAN is invalid
# - Retry failed API calls up to 3 times
```

### 6. Set Up Database Schema
```bash
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Run core database scripts in order:
#    - kyc_schema_migration.sql
#    - kyc_rls_policies.sql
#    - sprint_verify_final.sql
# 3. Run merchant feature scripts:
#    - update_merchant_purchase_rpc.sql (CRITICAL: Required for merchant checkout)
# 4. Verify tables and functions are created in Dashboard.
```

### 7. Start Development Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🎯 Testing the App

### Homepage (`http://localhost:3000`)
- ✅ See gradient background
- ✅ Glassmorphism navbar
- ✅ "Your Digital Services Hub" hero text
- ✅ Search bar with glow on focus
- ✅ Auto-playing carousel
- ✅ 8 service cards (only Gift Cards & More enabled)

### Login Page (`http://localhost:3000/login`)
- ✅ Enter 10-digit phone number
- ✅ Click "Continue" → OTP sent
- ✅ Enter 6-digit OTP
- ✅ Verify & Login → Redirects to dashboard

### KYC Verification (`http://localhost:3000/profile/kyc`)
- ✅ Fill out KYC form with PAN number
- ✅ Submit → Automatically verified via SprintVerify
- ✅ Check status: "Verified (Auto)" or "Rejected (API)"
- ✅ Admin panel shows read-only KYC details

### Admin Panel (`http://localhost:3000/admin/users`)
- ✅ View all users and their KYC status
- ✅ Click "View KYC Details" to see verification info
- ✅ No manual approval required - fully automated

---

## 🏗️ Project Structure

```
intrust-platform/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.jsx          # OTP login page
│   ├── layout.js                  # Root layout with AuthProvider
│   ├── page.js                    # Homepage
│   └── globals.css                # Premium CSS with animations
├── components/
│   ├── layout/
│   │   └── Navbar.jsx             # Glassmorphism navbar
│   └── ui/
│       ├── SearchBar.jsx          # Animated search
│       ├── PremiumCarousel.jsx    # Auto-play carousel
│       └── PrelinkGrid.jsx        # Service buttons grid
├── lib/
│   ├── contexts/
│   │   └── AuthContext.jsx        # Auth state management
│   ├── constants/
│   │   └── colors.js              # Brand colors
│   └── supabase.js                # Supabase client
├── supabase-schema.sql            # Database schema
└── .env.example                   # Environment template
```

---

## 🎨 Design Tokens

### Colors
```javascript
Primary: #7A93AC (Steel Blue)
Secondary: #AFB3F7 (Lavender)
Accent: #92BCEA (Sky Blue)
Dark: #171A21 (Dark Navy)
Muted: #617073 (Slate)
```

### Typography
```
Headings: Outfit (font-outfit)
Body: Inter (font-inter)
```

### Animations
```css
.animate-fadeIn      /* Smooth fade in */
.animate-slideUp     /* Slide up from bottom */
.animate-slideDown   /* Slide down from top */
.animate-glow        /* Pulsing glow effect */
.animate-float       /* Floating animation */
.glass               /* Glassmorphism light */
.glass-dark          /* Glassmorphism dark */
```

---

## 📱 Responsive Breakpoints

```
Mobile:  375px - 767px  (2-column grid)
Tablet:  768px - 1023px (3-column grid)
Desktop: 1024px+        (4-column grid)
```

---

## 🔐 Authentication Flow

```
1. User enters phone number → +91XXXXXXXXXX
2. Supabase sends OTP via SMS
3. User enters 6-digit code
4. Supabase verifies OTP
5. User profile created/fetched from 'users' table
6. Redirect to dashboard based on role:
   - customer → /dashboard
   - merchant → /merchant/dashboard
   - admin → /admin/dashboard
```

---

## 🚀 Next Steps

### Phase 2: Gift Card Marketplace
- [ ] Gift card listing page
- [ ] Merchant application form
- [ ] Admin approval dashboard
- [ ] Coupon purchase flow
- [ ] Payment integration (Razorpay)

### Phase 3: Core Features
- [ ] Loan facilitation module
- [ ] Payments & recharges
- [ ] Multi-vendor eCommerce
- [ ] Customer/Merchant dashboards

---

## 🐛 Troubleshooting

### Issue: "Supabase client error"
**Solution**: Check if `.env.local` has correct credentials

### Issue: "OTP not received"
**Solution**: 
1. Check Supabase Auth → Logs
2. Verify SMS provider is configured
3. Use test OTP in development (check Supabase docs)

### Issue: "Fonts not loading"
**Solution**: Fonts are loaded from Google Fonts CDN, check internet connection

### Issue: "Navbar not sticky"
**Solution**: Ensure no conflicting CSS, check `position: fixed` in DevTools

---

## 📞 Support

For issues or questions:
1. Check Supabase Dashboard → Logs
2. Open browser DevTools → Console
3. Review `supabase-schema.sql` for database structure

---

**Built with ❤️ using Next.js 16, Tailwind CSS 4, Supabase, and Framer Motion**
