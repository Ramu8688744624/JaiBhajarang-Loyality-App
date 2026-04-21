"use client";
// app/dashboard/DashboardClient.tsx  ─ v4 FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Customer Dashboard
// New: dual wallet display, pending referral dashlet,
//      copy CODE only (not URL), expiry warning
// ══════════════════════════════════════════════════════════════

import { useState } from "react";

const TIERS = [
  { label: "Bronze",   min: 0,     max: 4999,   color: "#CD7F32", icon: "🥉" },
  { label: "Silver",   min: 5000,  max: 14999,  color: "#C0C0C0", icon: "🥈" },
  { label: "Gold",     min: 15000, max: 49999,  color: "#FFD700", icon: "🥇" },
  { label: "Platinum", min: 50000, max: Infinity, color: "#E5E4E2", icon: "💎" },
] as const;

function getTier(spent: number) {
  return TIERS.find((t) => spent >= t.min && spent <= t.max) ?? TIERS[0];
}
function getNextTier(spent: number) {
  const i = TIERS.findIndex((t) => spent >= t.min && spent <= t.max);
  return i < TIERS.length - 1 ? TIERS[i + 1] : null;
}

interface Props {
  settings:       any;
  profile:        any;
  bills:          any[];
  milestones:     any[];
  giftTiers:      any[];
  userMilestones: any[];
  pendingReferrals?: any[];  // referees whose first purchase is pending
}

