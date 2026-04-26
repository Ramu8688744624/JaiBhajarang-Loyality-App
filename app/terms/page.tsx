// app/terms/page.tsx  ─ TERMS & CONDITIONS
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Loyalty Program Terms
// Server component (no auth required — public page)
// ══════════════════════════════════════════════════════════════

import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions — Jai Bajrang Mobiles Loyalty",
  description: "Loyalty rewards program terms, cashback & referral redemption policy for Jai Bajrang Mobiles, Karimnagar.",
};

// ─── Section component ───────────────────────────────────────

function Section({
  id, icon, title, children,
}: {
  id: string; icon: string; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: "rgba(212,168,67,0.15)" }}
        >
          {icon}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-3 pl-1">
        {children}
      </div>
    </section>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#D4A843", marginTop: "7px" }} />
      <span>{children}</span>
    </li>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-medium"
      style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#FDE68A" }}
    >
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function TermsPage() {
  const sections = [
    "program-overview",
    "joining-bonus",
    "cashback",
    "referral",
    "redemption-limits",
    "wallet-expiry",
    "general",
  ];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0A0F1E",
        color: "#E2E8F0",
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 border-b border-[#1E2D4A] bg-[#0A0F1E]/96 backdrop-blur-md"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
              style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
            >
              📱
            </div>
            <span className="text-sm font-bold" style={{ color: "#D4A843" }}>
              Jai Bajrang Mobiles
            </span>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-[#D4A843] transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="py-12 sm:py-16 px-4 text-center"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(27,58,107,0.55) 0%, transparent 70%),
            #0A0F1E
          `,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#D4A843" }}
          >
            Loyalty Program
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Terms & Conditions
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Jai Bajrang Mobiles, Karimnagar, Telangana
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Last updated: December 2024 · Effective immediately
          </p>
        </div>
      </div>

      {/* ── Quick nav (desktop) ──────────────────────────────── */}
      <div className="hidden lg:block sticky top-14 z-30 border-b border-[#1E2D4A] bg-[#0A0F1E]/94 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center gap-1 overflow-x-auto">
          {[
            ["#program-overview",  "Overview"],
            ["#joining-bonus",     "Joining Bonus"],
            ["#cashback",          "Cashback"],
            ["#referral",          "Referral"],
            ["#redemption-limits", "Redemption Limits"],
            ["#wallet-expiry",     "Expiry"],
            ["#general",           "General"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-[#D4A843] hover:bg-[#D4A843]/6 transition-all whitespace-nowrap"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">

        {/* 1 · Program Overview */}
        <Section id="program-overview" icon="📋" title="1. Program Overview">
          <p>
            The Jai Bajrang Mobiles Loyalty Program ("Program") is operated by Jai Bajrang Mobiles,
            Karimnagar, Telangana. By registering an account and participating in the Program, you
            agree to these Terms & Conditions in full.
          </p>
          <p>
            The Program offers two separate reward types — <strong className="text-white">Cashback</strong> and{" "}
            <strong className="text-white">Referral Rewards</strong> — each governed by distinct rules.
            These balances are maintained in separate wallets and cannot be combined in a single transaction.
          </p>
        </Section>

        {/* 2 · Joining Bonus */}
        <Section id="joining-bonus" icon="🎁" title="2. Joining Bonus">
          <ul className="space-y-2">
            <Rule>A one-time Joining Bonus (currently ₹500) is credited to your <strong className="text-white">Cashback Wallet</strong> upon successful account registration.</Rule>
            <Rule>The Joining Bonus amount is set by the shop management and may change without prior notice.</Rule>
            <Rule>The Joining Bonus is subject to the same redemption limits and expiry rules as all other cashback rewards.</Rule>
            <Rule>The Joining Bonus cannot be transferred to another account.</Rule>
          </ul>
        </Section>

        {/* 3 · Cashback */}
        <Section id="cashback" icon="💚" title="3. Cashback Rewards">
          <p>Cashback is earned as a percentage of the net bill amount (amount paid after any wallet discount).</p>
          <ul className="space-y-2">
            <Rule>The cashback percentage is set globally by shop management (currently 3% of net payment).</Rule>
            <Rule>Cashback is credited to your <strong className="text-white">Cashback Wallet</strong> immediately after each successful transaction.</Rule>
            <Rule>Cashback cannot be redeemed for cash. It may only be used as a discount on future purchases at Jai Bajrang Mobiles.</Rule>
            <Rule>Cashback is not earned on the discounted portion of a bill (i.e., cashback is calculated on what you actually pay, not the original amount).</Rule>
          </ul>
        </Section>

        {/* 4 · Referral */}
        <Section id="referral" icon="🔗" title="4. Referral Rewards">
          <p>
            When you refer a new customer and they complete their <strong className="text-white">first purchase</strong>,
            you earn a Referral Bonus credited to your <strong className="text-white">Referral Wallet</strong>.
          </p>
          <ul className="space-y-2 mt-2">
            <Rule>The Referral Bonus is currently ₹200 per successful referral (subject to change).</Rule>
            <Rule>The bonus is credited <em>only after the referred person's first purchase</em> — registration alone does not trigger the reward.</Rule>
            <Rule>Self-referrals (referring yourself or using your own code during your own registration) are prohibited and will result in cancellation of the bonus.</Rule>
            <Rule>Each person may only be referred once. The referral code used at registration is permanent and cannot be changed.</Rule>
            <Rule>Referral Rewards are credited to a <strong className="text-white">separate Referral Wallet</strong> and cannot be transferred to the Cashback Wallet.</Rule>
          </ul>
        </Section>

        {/* 5 · Redemption Limits — THE CRITICAL SECTION */}
        <Section id="redemption-limits" icon="⚖️" title="5. Redemption Limits & Rules">
          <Highlight>
            ⚠ Important: Rewards cannot be redeemed at 100% in a single transaction. Read this section carefully.
          </Highlight>

          <div className="mt-4 space-y-5">
            <div>
              <h3 className="text-white font-bold mb-2">5.1 Maximum Discount Per Bill</h3>
              <p>
                The maximum wallet discount applied in any single transaction is capped at{" "}
                <strong className="text-white">the redemption percentage of the gross bill value</strong>,
                not the total wallet balance.
              </p>
              <div
                className="mt-3 rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(30,45,74,0.6)", border: "1px solid #1E2D4A" }}
              >
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Example</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-slate-400">Bill Amount</span><span className="text-slate-200 font-medium">₹2,000</span>
                  <span className="text-slate-400">Cashback Wallet Balance</span><span className="text-slate-200 font-medium">₹3,000</span>
                  <span className="text-slate-400">Redemption Rate</span><span className="text-slate-200 font-medium">10% of bill</span>
                  <span className="text-slate-400">Max Discount Applied</span><span className="text-green-400 font-bold">₹200 (10% of ₹2,000)</span>
                  <span className="text-slate-400">You Pay</span><span className="text-white font-bold">₹1,800</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  ✓ Despite having ₹3,000 in wallet, only ₹200 (10% of bill) is applied as discount.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">5.2 Cashback vs. Referral — One at a Time</h3>
              <ul className="space-y-2">
                <Rule>In any single transaction, you may choose to use <em>either</em> your Cashback Wallet <em>or</em> your Referral Wallet as a discount — <strong className="text-white">not both simultaneously</strong>.</Rule>
                <Rule>The choice is made at the billing terminal by the shop staff on your behalf.</Rule>
                <Rule>Unused balance of the unchosen wallet remains intact for future transactions.</Rule>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">5.3 Referral Per-Visit Limit</h3>
              <p>
                To prevent large single-transaction redemptions, a maximum Referral discount per visit
                may be set by management (e.g., ₹100 per visit even if your Referral Wallet has ₹500).
                The current limit is displayed in the billing terminal.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">5.4 Redemption Rate</h3>
              <p>
                The default redemption rate (percentage of bill eligible for wallet discount) is set
                by shop management and displayed at the billing terminal. The admin may adjust the
                rate for individual transactions within permitted bounds.
              </p>
            </div>
          </div>
        </Section>

        {/* 6 · Wallet Expiry */}
        <Section id="wallet-expiry" icon="⏰" title="6. Wallet Balance Expiry">
          <p>All wallet balances (Cashback and Referral) are subject to an expiry policy.</p>
          <ul className="space-y-2 mt-2">
            <Rule>Wallet balances expire after <strong className="text-white">365 days</strong> (configurable by management) from the date of your last purchase.</Rule>
            <Rule>Any new purchase resets the expiry clock for your <em>entire</em> wallet balance — both Cashback and Referral.</Rule>
            <Rule>Expired balances are permanently forfeited and cannot be reinstated.</Rule>
            <Rule>You will see an expiry warning in your Dashboard when your balance is within 30 days of expiry.</Rule>
            <Rule>The expiry period may be changed by management with 30 days' notice displayed in the app.</Rule>
          </ul>
        </Section>

        {/* 7 · General */}
        <Section id="general" icon="📌" title="7. General Terms">
          <ul className="space-y-2">
            <Rule>The Program is available only to registered customers of Jai Bajrang Mobiles, Karimnagar.</Rule>
            <Rule>Jai Bajrang Mobiles reserves the right to modify, suspend, or terminate the Program, or any of its benefits, at any time with reasonable notice.</Rule>
            <Rule>Rewards have no cash value and cannot be exchanged for money.</Rule>
            <Rule>In case of suspected fraud, abuse, or violation of these terms, the shop reserves the right to cancel the account and forfeit any accumulated rewards without notice.</Rule>
            <Rule>These terms are governed by the laws of the State of Telangana, India.</Rule>
            <Rule>For queries, contact the shop directly at the Karimnagar store.</Rule>
          </ul>
        </Section>

        {/* CTA */}
        <div
          className="rounded-2xl p-7 text-center"
          style={{ background: "rgba(27,58,107,0.25)", border: "1px solid #1E2D4A" }}
        >
          <p className="text-xl font-black mb-2" style={{ color: "#D4A843" }}>Jai Bajrang Mobiles</p>
          <p className="text-slate-400 text-sm mb-5">Karimnagar, Telangana · Open 10 AM – 9 PM</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
            >
              🎁 Join the Program
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#1E2D4A] text-slate-400 hover:text-[#D4A843] hover:border-[#D4A843]/40 transition-all"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2D4A] py-6 px-4 text-center mt-4">
        <p className="text-xs text-slate-600">
          © 2024 Jai Bajrang Mobiles, Karimnagar. These terms were last updated December 2024.
        </p>
      </footer>
    </div>
  );
}
