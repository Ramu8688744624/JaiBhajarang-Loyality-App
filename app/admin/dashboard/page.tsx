"use client";
// app/admin/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────
// Super Admin Dashboard — Analytics + User Management
// Only accessible to role = super_admin
//
// Fixes applied:
//   • fmt() and fmtCurrency() helpers replace all raw .toLocaleString() calls
//   • StatCard widened to accept null | undefined values safely
//   • No crash on empty analytics data for new shops
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useTransition, useCallback } from "react";
import { getAnalytics, getAllUsers } from "@/lib/actions/billing";
import { setUserRole, adminResetPassword } from "@/lib/actions/auth";

// ─── Null-safe formatters ─────────────────────────────────────

const fmt = (
  v:    number | null | undefined,
  opts: Intl.NumberFormatOptions = {}
): string => Number(v ?? 0).toLocaleString("en-IN", opts);

const fmtCurrency = (v: number | null | undefined) =>
  fmt(v, { maximumFractionDigits: 0 });

// ─── Types ───────────────────────────────────────────────────

interface Analytics {
  total_customers:           number | null;
  total_staff:               number | null;
  new_customers_30d:         number | null;
  total_revenue:             number | null;
  total_gross:               number | null;
  revenue_30d:               number | null;
  total_bills:               number | null;
  bills_30d:                 number | null;
  total_cashback_given:      number | null;
  wallet_liabilities:        number | null;
  total_joining_bonus_given: number | null;
  total_referral_bonus_given:number | null;
  total_referred_users:      number | null;
  avg_bill_value:            number | null;
}

interface UserRow {
  id:              string;
  full_name:       string | null;
  username:        string;
  phone:           string | null;
  role:            string;
  wallet_balance:  number;
  total_spent:     number;
  visit_count:     number;
  created_at:      string;
  referral_code:   string | null;
  total_referrals: number;
}

