"use client";
// app/admin/billing/BillingTerminal.tsx
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Billing Terminal (Client Component)
//
// Receives adminId from the server wrapper — never undefined.
// Uses useMemo for bill calculations → zero lag when typing.
// canProcess checks all 5 conditions explicitly.
//
// Fixes applied:
//   • handleProcess wrapped in useCallback with full dep array
//   • billedBy: adminId mapping confirmed correct
//   • All numeric inputs rounded to .toFixed(2) before RPC
//   • redemptionPct / cashbackPct validated and clamped
// ══════════════════════════════════════════════════════════════

import {
  useState, useEffect, useRef, useTransition,
  useCallback, useMemo,
} from "react";
import {
  searchCustomers, previewBill, processBill,
  type CustomerSearchResult, type WalletSource,
  type BillPreview, type ShopConfig,
} from "@/lib/actions/billing";
import { adminRegisterCustomer, adminResetPassword } from "@/lib/actions/auth";

// ─── Props ───────────────────────────────────────────────────

interface Props {
  adminId:   string;     // guaranteed non-empty by server wrapper
  adminName: string;
  config:    ShopConfig;
}

// ─── Helpers ─────────────────────────────────────────────────

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

type PayMethod = "cash" | "card" | "upi" | "mixed";

const PAY_METHODS: { id: PayMethod; icon: string; label: string }[] = [
  { id: "cash",  icon: "💵", label: "Cash"  },
  { id: "card",  icon: "💳", label: "Card"  },
  { id: "upi",   icon: "📱", label: "UPI"   },
  { id: "mixed", icon: "🔀", label: "Mixed" },
];

