# Jai Bhajarang Mobiles — Customer Loyalty & Rewards Platform 📱🪔

A production-ready customer loyalty and retail rewards application purpose-built for **Jai Bhajarang Mobiles** (Karimnagar, Telangana).

---

## 🌟 Key Features

1. **Dual-Wallet Architecture**:
   - 💚 **Cashback Balance**: Earned on every purchase (default 3%), redeemable as an instant bill discount (up to 5%).
   - 🔗 **Referral Balance**: Earned when a referred customer signs up and makes their first purchase (₹200 bonus). Redeemable up to ₹100 per visit, up to `total_referrals * 2` visits total.
   - ⊘ **None**: Option to process bills without applying wallet discounts.
2. **Cashier Billing POS Terminal**:
   - Instant search by mobile number, name, or email.
   - Live calculations for Gross, Wallet Discount, Net Paid, and Cashback Earned.
   - **WhatsApp Receipt Generation**: One-click button to send pre-formatted receipts directly to the customer's WhatsApp (`wa.me`).
   - **Printable Slip Modal**: Clean, professional digital bill slip with shop details, invoice number, items, and Diwali greetings.
   - Item / Service notes (e.g. "iPhone 13 Display Replacement", "OnePlus 65W Fast Charger").
3. **Milestone Gifts & Spend Ranges**:
   - Rewards customers on specific visit counts (e.g., 5th visit, 10th visit, 20th visit).
   - Dynamic spend brackets (Bronze, Silver, Gold ranges) determining gift tier eligibility.
   - Full gift claim workflow: `eligible` → customer selects gift (`selected`) → admin hands over gift (`claimed`) with stock tracking.
4. **Customer Loyalty Hub**:
   - Digital Member Tier: Bronze, Silver, Gold, Platinum based on lifetime spend.
   - Tier progress bar showing spend required for the next upgrade.
   - Purchase history and transaction records.
   - Pending referral rewards tracker (locked bonuses awaiting referee first purchase).
   - Multi-language support: English, Telugu (తెలుగు), and Hindi (हिन्दी).
5. **🪔 Diwali Dhamaka Festive Promotions**:
   - Integrated Diwali festive banners on the home landing page and customer dashboard.
   - Ready for festive season marketing and customer onboarding.

---

## 🚀 Quick Start & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your Supabase credentials:
```bash
cp .env.example .env.local
```

### 3. Run Test Suite
22 comprehensive automated test cases validating billing calculations, referral limits, milestone logic, phone normalization, and shop settings:
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📦 Deployment (Vercel & Supabase)

1. **Database Setup**:
   - Link your Supabase project:
     ```bash
     npx supabase db push
     ```
   - All schema tables, functions, triggers, and views are located in `supabase/migrations/`.

2. **Deploy to Vercel**:
   - Push this repository to GitHub.
   - Import into [Vercel](https://vercel.com).
   - Add environment variables in Vercel Project Settings:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_APP_URL`
     - `RESEND_API_KEY` (Optional)
     - `EMAIL_FROM_DOMAIN` (Optional)
   - Click **Deploy**!