export default function DashboardClient({
  settings, profile, bills, milestones, giftTiers, userMilestones,
  pendingReferrals = [],
}: Props) {
  const [tab,          setTab]          = useState<"overview"|"history"|"gifts"|"referral">("overview");
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [codeCopied,   setCodeCopied]   = useState(false);
  const [linkCopied,   setLinkCopied]   = useState(false);

  const sym             = String(settings?.currency_symbol ?? "₹");
  const cashbackBal     = Number(profile?.cashback_balance  ?? profile?.wallet_balance ?? 0);
  const referralBal     = Number(profile?.referral_balance  ?? 0);
  const totalWallet     = cashbackBal + referralBal;
  const totalSpent      = Number(profile?.total_spent      ?? 0);
  const visitCount      = Number(profile?.visit_count      ?? 0);
  const displayName     = String(profile?.full_name ?? profile?.username ?? profile?.email ?? "Customer");
  const referralCode    = profile?.referral_code   ?? null;
  const expiresAt       = profile?.wallet_expires_at ?? null;
  const referralBonus   = Number(settings?.referral_bonus ?? 200);

  const referralLink = referralCode
    ? (typeof window !== "undefined" ? `${window.location.origin}/register?ref=${referralCode}` : `/register?ref=${referralCode}`)
    : null;

  // Days until expiry
  let daysUntilExpiry: number | null = null;
  if (expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    daysUntilExpiry = Math.max(0, Math.ceil(diff / 86400000));
  }

  const tier      = getTier(totalSpent);
  const nextTier  = getNextTier(totalSpent);
  const tierPct   = nextTier
    ? Math.min(100, ((totalSpent - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  const unlockedIds          = new Set((userMilestones ?? []).map((um: any) => um.milestone_id));
  const unredeemedMilestones = (userMilestones ?? []).filter((um: any) => !um.redeemed);
  const nextMilestone        = (milestones ?? []).find((m: any) => m.visit_count > visitCount);
  const eligibleTier         = [...(giftTiers ?? [])].reverse()
    .find((t: any) => totalSpent >= Number(t.min_spend ?? 0));

  const copyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode); // ONLY the code
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading your wallet…</p>
          <p className="text-slate-600 text-xs mt-1">Try refreshing if this persists.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview",  icon: "🏠" },
    { id: "history",  label: "History",   icon: "📋" },
    { id: "gifts",    label: "Gifts",     icon: unredeemedMilestones.length > 0 ? "🎁🔔" : "🎁" },
    { id: "referral", label: "Refer",     icon: "🔗" },
  ];

  return (
    <div className="min-h-screen pb-24">

      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-5"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.65),rgba(10,15,30,0.5))" }}>
        <div className="max-w-2xl mx-auto">
          {/* Expiry warning */}
          {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <span className="text-yellow-400">⚠</span>
              <span className="text-yellow-300">
                Your wallet expires in <strong>{daysUntilExpiry} days</strong>. Make a purchase to reset expiry!
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-slate-400 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">{displayName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span>{tier.icon}</span>
                <span className="text-sm font-semibold" style={{ color: tier.color }}>{tier.label} Member</span>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500">{visitCount} visits</span>
              </div>
            </div>

            {/* Dual wallet */}
            <div className="text-right flex-shrink-0 space-y-1">
              <div>
                <p className="text-xs text-slate-500">Cashback</p>
                <p className="text-xl font-black" style={{ color: "#22C55E" }}>{sym}{cashbackBal.toFixed(2)}</p>
              </div>
              {referralBal > 0 && (
                <div>
                  <p className="text-xs text-slate-500">Referral</p>
                  <p className="text-xl font-black" style={{ color: "#A78BFA" }}>{sym}{referralBal.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tier bar */}
          {nextTier && (
            <div className="mt-4 bg-[#0A0F1E]/60 border border-[#1E2D4A] rounded-xl p-3">
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color: tier.color }}>{tier.label}</span>
                <span style={{ color: nextTier.color }}>{nextTier.label} — {sym}{nextTier.min.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-2 bg-[#1E2D4A] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${tierPct}%`, background: `linear-gradient(90deg,${tier.color}88,${nextTier.color})` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {sym}{Math.max(0, nextTier.min - totalSpent).toLocaleString("en-IN")} more to reach {nextTier.label}
              </p>
            </div>
          )}
          {!nextTier && (
            <div className="mt-3 rounded-xl p-3 text-center"
              style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)" }}>
              <p className="text-sm font-bold" style={{ color: "#D4A843" }}>💎 Platinum — Highest Tier!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-[#0A0F1E] border-b border-[#1E2D4A]">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all border-b-2 ${
                tab === t.id ? "text-[#D4A843] border-[#D4A843]" : "text-slate-500 border-transparent hover:text-slate-300"
              }`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ────────────── OVERVIEW ──────────────────────────── */}
        {tab === "overview" && (
          <>
            {/* Wallet cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-1">💚 Cashback Balance</p>
                <p className="text-2xl font-black" style={{ color: "#22C55E" }}>{sym}{cashbackBal.toFixed(2)}</p>
                <p className="text-xs text-slate-600 mt-1">Earned from purchases</p>
              </div>
              <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-1">🔗 Referral Balance</p>
                <p className="text-2xl font-black" style={{ color: "#A78BFA" }}>{sym}{referralBal.toFixed(2)}</p>
                <p className="text-xs text-slate-600 mt-1">Earned from referrals</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-1">💰 Total Spent</p>
                <p className="text-2xl font-black" style={{ color: "#D4A843" }}>{sym}{totalSpent.toFixed(0)}</p>
              </div>
              <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-1">🏪 Visits</p>
                <p className="text-2xl font-black text-blue-400">{visitCount}</p>
                <p className="text-xs text-slate-600 mt-1">{nextMilestone ? `${nextMilestone.visit_count - visitCount} to next milestone` : "All done!"}</p>
              </div>
            </div>

            {/* ── PENDING REFERRAL DASHLET ────────────────── */}
            {pendingReferrals.length > 0 && (
              <div className="bg-[#0F1729] border border-[#A78BFA]/25 rounded-2xl p-5">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
                  🔗 Pending Referral Rewards
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Once your referred friends make their first purchase, you earn {sym}{referralBonus} per friend!
                </p>
                <div className="space-y-2">
                  {pendingReferrals.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-2.5 px-3 bg-[#0A0F1E] rounded-xl border border-[#1E2D4A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: "rgba(167,139,250,0.18)", color: "#A78BFA" }}>
                          {(r.full_name ?? r.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{r.full_name ?? r.username}</p>
                          <p className="text-xs text-slate-600">Registered · awaiting first purchase</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
                        🔒 {sym}{referralBonus} Locked
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestone progress */}
            {milestones.length > 0 && (
              <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
                <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-4">Visit Milestones</p>
                <div className="space-y-4">
                  {milestones.slice(0, 5).map((m: any) => {
                    const unlocked = unlockedIds.has(m.id);
                    const pct = Math.min(100, (visitCount / Number(m.visit_count)) * 100);
                    return (
                      <div key={m.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${unlocked ? "text-[#D4A843]" : "text-slate-600"}`}>{unlocked ? "✓" : "○"}</span>
                            <span className={`text-sm font-medium ${unlocked ? "text-slate-200" : "text-slate-500"}`}>{m.label}</span>
                          </div>
                          <span className="text-xs text-slate-500">{m.visit_count} visits</span>
                        </div>
                        <div className="h-1.5 bg-[#1E2D4A] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: unlocked ? "linear-gradient(90deg,#D4A843,#F5D078)" : "linear-gradient(90deg,#2563EB88,#2563EB)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eligible gifts preview */}
            {eligibleTier && (
              <div className="bg-[#0F1729] rounded-2xl p-5" style={{ border: "1px solid rgba(212,168,67,0.18)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider">Eligible Gifts</p>
                  <button onClick={() => setTab("gifts")} className="text-xs text-blue-400 hover:text-blue-300">View all →</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(eligibleTier.gift_inventory ?? []).slice(0, 4).map((item: any) => (
                    <div key={item.id} className="bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl p-3">
                      <p className="text-sm font-medium text-slate-200">{item.name}</p>
                      {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ────────────── HISTORY ───────────────────────────── */}
        {tab === "history" && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Transactions</p>
            {bills.length === 0 && (
              <div className="text-center py-16"><p className="text-4xl mb-3">🧾</p><p className="text-slate-500 text-sm">No transactions yet</p></div>
            )}
            {bills.map((b: any) => (
              <div key={b.id} className="bg-[#0F1729] border border-[#1E2D4A] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">Purchase</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN", { day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
                    </p>
                    {b.wallet_source && b.wallet_source !== "none" && (
                      <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full"
                        style={b.wallet_source === "referral"
                          ? { background: "rgba(167,139,250,0.15)", color: "#A78BFA" }
                          : { background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                        {b.wallet_source === "referral" ? "🔗 Referral discount" : "💚 Cashback discount"}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {Number(b.redemption_amount) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800/40">
                          − {sym}{Number(b.redemption_amount).toFixed(2)} discount
                        </span>
                      )}
                      {Number(b.cashback_earned) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-800/40">
                          + {sym}{Number(b.cashback_earned).toFixed(2)} cashback
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-white">{sym}{Number(b.net_amount).toFixed(2)}</p>
                    <p className="text-xs text-slate-600 capitalize">{b.payment_method}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ────────────── GIFTS ─────────────────────────────── */}
        {tab === "gifts" && (
          <div className="space-y-5">
            {unredeemedMilestones.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">🎉 Ready to Redeem</p>
                {unredeemedMilestones.map((um: any) => (
                  <div key={um.id} className="rounded-xl p-4 mb-3"
                    style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.28)" }}>
                    <p className="text-sm font-bold" style={{ color: "#D4A843" }}>{um.milestones?.label}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {um.milestones?.reward_type === "wallet_credit"
                        ? `${sym}${um.milestones?.reward_value} credited to your wallet`
                        : "Visit the shop to choose your free gift!"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Gift Catalog by Tier</p>
              {(giftTiers ?? []).map((t: any) => {
                const cfg = TIERS.find((x) => x.label === t.label);
                const color = cfg?.color ?? "#D4A843";
                const eligible = totalSpent >= Number(t.min_spend ?? 0);
                return (
                  <div key={t.id} className={`bg-[#0F1729] border rounded-2xl overflow-hidden mb-3 ${!eligible ? "opacity-50" : "border-[#1E2D4A]"}`}>
                    <button onClick={() => setExpandedTier(expandedTier === t.id ? null : t.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left">
                      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                      <span className="font-bold text-sm flex-1" style={{ color }}>{t.label}</span>
                      <span className="text-xs text-slate-500">Spend {sym}{Number(t.min_spend).toLocaleString("en-IN")}+</span>
                      {eligible ? <span className="text-xs font-bold text-green-400">✓</span> : <span className="text-xs text-slate-600">🔒</span>}
                      <span className="text-slate-600 ml-1">{expandedTier === t.id ? "▲" : "▼"}</span>
                    </button>
                    {expandedTier === t.id && (
                      <div className="border-t border-[#1E2D4A] p-4">
                        {(t.gift_inventory ?? []).length === 0
                          ? <p className="text-xs text-slate-600 text-center py-3">No items yet</p>
                          : <div className="grid grid-cols-2 gap-2">{(t.gift_inventory ?? []).map((item: any) => (
                              <div key={item.id} className="bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl p-3">
                                <p className="text-sm font-medium text-slate-200">{item.name}</p>
                                {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                                <p className={`text-xs mt-2 ${item.stock > 0 ? "text-green-400" : "text-red-400"}`}>{item.stock > 0 ? `${item.stock} left` : "Out of stock"}</p>
                              </div>))}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ────────────── REFERRAL ──────────────────────────── */}
        {tab === "referral" && (
          <div className="space-y-5">
            <div className="bg-[#0F1729] rounded-2xl p-6 text-center" style={{ border: "1px solid rgba(212,168,67,0.22)" }}>
              <p className="text-4xl mb-3">🔗</p>
              <h2 className="text-lg font-bold text-white mb-2">Your Referral Code</h2>
              <p className="text-slate-400 text-sm mb-5">Share this code. When your friend makes their first purchase, you earn {sym}{referralBonus}!</p>
              {referralCode ? (
                <>
                  {/* Code display */}
                  <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl mb-4"
                    style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)" }}>
                    <span className="text-2xl font-black tracking-widest" style={{ color: "#D4A843" }}>{referralCode}</span>
                  </div>
                  {/* Two distinct copy buttons */}
                  <div className="flex gap-2 justify-center flex-wrap">
                    <button onClick={copyCode}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A0F1E] transition-all active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
                      {codeCopied ? "✓ Code Copied!" : "📋 Copy Code"}
                    </button>
                    <button onClick={copyLink}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#1E2D4A] text-slate-300 hover:text-[#D4A843] hover:border-[#D4A843]/40 transition-all">
                      {linkCopied ? "✓ Link Copied!" : "🔗 Copy Link"}
                    </button>
                  </div>
                  {referralLink && (
                    <p className="text-xs text-slate-600 mt-4 break-all px-2">{referralLink}</p>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-sm">Referral code being generated. Refresh in a moment.</p>
              )}
            </div>

            {/* Pending referrals */}
            {pendingReferrals.length > 0 && (
              <div className="bg-[#0F1729] border border-[#A78BFA]/25 rounded-2xl p-5">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
                  🔒 Pending Rewards ({pendingReferrals.length})
                </p>
                <p className="text-xs text-slate-500 mb-3">These friends registered but haven't made their first purchase yet.</p>
                <div className="space-y-2">
                  {pendingReferrals.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between py-2.5 px-3 bg-[#0A0F1E] rounded-xl border border-[#1E2D4A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: "rgba(167,139,250,0.18)", color: "#A78BFA" }}>
                          {(r.full_name ?? r.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{r.full_name ?? r.username}</p>
                          <p className="text-xs text-slate-600">{r.email ?? r.phone ?? "Registered"}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
                        🔒 {sym}{referralBonus} Locked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-4">How It Works</p>
              <div className="space-y-3">
                {[
                  "Share your code or link with a friend",
                  "Friend registers using your code",
                  "Friend makes their FIRST purchase at the shop",
                  `You receive ${sym}${referralBonus} in your Referral wallet! 🎉`,
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "rgba(167,139,250,0.18)", color: "#A78BFA" }}>{i + 1}</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