interface DayRevenue {
  bill_date:  string;
  revenue:    number;
  cashback:   number;
  bill_count: number;
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon, prefix = "",
}: {
  label:   string;
  value:   string | number | null | undefined;   // widened — null safe
  sub?:    string;
  color:   string;
  icon:    string;
  prefix?: string;
}) {
  const display =
    value == null             ? "0" :
    typeof value === "number" ? fmt(value) :
    value;

  return (
    <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
          <p className="text-2xl font-black leading-none" style={{ color }}>
            {prefix}{display}
          </p>
          {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${color}18` }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "#D4A843" },
    admin:       { label: "Staff",       color: "#2563EB" },
    customer:    { label: "Customer",    color: "#64748B" },
  };
  const c = config[role] ?? config.customer;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}>
      {c.label}
    </span>
  );
}

function Sparkline({ data }: { data: DayRevenue[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.revenue));
  const W = 200, H = 48, pad = 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
    const y = H - pad - ((d.revenue / (max || 1)) * (H - 2 * pad));
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke="#D4A843" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <polygon
        points={`${pad},${H} ${pts.join(" ")} ${W - pad},${H}`}
        fill="url(#grad)" opacity="0.25" />
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#D4A843" />
          <stop offset="100%" stopColor="#D4A843" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────

function ResetModal({ user, onClose, onSuccess }: { user: UserRow; onClose: () => void; onSuccess: () => void }) {
  const [pw, setPw]   = useState("");
  const [err, setErr] = useState("");
  const [pending, sp] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setErr("Minimum 6 characters."); return; }
    setErr("");
    sp(async () => {
      const r = await adminResetPassword(user.id, pw);
      if (!r.success) { setErr(r.error ?? "Failed"); return; }
      onSuccess();
    });
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
      <p className="text-slate-400 text-sm mb-5">{user.full_name ?? user.username} · {user.phone}</p>
      <form onSubmit={submit} className="space-y-4">
        <input type="password" placeholder="New password (min 6 chars)" autoFocus
          className={inputCls} value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3">
          <button type="submit" disabled={pending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
            {pending ? "Resetting…" : "Reset Password"}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all">
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ─── Promote Modal ────────────────────────────────────────────

function PromoteModal({
  user, onClose, onSuccess,
}: { user: UserRow; onClose: () => void; onSuccess: (role: string) => void }) {
  const [role,    setRole]  = useState(user.role);
  const [err,     setErr]   = useState("");
  const [pending, sp]       = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === user.role) { onClose(); return; }
    sp(async () => {
      const r = await setUserRole(user.id, role as any);
      if (!r.success) { setErr(r.error ?? "Failed"); return; }
      onSuccess(role);
    });
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Change Role</h3>
      <p className="text-slate-400 text-sm mb-5">{user.full_name ?? user.username}</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          {[
            { value: "customer",    label: "Customer",    desc: "Can access own dashboard only" },
            { value: "admin",       label: "Staff Admin", desc: "Can search, bill, and register customers" },
            { value: "super_admin", label: "Super Admin", desc: "Full access including analytics & roles" },
          ].map((opt) => (
            <label key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                role === opt.value ? "border-[#D4A843]/60 bg-[#D4A843]/10" : "border-[#1E2D4A] hover:border-[#2D3F5E]"
              }`}>
              <input type="radio" name="role" value={opt.value}
                checked={role === opt.value} onChange={() => setRole(opt.value)}
                className="mt-0.5 accent-[#D4A843]" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{opt.label}</p>
                <p className="text-xs text-slate-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3">
          <button type="submit" disabled={pending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-[#0A0F1E] transition-all active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
            {pending ? "Saving…" : "Save Role"}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all">
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [analytics,     setAnalytics]     = useState<Analytics | null>(null);
  const [revenueData,   setRevenueData]   = useState<DayRevenue[]>([]);
  const [users,         setUsers]         = useState<UserRow[]>([]);
  const [userQuery,     setUserQuery]     = useState("");
  const [loading,       setLoading]       = useState(true);
  const [resetTarget,   setResetTarget]   = useState<UserRow | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<UserRow | null>(null);
  const [toast,         setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [activeTab,     setActiveTab]     = useState<"analytics" | "users">("analytics");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      const [a, u] = await Promise.all([getAnalytics(), getAllUsers()]);
      setAnalytics(a.summary as Analytics);
      setRevenueData(a.revenueByDay as DayRevenue[]);
      setUsers(u as UserRow[]);
      setLoading(false);
    })();
  }, []);

  const handleUserSearch = useCallback(async (q: string) => {
    setUserQuery(q);
    const u = await getAllUsers(q);
    setUsers(u as UserRow[]);
  }, []);

  const sym = "₹";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="border-b border-[#1E2D4A] px-4 py-5"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.7),rgba(10,15,30,0.6))" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(212,168,67,0.2)", color: "#D4A843", border: "1px solid rgba(212,168,67,0.4)" }}>
                SUPER ADMIN
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Analytics Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Jai Bajrang Mobiles — Business Intelligence</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#1E2D4A] bg-[#0A0F1E]">
        <div className="max-w-6xl mx-auto flex">
          {[["analytics","📊 Analytics"],["users","👥 User Management"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`px-6 py-3.5 text-sm font-medium transition-all border-b-2 ${
                activeTab === id
                  ? "text-[#D4A843] border-[#D4A843]"
                  : "text-slate-500 border-transparent hover:text-slate-300"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Analytics Tab ── */}
        {activeTab === "analytics" && analytics && (
          <>
            {/* Revenue sparkline card */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
                  <p className="text-4xl font-black" style={{ color: "#D4A843" }}>
                    {sym}{fmt(analytics.total_revenue)}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {sym}{fmt(analytics.revenue_30d)} in last 30 days
                    <span className="text-slate-600 mx-2">·</span>
                    {analytics.bills_30d ?? 0} bills
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Avg. bill value</p>
                  <p className="text-xl font-bold text-slate-200">
                    {sym}{fmtCurrency(analytics.avg_bill_value)}
                  </p>
                </div>
              </div>
              <Sparkline data={revenueData} />
              {revenueData.length > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-600">{revenueData[0]?.bill_date}</span>
                  <span className="text-xs text-slate-600">{revenueData[revenueData.length - 1]?.bill_date}</span>
                </div>
              )}
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Customers"  value={analytics.total_customers ?? 0}   color="#2563EB"  icon="👥"  sub={`+${analytics.new_customers_30d ?? 0} this month`} />
              <StatCard label="Total Bills"      value={analytics.total_bills ?? 0}        color="#22C55E"  icon="🧾"  sub={`${analytics.bills_30d ?? 0} in last 30 days`} />
              <StatCard label="Referred Users"   value={analytics.total_referred_users ?? 0} color="#A78BFA" icon="🔗" />
              <StatCard label="Staff Members"    value={analytics.total_staff ?? 0}        color="#F59E0B"  icon="👤" />
            </div>

            {/* Loyalty / Liability grid */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Loyalty & Wallet Liabilities
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Cashback Given"     value={sym + fmtCurrency(analytics.total_cashback_given)}     color="#22C55E" icon="🎉" />
                <StatCard label="Wallet Liabilities" value={sym + fmtCurrency(analytics.wallet_liabilities)}       color="#EF4444" icon="💼" sub="Outstanding wallet balances" />
                <StatCard label="Joining Bonuses"    value={sym + fmtCurrency(analytics.total_joining_bonus_given)} color="#D4A843" icon="🎁" />
                <StatCard label="Referral Payouts"   value={sym + fmtCurrency(analytics.total_referral_bonus_given)} color="#A78BFA" icon="🔗" />
              </div>
            </div>
          </>
        )}

        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <>
            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">🔍</span>
                <input
                  className="w-full bg-[#0F1729] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#D4A843]/50 transition-all"
                  placeholder="Search by name or phone…"
                  value={userQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0">{users.length} users</span>
            </div>

            {/* Table — desktop */}
            <div className="hidden md:block bg-[#0F1729] border border-[#1E2D4A] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "rgba(27,58,107,0.4)" }}>
                    {["Name / Phone","Role","Wallet","Spent","Visits","Referrals","Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}
                      className={`border-t border-[#1E2D4A] hover:bg-white/2 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-200">{u.full_name ?? u.username}</p>
                        <p className="text-xs text-slate-500">{u.phone}</p>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#D4A843" }}>
                        ₹{Number(u.wallet_balance ?? 0).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">₹{Number(u.total_spent ?? 0).toFixed(0)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{u.visit_count}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{u.total_referrals}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setPromoteTarget(u)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all">
                            👑 Role
                          </button>
                          <button onClick={() => setResetTarget(u)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all">
                            🔑 Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-10">No users found</p>
              )}
            </div>

            {/* Cards — mobile */}
            <div className="md:hidden space-y-3">
              {users.map((u) => (
                <div key={u.id} className="bg-[#0F1729] border border-[#1E2D4A] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{u.full_name ?? u.username}</p>
                      <p className="text-xs text-slate-500">{u.phone}</p>
                    </div>
                    <div className="text-right">
                      <RoleBadge role={u.role} />
                      <p className="text-sm font-bold mt-1" style={{ color: "#D4A843" }}>₹{Number(u.wallet_balance ?? 0).toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPromoteTarget(u)}
                      className="flex-1 text-xs py-2 rounded-lg border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all">
                      👑 Change Role
                    </button>
                    <button onClick={() => setResetTarget(u)}
                      className="flex-1 text-xs py-2 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all">
                      🔑 Reset Password
                    </button>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-10">No users found</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {resetTarget && (
        <ResetModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={() => {
            showToast(`Password reset for ${resetTarget.full_name ?? resetTarget.username}`);
            setResetTarget(null);
          }}
        />
      )}

      {promoteTarget && (
        <PromoteModal
          user={promoteTarget}
          onClose={() => setPromoteTarget(null)}
          onSuccess={(newRole) => {
            setUsers((prev) => prev.map((u) => u.id === promoteTarget.id ? { ...u, role: newRole } : u));
            showToast(`Role updated to ${newRole}`);
            setPromoteTarget(null);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium
          ${toast.type === "success" ? "bg-green-900/95 text-green-300 border border-green-700/50" : "bg-red-900/95 text-red-300 border border-red-700/50"}`}>
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all";

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
      <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
      <p className="text-red-300 text-sm">{msg}</p>
    </div>
  );
}
