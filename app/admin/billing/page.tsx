"use client";
// app/admin/billing/page.tsx  ─ DUAL-WALLET FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Admin Billing Terminal
// • Wallet source toggle: Cashback OR Referral (not both)
// • referral_per_visit_limit enforced in preview
// • Process button enabled only when customer + amount > 0
// • Register modal: Name + Email (required) + Phone (optional)
// • Reset Password shortcut per result row
// ══════════════════════════════════════════════════════════════

import {
  useState, useEffect, useRef, useTransition, useCallback,
} from "react";
import { createClient } from "@supabase/supabase-js";
import {
  searchCustomers, previewBill, processBill, getShopConfig,
  type CustomerSearchResult, type WalletSource, type BillPreview,
} from "@/lib/actions/billing";
import { adminRegisterCustomer, adminResetPassword } from "@/lib/actions/auth";

// ─── Admin session ────────────────────────────────────────────
function useAdminId() {
  const [id, setId] = useState("");
  useEffect(() => {
    createClient(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL),
      String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ).auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setId(data.session.user.id);
    });
  }, []);
  return id;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Atoms ─────────────────────────────────────────────────────
const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3 text-sm " +
  "text-white placeholder-slate-700 focus:outline-none " +
  "focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all";

function Toast({ msg, type, onClose }: { msg: string; type: "success"|"error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm pointer-events-auto
      ${type === "success" ? "bg-green-900/95 text-green-300 border border-green-700/50" : "bg-red-900/95 text-red-300 border border-red-700/50"}`}>
      <span>{type === "success" ? "✓" : "⚠"}</span>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
      <span className="text-red-400 flex-shrink-0 mt-px">⚠</span>
      <p className="text-red-300 text-sm leading-snug">{msg}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// REGISTER MODAL
// ══════════════════════════════════════════════════════════════
function RegisterModal({ initialQuery, sym, joiningBonus, onSuccess, onClose }: {
  initialQuery: string; sym: string; joiningBonus: number;
  onSuccess: (c: CustomerSearchResult) => void; onClose: () => void;
}) {
  const looksEmail = initialQuery.includes("@");
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState(looksEmail ? initialQuery : "");
  const [phone,    setPhone]    = useState(!looksEmail ? initialQuery.replace(/\D/g,"").slice(0,10) : "");
  const [err, setErr] = useState("");
  const [pending, sp] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim())            { setErr("Full name is required."); return; }
    if (!email.trim().includes("@")) { setErr("Valid email is required."); return; }
    if (phone && phone.length !== 10){ setErr("Phone must be exactly 10 digits."); return; }
    setErr("");
    sp(async () => {
      const res = await adminRegisterCustomer({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone || undefined });
      if (!res.success) { setErr(res.error ?? "Registration failed."); return; }
      const p = res.data!;
      onSuccess({
        id: p.id, username: p.username, full_name: p.full_name,
        email: p.email, phone: p.phone,
        wallet_balance: p.wallet_balance, cashback_balance: p.wallet_balance,
        referral_balance: 0, total_spent: 0, visit_count: 0,
        referral_code: p.referral_code, wallet_expires_at: null,
      });
    });
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Register New Customer</h3>
      <div className="flex items-center gap-2 mb-5 mt-2 px-3 py-2 rounded-xl"
        style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.22)" }}>
        <span>🎁</span>
        <p className="text-sm" style={{ color: "#D4A843" }}>{sym}{joiningBonus} joining bonus auto-credited</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
          <input autoFocus className={inputCls} placeholder="Ramesh Kumar" value={fullName}
            onChange={(e) => { setFullName(e.target.value); setErr(""); }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email *</label>
          <input type="email" className={inputCls} placeholder="customer@example.com" value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone (optional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">+91</span>
            <input type="tel" inputMode="numeric" className={`${inputCls} pl-11`} placeholder="98765 43210"
              value={phone} maxLength={10}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g,"").slice(0,10)); setErr(""); }} />
          </div>
        </div>
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-[#0A0F1E] active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
            {pending ? "Registering…" : "Register & Select"}
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

// ══════════════════════════════════════════════════════════════
// RESET PASSWORD MODAL
// ══════════════════════════════════════════════════════════════
function ResetPwdModal({ customer, onClose, onSuccess }: {
  customer: CustomerSearchResult; onClose: () => void; onSuccess: () => void;
}) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [pending, sp] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setErr("Min 6 characters."); return; }
    setErr("");
    sp(async () => {
      const res = await adminResetPassword(customer.id, pw);
      if (!res.success) { setErr(res.error ?? "Failed."); return; }
      onSuccess();
    });
  };
  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
      <p className="text-sm text-slate-400 mb-5">{customer.full_name ?? customer.username} · {customer.email}</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <input type={show ? "text" : "password"} autoFocus placeholder="New password" className={`${inputCls} pr-12`}
            value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{show ? "🙈" : "👁️"}</button>
        </div>
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3">
          <button type="submit" disabled={pending || pw.length < 6}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>
            {pending ? "Resetting…" : "Reset Password"}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm text-slate-400 border border-[#1E2D4A] transition-all">Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

// ══════════════════════════════════════════════════════════════
// WALLET SOURCE TOGGLE
// ══════════════════════════════════════════════════════════════
function WalletSourceToggle({
  source, onChange, cashbackBal, referralUsable, sym,
}: {
  source: WalletSource; onChange: (s: WalletSource) => void;
  cashbackBal: number; referralUsable: number; sym: string;
}) {
  const opts: { id: WalletSource; label: string; amount: number; color: string; icon: string }[] = [
    { id: "cashback", label: "Cashback",  amount: cashbackBal,   color: "#22C55E", icon: "💚" },
    { id: "referral", label: "Referral",  amount: referralUsable, color: "#A78BFA", icon: "🔗" },
    { id: "none",     label: "No Wallet", amount: 0,             color: "#64748B", icon: "⊘"  },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`py-3 px-2 rounded-xl text-center border transition-all ${
            source === o.id
              ? "border-current bg-current/10"
              : "border-[#1E2D4A] hover:border-[#2D3F5E]"
          }`}
          style={{ borderColor: source === o.id ? o.color : undefined, color: source === o.id ? o.color : "#64748B" }}>
          <p className="text-base mb-1">{o.icon}</p>
          <p className="text-xs font-semibold leading-none">{o.label}</p>
          {o.id !== "none" && (
            <p className="text-xs mt-1 opacity-75">{sym}{o.amount.toFixed(0)}</p>
          )}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function BillingTerminalPage() {
  const adminId = useAdminId();
  const [config, setConfig] = useState<any>(null);
  const [query,  setQuery]  = useState("");
  const [results,   setResults]   = useState<CustomerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [customer,  setCustomer]  = useState<CustomerSearchResult | null>(null);
  const [grossAmt,  setGrossAmt]  = useState("");
  const [rPct,      setRPct]      = useState(5);
  const [cPct,      setCPct]      = useState(3);
  const [overrideOn, setOverrideOn] = useState(false);
  const [payMethod,  setPayMethod]  = useState<"cash"|"card"|"upi"|"mixed">("cash");
  const [walletSrc,  setWalletSrc]  = useState<WalletSource>("cashback");
  const [preview,    setPreview]    = useState<BillPreview | null>(null);
  const [lastBill,   setLastBill]   = useState<any>(null);
  const [isPending,  sp]            = useTransition();
  const [showReg,    setShowReg]    = useState(false);
  const [resetTarget, setResetTarget] = useState<CustomerSearchResult | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error" } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, type: "success"|"error" = "success") => setToast({ msg, type }), []);

  useEffect(() => {
    getShopConfig().then((c) => {
      setConfig(c);
      setRPct(c.default_redemption_pct);
      setCPct(c.default_cashback_pct);
    });
  }, []);

  const doSearch = useCallback(debounce(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setNoResults(false); setSearching(false); return; }
    setSearching(true);
    const res = await searchCustomers(q);
    setResults(res);
    setNoResults(res.length === 0);
    setSearching(false);
  }, 350), []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  useEffect(() => {
    const amount = parseFloat(grossAmt);
    if (!customer || !amount || amount <= 0) { setPreview(null); return; }
    previewBill(customer.id, amount, rPct, cPct, walletSrc).then(setPreview);
  }, [customer, grossAmt, rPct, cPct, walletSrc]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectCustomer = (c: CustomerSearchResult) => {
    setCustomer(c);
    setQuery(`${c.full_name ?? c.username}  ·  ${c.email ?? c.phone ?? ""}`);
    setResults([]);
    setNoResults(false);
  };

  const clearCustomer = () => {
    setCustomer(null); setQuery(""); setResults([]);
    setPreview(null); setGrossAmt(""); setLastBill(null); setNoResults(false);
  };

  const handleProcess = () => {
    const amount = parseFloat(grossAmt);
    if (!customer || !amount || amount <= 0 || !adminId) return;
    sp(async () => {
      const res = await processBill({
        customerId: customer.id, billedBy: adminId,
        grossAmount: amount, redemptionPct: rPct,
        cashbackPct: cPct, paymentMethod: payMethod,
        walletSource: walletSrc,
      });
      if (res.success && res.bill) {
        setLastBill(res.bill);
        setCustomer((p) => p ? {
          ...p,
          cashback_balance: res.newCashbackBalance ?? 0,
          referral_balance: res.newReferralBalance ?? 0,
          wallet_balance: (res.newCashbackBalance ?? 0) + (res.newReferralBalance ?? 0),
        } : p);
        setGrossAmt(""); setPreview(null);
        showToast(res.referralBonusPaid
          ? "Bill done! Referral bonus credited to referrer. 🎉"
          : `Bill done! ${sym}${res.bill.cashback_earned.toFixed(2)} cashback earned.`);
      } else {
        showToast(res.error ?? "Failed to process bill.", "error");
      }
    });
  };

  const sym          = String(config?.currency_symbol ?? "₹");
  const joiningBonus = Number(config?.joining_bonus   ?? 500);
  // Enable process button ONLY if: customer selected AND amount > 0
  const canProcess = !!customer && parseFloat(grossAmt) > 0 && !!adminId && !isPending;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#1E2D4A] px-4 py-5"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.6),rgba(10,15,30,0.8))" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Billing Terminal</h1>
            <p className="text-slate-400 text-sm mt-1">Search → Amount → Choose wallet → Process</p>
          </div>
          {config && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/40 text-blue-300 border border-blue-800/50">
                Redeem {config.default_redemption_pct}%
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-green-900/40 text-green-300 border border-green-800/50">
                Cashback {config.default_cashback_pct}%
              </span>
              {config.referral_per_visit_limit && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-800/50">
                  Ref cap {sym}{config.referral_per_visit_limit}/visit
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT: Inputs */}
          <div className="lg:col-span-3 space-y-5">

            {/* 1. Customer search */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">1 · Find Customer</p>
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">🔍</span>
                  <input className="w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all"
                    placeholder="Phone, email, or name…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); if (customer) clearCustomer(); }} />
                  {query && (
                    <button onClick={clearCustomer} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">✕</button>
                  )}
                </div>

                {/* Results */}
                {results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1729] border border-[#1E2D4A] rounded-xl shadow-2xl z-20 overflow-hidden">
                    {results.map((r) => (
                      <div key={r.id} className="flex items-center border-b border-[#1E2D4A] last:border-0">
                        <button onClick={() => selectCustomer(r)}
                          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-[#D4A843]/8 transition-colors">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: "rgba(212,168,67,0.18)", color: "#D4A843" }}>
                            {(r.full_name ?? r.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{r.full_name ?? r.username}</p>
                            <p className="text-xs text-slate-500 truncate">{r.email ?? r.phone ?? "—"}</p>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5">
                            <p className="text-xs text-green-400">CB: {sym}{r.cashback_balance.toFixed(0)}</p>
                            <p className="text-xs text-purple-400">Ref: {sym}{r.referral_balance.toFixed(0)}</p>
                          </div>
                        </button>
                        <button onClick={() => { setResults([]); setResetTarget(r); }} title="Reset password"
                          className="px-3 py-3 text-slate-600 hover:text-red-400 transition-colors border-l border-[#1E2D4A]">🔑</button>
                      </div>
                    ))}
                  </div>
                )}

                {searching && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1729] border border-[#1E2D4A] rounded-xl px-4 py-3 text-sm text-slate-500 text-center">Searching…</div>
                )}

                {noResults && !searching && !customer && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1729] border border-[#D4A843]/30 rounded-xl p-4 z-20 text-center">
                    <p className="text-slate-400 text-sm mb-3">No customer found for "<span style={{ color: "#D4A843" }}>{query}</span>"</p>
                    <button onClick={() => { setResults([]); setShowReg(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#0A0F1E]"
                      style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
                      + Register New Customer
                    </button>
                  </div>
                )}
              </div>

              {/* Selected customer */}
              {customer && (
                <div className="mt-4 bg-[#0A0F1E] border border-[#D4A843]/30 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                        style={{ background: "rgba(212,168,67,0.18)", color: "#D4A843" }}>
                        {(customer.full_name ?? customer.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{customer.full_name ?? customer.username}</p>
                        <p className="text-xs text-slate-500 truncate">{customer.email}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{customer.visit_count} visits · Spent {sym}{customer.total_spent.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-green-400">Cashback: {sym}{customer.cashback_balance.toFixed(2)}</p>
                      <p className="text-xs text-purple-400 mt-0.5">Referral: {sym}{customer.referral_balance.toFixed(2)}</p>
                      {customer.wallet_expires_at && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          Expires {new Date(customer.wallet_expires_at).toLocaleDateString("en-IN")}
                        </p>
                      )}
                      <button onClick={() => setResetTarget(customer)} className="text-xs text-slate-600 hover:text-red-400 mt-1 transition-colors">🔑 Reset pwd</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Bill amount */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">2 · Bill Amount</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none" style={{ color: "#D4A843" }}>{sym}</span>
                <input type="number" min="0" step="1" inputMode="decimal"
                  className="w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-4 text-3xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all"
                  placeholder="0"
                  value={grossAmt}
                  onChange={(e) => setGrossAmt(e.target.value)} />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[100, 250, 500, 1000, 2000, 5000].map((a) => (
                  <button key={a} onClick={() => setGrossAmt(String(a))}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#1E2D4A] text-slate-400 hover:border-[#D4A843]/40 hover:text-[#D4A843] transition-all">
                    {sym}{a}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Wallet source toggle */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">3 · Wallet Source</p>
              <WalletSourceToggle
                source={walletSrc} onChange={setWalletSrc} sym={sym}
                cashbackBal={customer?.cashback_balance ?? 0}
                referralUsable={preview?.referralUsableCap ?? customer?.referral_balance ?? 0}
              />
              {config?.referral_per_visit_limit && walletSrc === "referral" && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Max {sym}{config.referral_per_visit_limit} referral credit usable per visit
                </p>
              )}
            </div>

            {/* 4. Payment method */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">4 · Payment Method</p>
              <div className="grid grid-cols-4 gap-2">
                {(["cash","card","upi","mixed"] as const).map((m) => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`py-3 rounded-xl text-sm font-semibold capitalize transition-all border ${
                      payMethod === m ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10" : "border-[#1E2D4A] text-slate-500"}`}>
                    {m === "cash" ? "💵" : m === "card" ? "💳" : m === "upi" ? "📱" : "🔀"}<br />
                    <span className="text-xs mt-0.5 inline-block">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Rate override */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider">5 · Rate Override</p>
                <button onClick={() => setOverrideOn(!overrideOn)}
                  className={`relative w-10 h-5 rounded-full transition-all ${overrideOn ? "bg-[#D4A843]" : "bg-[#1E2D4A]"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${overrideOn ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
              {overrideOn ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5"><span>Redemption %</span><span className="text-blue-400 font-bold">{rPct}%</span></div>
                    <input type="range" min="0" max="100" step="1" value={rPct} onChange={(e) => setRPct(Number(e.target.value))} className="w-full accent-blue-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5"><span>Cashback %</span><span className="text-green-400 font-bold">{cPct}%</span></div>
                    <input type="range" min="0" max="30" step="0.5" value={cPct} onChange={(e) => setCPct(Number(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <button onClick={() => { setRPct(config?.default_redemption_pct ?? 5); setCPct(config?.default_cashback_pct ?? 3); }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors">↺ Reset to defaults</button>
                </div>
              ) : (
                <p className="text-xs text-slate-600">Using defaults — Redemption {config?.default_redemption_pct ?? 5}%, Cashback {config?.default_cashback_pct ?? 3}%</p>
              )}
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5 sticky top-20">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-4">Bill Preview</p>

              {!preview ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">🧾</p>
                  <p className="text-slate-500 text-sm">Select customer and enter amount</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Gross Amount</span>
                      <span className="text-slate-200 font-medium">{sym}{parseFloat(grossAmt).toFixed(2)}</span>
                    </div>
                    {preview.redemptionAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          {walletSrc === "referral" ? "Referral" : "Cashback"} Discount
                          <span className="text-xs text-slate-600 ml-1">({rPct}%)</span>
                        </span>
                        <span className={`font-medium ${walletSrc === "referral" ? "text-purple-400" : "text-blue-400"}`}>
                          − {sym}{preview.redemptionAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[#1E2D4A] pt-2 flex justify-between">
                      <span className="font-bold text-slate-200">You Pay</span>
                      <span className="text-xl font-black text-white">{sym}{preview.netAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {preview.cashbackEarned > 0 && (
                    <div className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                      <span className="text-sm text-green-400">🎉 Cashback earned</span>
                      <span className="text-sm font-bold text-green-400">+ {sym}{preview.cashbackEarned.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Projected balances */}
                  <div className="bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Cashback after</span>
                      <span className="text-green-400 font-semibold">{sym}{preview.projectedCashback.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Referral after</span>
                      <span className="text-purple-400 font-semibold">{sym}{preview.projectedReferral.toFixed(2)}</span>
                    </div>
                    {preview.daysUntilExpiry !== null && preview.daysUntilExpiry <= 30 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-[#1E2D4A]">
                        <span className="text-yellow-500">⚠ Expires in</span>
                        <span className="text-yellow-400 font-semibold">{preview.daysUntilExpiry} days</span>
                      </div>
                    )}
                  </div>

                  <button onClick={handleProcess} disabled={!canProcess}
                    className="w-full py-4 rounded-xl text-base font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                    style={{ background: canProcess ? "linear-gradient(135deg,#D4A843,#F5D078)" : "#334155" }}>
                    {isPending ? "Processing…" : `✓ Complete Transaction  ${sym}${preview.netAmount.toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>

            {/* Last receipt */}
            {lastBill && (
              <div className="bg-[#0F1729] rounded-2xl p-5" style={{ border: "1px solid rgba(34,197,94,0.35)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-400">✓</span>
                  <p className="text-sm font-bold text-green-400">Bill Processed!</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Charged</span><span>{sym}{Number(lastBill.net_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Discount</span><span className="text-blue-400">− {sym}{Number(lastBill.redemption_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Cashback</span><span className="text-green-400">+ {sym}{Number(lastBill.cashback_earned).toFixed(2)}</span></div>
                </div>
                <button onClick={() => setLastBill(null)} className="mt-4 w-full py-2 rounded-lg text-xs text-slate-500 border border-[#1E2D4A] transition-all">Clear</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReg && <RegisterModal initialQuery={query} sym={sym} joiningBonus={joiningBonus} onClose={() => setShowReg(false)}
        onSuccess={(p) => { selectCustomer(p); setShowReg(false); showToast(`${p.full_name ?? p.username} registered! ${sym}${joiningBonus} bonus credited.`); }} />}
      {resetTarget && <ResetPwdModal customer={resetTarget} onClose={() => setResetTarget(null)}
        onSuccess={() => { showToast(`Password reset for ${resetTarget.full_name ?? resetTarget.username}`); setResetTarget(null); }} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