// ─── Atoms ───────────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3 text-sm " +
  "text-white placeholder-slate-700 focus:outline-none " +
  "focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all";

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-medium max-w-sm pointer-events-auto border
      ${type === "success"
        ? "bg-green-950/95 text-green-300 border-green-800/50"
        : "bg-red-950/95  text-red-300  border-red-800/50"}`}>
      <span className="text-base flex-shrink-0">{type === "success" ? "✓" : "⚠"}</span>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-950/70 border border-red-800/50 rounded-xl px-4 py-3">
      <span className="text-red-400 mt-px flex-shrink-0">⚠</span>
      <p className="text-red-300 text-sm leading-snug">{msg}</p>
    </div>
  );
}

// ─── Register Modal ───────────────────────────────────────────

function RegisterModal({
  initialQuery, sym, joiningBonus, onSuccess, onClose,
}: {
  initialQuery: string; sym: string; joiningBonus: number;
  onSuccess: (c: CustomerSearchResult) => void; onClose: () => void;
}) {
  const looksEmail = initialQuery.includes("@");
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState(looksEmail ? initialQuery : "");
  const [phone,    setPhone]    = useState(!looksEmail ? initialQuery.replace(/\D/g, "").slice(0, 10) : "");
  const [err, setErr] = useState("");
  const [pending, sp] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim())              { setErr("Full name is required."); return; }
    if (!email.trim().includes("@"))   { setErr("Valid email is required."); return; }
    if (phone && phone.length !== 10)  { setErr("Phone must be exactly 10 digits."); return; }
    setErr("");
    sp(async () => {
      const res = await adminRegisterCustomer({
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone || undefined,
      });
      if (!res.success) { setErr(res.error ?? "Registration failed."); return; }
      const p = res.data!;
      onSuccess({
        id: p.id, username: p.username, full_name: p.full_name,
        email: p.email, phone: p.phone,
        wallet_balance: p.wallet_balance,
        cashback_balance: p.wallet_balance, referral_balance: 0,
        total_spent: 0, visit_count: 0,
        referral_code: p.referral_code, wallet_expires_at: null,
      });
    });
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Register New Customer</h3>
      <div className="flex items-center gap-2 my-4 px-3 py-2.5 rounded-xl text-sm"
        style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.22)", color: "#D4A843" }}>
        🎁 {sym}{joiningBonus} joining bonus auto-credited
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
          <input autoFocus className={inputCls} placeholder="Ramesh Kumar"
            value={fullName} onChange={(e) => { setFullName(e.target.value); setErr(""); }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email *</label>
          <input type="email" className={inputCls} placeholder="customer@example.com"
            value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone (optional)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none select-none">+91</span>
            <input type="tel" inputMode="numeric" className={`${inputCls} pl-11`} placeholder="98765 43210"
              value={phone} maxLength={10}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(""); }} />
          </div>
        </div>
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-60"
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

// ─── Reset Password Modal ─────────────────────────────────────

function ResetPwdModal({ customer, onClose, onSuccess }: {
  customer: CustomerSearchResult; onClose: () => void; onSuccess: () => void;
}) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [pending, sp] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setErr("Minimum 6 characters."); return; }
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
      <p className="text-slate-400 text-sm mb-5">{customer.full_name ?? customer.username} · {customer.email}</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <input type={show ? "text" : "password"} autoFocus placeholder="New password (min 6)"
            className={`${inputCls} pr-12`} value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }} />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {show ? "🙈" : "👁️"}
          </button>
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
// MAIN TERMINAL COMPONENT
// ══════════════════════════════════════════════════════════════

export default function BillingTerminal({ adminId, adminName, config }: Props) {
  // ── State ─────────────────────────────────────────────────
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<CustomerSearchResult[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [noResults,   setNoResults]   = useState(false);
  const [customer,    setCustomer]    = useState<CustomerSearchResult | null>(null);
  const [grossAmt,    setGrossAmt]    = useState("");
  const [rPct,        setRPct]        = useState(Number(config?.default_redemption_pct ?? 5));
  const [cPct,        setCPct]        = useState(Number(config?.default_cashback_pct ?? 3));
  const [overrideOn,  setOverrideOn]  = useState(false);
  const [payMethod,   setPayMethod]   = useState<PayMethod | null>(null);
  const [walletSrc,   setWalletSrc]   = useState<WalletSource>("cashback");
  const [preview,     setPreview]     = useState<BillPreview | null>(null);
  const [lastBill,    setLastBill]    = useState<any>(null);
  const [isPending,   sp]             = useTransition();
  const [showReg,     setShowReg]     = useState(false);
  const [resetTarget, setResetTarget] = useState<CustomerSearchResult | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") =>
    setToast({ msg, type }), []);

  const sym = config.currency_symbol;

  // ── useMemo: local bill calculation (zero server lag) ─────
  const localCalc = useMemo(() => {
    const gross = parseFloat(grossAmt);
    if (!customer || !gross || gross <= 0) return null;

    const activeBalance =
      walletSrc === "cashback" ? customer.cashback_balance :
      walletSrc === "referral"
        ? Math.min(customer.referral_balance, config.referral_per_visit_limit ?? Infinity)
        : 0;

    const redemptionMax = Math.round(gross * rPct / 100 * 100) / 100;
    const redemptionAmt = Math.min(redemptionMax, activeBalance);
    const netAmount     = gross - redemptionAmt;
    const cashbackEarn  = Math.round(netAmount * cPct / 100 * 100) / 100;

    return { gross, redemptionAmt, netAmount, cashbackEarn, activeBalance };
  }, [customer, grossAmt, rPct, cPct, walletSrc, config.referral_per_visit_limit]);

  // ── Server preview (for projected balances + expiry) ──────
  useEffect(() => {
    if (!localCalc || !customer) { setPreview(null); return; }
    const timeout = setTimeout(() => {
      previewBill(customer.id, localCalc.gross, rPct, cPct, walletSrc)
        .then(setPreview)
        .catch(() => null);
    }, 300);
    return () => clearTimeout(timeout);
  }, [customer, grossAmt, rPct, cPct, walletSrc]);

  // ── Debounced search ──────────────────────────────────────
  const doSearch = useCallback(debounce(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]); setNoResults(false); setSearching(false); return;
    }
    setSearching(true);
    const res = await searchCustomers(q);
    setResults(res);
    setNoResults(res.length === 0);
    setSearching(false);
  }, 350), []);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  // ── Close dropdown on outside click ───────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setResults([]);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectCustomer = useCallback((c: CustomerSearchResult) => {
    setCustomer(c);
    setQuery(`${c.full_name ?? c.username}  ·  ${c.email ?? c.phone ?? ""}`);
    setResults([]);
    setNoResults(false);
  }, []);

  const clearAll = useCallback(() => {
    setCustomer(null); setQuery(""); setResults([]);
    setPreview(null); setGrossAmt(""); setLastBill(null);
    setNoResults(false); setPayMethod(null);
  }, []);

  // ── canProcess: ALL 5 conditions must be true ─────────────
  const grossAmtNum = parseFloat(grossAmt);
  const canProcess =
    customer !== null &&
    !isNaN(grossAmtNum) && grossAmtNum > 0 &&
    payMethod !== null &&
    adminId.length > 0 &&
    !isPending;

  const disabledReason = useMemo(() => {
    if (!customer)        return "Select a customer first";
    if (grossAmtNum <= 0) return "Enter a bill amount";
    if (!payMethod)       return "Choose payment method";
    return "";
  }, [customer, grossAmtNum, payMethod]);

  // ── Process ───────────────────────────────────────────────
  const handleProcess = useCallback(() => {
    if (isPending || !canProcess || !customer || !payMethod) return;

    // Round all numerics to 2dp → safe for NUMERIC(15,2) Postgres columns
    const roundedGross  = Number(Number(grossAmtNum).toFixed(2));
    const redemptionPct = Math.max(0, Math.min(100, Number(Number(rPct).toFixed(2))));
    const cashbackPct   = Math.max(0, Math.min(30,  Number(Number(cPct).toFixed(2))));

    sp(async () => {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const custId   = String(customer.id).trim();
        const billerId = String(adminId).trim();

        if (!uuidRegex.test(custId))                        { showToast(`Invalid customer ID: ${custId}`, "error"); return; }
        if (!uuidRegex.test(billerId))                      { showToast(`Invalid admin ID: ${billerId}`, "error"); return; }
        if (isNaN(roundedGross) || roundedGross <= 0)       { showToast("Invalid amount", "error"); return; }

        const res = await processBill({
          customerId:    custId,
          billedBy:      billerId,      // adminId prop → billedBy payload key ✅
          grossAmount:   roundedGross,
          paymentMethod: payMethod,
          walletSource:  walletSrc,
          redemptionPct,
          cashbackPct,
        });

        if (res.success && res.bill) {
          setLastBill(res.bill);
          setCustomer((p) => p ? {
            ...p,
            cashback_balance: Number(res.newCashbackBalance ?? 0),
            referral_balance: Number(res.newReferralBalance ?? 0),
            wallet_balance:   Number(res.newCashbackBalance ?? 0) + Number(res.newReferralBalance ?? 0),
          } : p);
          setGrossAmt("");
          setPreview(null);
          setPayMethod(null);
          showToast("Bill Generated Successfully! 🎉", "success");
        } else {
          showToast(res.error ?? "Failed to process bill.", "error");
        }
      } catch (err) {
        console.error("[handleProcess]", err);
        showToast("Server connection error", "error");
      }
    });
  }, [isPending, canProcess, customer, payMethod, grossAmtNum, rPct, cPct,
      adminId, walletSrc, sp, showToast]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="border-b border-[#1E2D4A] px-4 sm:px-6 py-4"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.6),rgba(10,15,30,0.8))" }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Billing Terminal</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              {adminName} · Search → Amount → Payment → Process
            </p>
          </div>
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
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT */}
          <div className="lg:col-span-3 space-y-4">

            {/* 1 · Customer search */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">1 · Find Customer</p>
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">🔍</span>
                  <input
                    className="w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all"
                    placeholder="Search by name, email, or phone"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); if (customer) clearAll(); }}
                  />
                  {query && (
                    <button onClick={clearAll}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">✕</button>
                  )}
                </div>

                {/* Dropdown */}
                {results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1729] border border-[#1E2D4A] rounded-xl shadow-2xl z-20 overflow-hidden">
                    {results.map((r) => (
                      <div key={r.id} className="flex items-center border-b border-[#1E2D4A] last:border-0">
                        <button onClick={() => selectCustomer(r)}
                          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-[#D4A843]/8 transition-colors">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: "rgba(212,168,67,0.15)", color: "#D4A843" }}>
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
                        <button onClick={() => { setResults([]); setResetTarget(r); }}
                          className="px-3 py-3 text-slate-600 hover:text-red-400 transition-colors border-l border-[#1E2D4A]"
                          title="Reset password">🔑</button>
                      </div>
                    ))}
                  </div>
                )}
                {searching && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1729] border border-[#1E2D4A] rounded-xl px-4 py-3 text-sm text-slate-500 text-center z-20">Searching…</div>
                )}
                {noResults && !searching && !customer && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F1729] border border-[#D4A843]/30 rounded-xl p-4 z-20 text-center">
                    <p className="text-slate-400 text-sm mb-3">No customer for "<span style={{ color: "#D4A843" }}>{query}</span>"</p>
                    <button onClick={() => { setResults([]); setShowReg(true); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#0A0F1E]"
                      style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
                      + Register New Customer
                    </button>
                  </div>
                )}
              </div>

              {customer && (
                <div className="mt-4 bg-[#0A0F1E] border border-[#D4A843]/30 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                        style={{ background: "rgba(212,168,67,0.15)", color: "#D4A843" }}>
                        {(customer.full_name ?? customer.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{customer.full_name ?? customer.username}</p>
                        <p className="text-xs text-slate-500 truncate">{customer.email}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{customer.visit_count} visits · {sym}{customer.total_spent.toFixed(0)} spent</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-xs text-green-400">CB: {sym}{customer.cashback_balance.toFixed(2)}</p>
                      <p className="text-xs text-purple-400">Ref: {sym}{customer.referral_balance.toFixed(2)}</p>
                      <button onClick={() => setResetTarget(customer)}
                        className="text-xs text-slate-600 hover:text-red-400 transition-colors">🔑 Reset</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2 · Amount */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">2 · Bill Amount</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black pointer-events-none" style={{ color: "#D4A843" }}>{sym}</span>
                <input type="number" min="0" step="1" inputMode="decimal"
                  className="w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-4 text-3xl font-bold text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all"
                  placeholder="0" value={grossAmt} onChange={(e) => setGrossAmt(e.target.value)} />
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

            {/* 3 · Payment method — REQUIRED */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-1">3 · Payment Method *</p>
              <p className="text-xs text-slate-600 mb-3">Must be selected to enable processing</p>
              <div className="grid grid-cols-4 gap-2">
                {PAY_METHODS.map((m) => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all border ${
                      payMethod === m.id
                        ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/12"
                        : "border-[#1E2D4A] text-slate-500 hover:text-slate-300 hover:border-[#2D3F5E]"
                    }`}>
                    <span className="block text-base mb-0.5">{m.icon}</span>
                    <span className="text-xs">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4 · Wallet source */}
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-3">4 · Wallet Source</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "cashback" as WalletSource, icon: "💚", label: "Cashback",  color: "#22C55E", amt: customer?.cashback_balance ?? 0 },
                  { id: "referral" as WalletSource, icon: "🔗", label: "Referral",  color: "#A78BFA", amt: Math.min(customer?.referral_balance ?? 0, config.referral_per_visit_limit ?? Infinity) },
                  { id: "none"     as WalletSource, icon: "⊘",  label: "None",      color: "#64748B", amt: -1 },
                ]).map((o) => (
                  <button key={o.id} onClick={() => setWalletSrc(o.id)}
                    className={`py-3 px-2 rounded-xl text-center transition-all border ${
                      walletSrc === o.id ? "bg-current/10" : "border-[#1E2D4A] hover:border-[#2D3F5E]"
                    }`}
                    style={{
                      borderColor: walletSrc === o.id ? o.color : undefined,
                      color:       walletSrc === o.id ? o.color : "#64748B",
                    }}>
                    <p className="text-base mb-1">{o.icon}</p>
                    <p className="text-xs font-semibold">{o.label}</p>
                    {o.amt >= 0 && <p className="text-xs mt-0.5 opacity-70">{sym}{Math.min(o.amt, 999999).toFixed(0)}</p>}
                  </button>
                ))}
              </div>
            </div>

            {/* 5 · Rate override */}
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
                  <button onClick={() => { setRPct(Number(config?.default_redemption_pct ?? 5)); setCPct(Number(config?.default_cashback_pct ?? 3)); }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors">↺ Reset to defaults</button>
                </div>
              ) : (
                <p className="text-xs text-slate-600">Redemption {config.default_redemption_pct}% · Cashback {config.default_cashback_pct}%</p>
              )}
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5 lg:sticky lg:top-20">
              <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider mb-4">Bill Preview</p>

              {!localCalc ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-3">🧾</p>
                  <p className="text-slate-500 text-sm">Select customer and enter amount</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Local calc renders instantly (useMemo) */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Gross</span>
                      <span className="text-slate-200 font-medium">{sym}{localCalc.gross.toFixed(2)}</span>
                    </div>
                    {localCalc.redemptionAmt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">
                          {walletSrc === "referral" ? "Referral" : "Cashback"} Discount
                          <span className="text-xs text-slate-600 ml-1">({rPct}%)</span>
                        </span>
                        <span className={`font-medium ${walletSrc === "referral" ? "text-purple-400" : "text-blue-400"}`}>
                          − {sym}{localCalc.redemptionAmt.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-[#1E2D4A] pt-2 flex justify-between">
                      <span className="font-bold text-slate-200">You Pay</span>
                      <span className="text-2xl font-black text-white">{sym}{localCalc.netAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {localCalc.cashbackEarn > 0 && (
                    <div className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                      <span className="text-sm text-green-400">🎉 Cashback earned</span>
                      <span className="text-sm font-bold text-green-400">+ {sym}{localCalc.cashbackEarn.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Server preview (projected balances + expiry) */}
                  {preview && (
                    <div className="bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-slate-500">Cashback after</span><span className="text-green-400 font-semibold">{sym}{preview.projectedCashback.toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-500">Referral after</span><span className="text-purple-400 font-semibold">{sym}{preview.projectedReferral.toFixed(2)}</span></div>
                      {preview.daysUntilExpiry !== null && preview.daysUntilExpiry <= 30 && (
                        <div className="flex justify-between text-xs pt-1 border-t border-[#1E2D4A]">
                          <span className="text-yellow-500">⚠ Expires in</span>
                          <span className="text-yellow-400 font-semibold">{preview.daysUntilExpiry}d</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Process button */}
                  <button
                    onClick={handleProcess}
                    disabled={isPending || !canProcess}
                    className="w-full py-4 rounded-xl text-sm sm:text-base font-bold transition-all active:scale-[0.98] mt-1"
                    style={{
                      background: canProcess ? "linear-gradient(135deg,#D4A843,#F5D078)" : "#1E2D4A",
                      color:      canProcess ? "#0A0F1E" : "#475569",
                      cursor:     isPending || !canProcess ? "not-allowed" : "pointer",
                    }}
                  >
                    {isPending
                      ? "Processing…"
                      : canProcess
                      ? `✓ Complete Transaction  ${sym}${localCalc.netAmount.toFixed(2)}`
                      : disabledReason}
                  </button>
                </div>
              )}
            </div>

            {/* Last receipt */}
            {lastBill && (
              <div className="bg-[#0F1729] rounded-2xl p-5" style={{ border: "1px solid rgba(34,197,94,0.35)" }}>
                <p className="text-sm font-bold text-green-400 mb-4">✓ Bill Processed!</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Charged</span><span>{sym}{Number(lastBill.net_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Discount</span><span className="text-blue-400">−{sym}{Number(lastBill.redemption_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Cashback</span><span className="text-green-400">+{sym}{Number(lastBill.cashback_earned).toFixed(2)}</span></div>
                </div>
                <button onClick={() => setLastBill(null)}
                  className="mt-4 w-full py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 border border-[#1E2D4A]">
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showReg && (
        <RegisterModal initialQuery={query} sym={sym} joiningBonus={config.joining_bonus}
          onClose={() => setShowReg(false)}
          onSuccess={(p) => { selectCustomer(p); setShowReg(false); showToast(`${p.full_name ?? p.username} registered! ${sym}${config.joining_bonus} bonus credited.`); }} />
      )}
      {resetTarget && (
        <ResetPwdModal customer={resetTarget} onClose={() => setResetTarget(null)}
          onSuccess={() => { showToast(`Password reset for ${resetTarget.full_name ?? resetTarget.username}`); setResetTarget(null); }} />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
