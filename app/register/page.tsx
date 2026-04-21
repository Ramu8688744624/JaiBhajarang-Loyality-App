"use client";
// app/register/page.tsx  ─ EMAIL-AUTH FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Public Registration
// Primary auth: email + password
// Phone: collected for business records (not used for auth)
// Referral: captured from ?ref=CODE in the URL
// ══════════════════════════════════════════════════════════════

import {
  useState, useTransition, useEffect, Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link                           from "next/link";
import { registerCustomer }           from "@/lib/actions/auth";
import { getShopSettings }            from "@/lib/actions/settings";

// ─── Inner form (needs useSearchParams → must be in Suspense) ─

function RegisterForm() {
  const params      = useSearchParams();
  const router      = useRouter();
  const [isPending, startTransition] = useTransition();

  const [settings,   setSettings]   = useState<any>(null);
  const [fullName,   setFullName]   = useState("");
  const [email,      setEmail]      = useState("");
  const [phone,      setPhone]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [refCode,    setRefCode]    = useState(params.get("ref") ?? "");
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(false);
  const [bonusMsg,   setBonusMsg]   = useState("");

  useEffect(() => {
    getShopSettings().then((s) => setSettings(s));
  }, []);

  const sym          = settings?.currency_symbol ?? "₹";
  const joiningBonus = settings?.joining_bonus   ?? 500;
  const refBonus     = settings?.referral_bonus  ?? 200;
  const strength     = pwStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim())             { setError("Full name is required.");            return; }
    if (!email.trim().includes("@"))  { setError("A valid email address is required."); return; }
    if (password.length < 6)          { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)         { setError("Passwords do not match.");           return; }

    startTransition(async () => {
      const res = await registerCustomer({
        fullName: fullName.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone.trim(),
        password,
        referralCode: refCode.trim() || undefined,
      });

      if (!res.success) { setError(res.error ?? "Registration failed."); return; }

      setBonusMsg(
        refCode.trim()
          ? `${sym}${joiningBonus} joining bonus credited! Your referrer earns ${sym}${refBonus} after your first purchase.`
          : `${sym}${joiningBonus} joining bonus has been credited to your wallet!`
      );
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2600);
    });
  };

  // ── Success screen ──────────────────────────────────────────
  if (done) {
    return (
      <div className="text-center py-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5"
          style={{ background: "rgba(34,197,94,0.15)", border: "2px solid #22C55E" }}
        >
          🎉
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Welcome aboard!</h2>
        <p className="text-slate-400 text-sm mb-1">{bonusMsg}</p>
        <p className="text-slate-600 text-xs mt-3">Redirecting to your dashboard…</p>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {/* Joining bonus banner */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: "rgba(212,168,67,0.08)",
          border:     "1px solid rgba(212,168,67,0.22)",
        }}
      >
        <span className="text-2xl flex-shrink-0">🎁</span>
        <div>
          <p className="text-sm font-bold" style={{ color: "#D4A843" }}>
            {sym}{joiningBonus} joining bonus on signup
          </p>
          {refCode && (
            <p className="text-xs text-slate-400 mt-0.5">
              Referred by a friend · your referrer earns {sym}{refBonus} when you make your first purchase
            </p>
          )}
        </div>
      </div>

      {/* Full Name */}
      <Field label="Full Name">
        <input
          autoFocus
          className={inputCls}
          placeholder="Ramesh Kumar"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setError(""); }}
        />
      </Field>

      {/* Email */}
      <Field label="Email Address">
        <input
          type="email"
          autoComplete="email"
          className={inputCls}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
        />
      </Field>

      {/* Phone — business record, not required for auth */}
      <Field label="Phone Number (optional)">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none select-none">
            +91
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            className={`${inputCls} pl-12`}
            placeholder="98765 43210"
            value={phone}
            maxLength={10}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setError("");
            }}
          />
        </div>
      </Field>

      {/* Password */}
      <Field label="Password">
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            className={`${inputCls} pr-12`}
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>
        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: strength >= l ? strengthColor(strength) : "#1E2D4A",
                  }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: strengthColor(strength) }}>
              {["", "Weak", "Fair", "Good", "Strong"][strength]}
            </p>
          </div>
        )}
      </Field>

      {/* Confirm password */}
      <Field label="Confirm Password">
        <input
          type="password"
          autoComplete="new-password"
          className={`${inputCls} ${
            confirm && confirm !== password
              ? "border-red-700 focus:border-red-500"
              : confirm && confirm === password
              ? "border-green-700 focus:border-green-600"
              : ""
          }`}
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(""); }}
        />
        {confirm && confirm !== password && (
          <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
        )}
      </Field>

      {/* Referral code */}
      <Field label="Referral Code (optional)">
        <input
          className={inputCls}
          placeholder="e.g. JB-AB12"
          value={refCode}
          onChange={(e) => {
            setRefCode(e.target.value.toUpperCase());
            setError("");
          }}
        />
      </Field>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
          <span className="text-red-400 text-sm flex-shrink-0 mt-px">⚠</span>
          <p className="text-red-300 text-sm leading-snug">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || password !== confirm || password.length < 6}
        className="w-full py-4 rounded-xl text-base font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}
      >
        {isPending ? <Spinner label="Creating account…" /> : "Create Account"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-[#D4A843] hover:text-[#F5D078] transition-colors">
          Sign In
        </Link>
      </p>
    </form>
  );
}

// ─── Page shell ───────────────────────────────────────────────

export default function RegisterPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: `
          radial-gradient(ellipse 90% 60% at 15% 0%,  rgba(27,58,107,0.5)  0%, transparent 65%),
          radial-gradient(ellipse 70% 50% at 85% 100%, rgba(212,168,67,0.07) 0%, transparent 55%),
          #0A0F1E
        `,
      }}
    >
      <div className="mb-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-2xl"
          style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
        >
          📱
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Jai Bajrang Mobiles
        </h1>
        <p className="text-slate-400 text-sm mt-1">Create your loyalty account</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-6">Sign Up</h2>
          <Suspense
            fallback={
              <p className="text-slate-500 text-sm text-center py-6">Loading…</p>
            }
          >
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// ─── Shared atoms ─────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3.5 text-base " +
  "text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 " +
  "focus:ring-2 focus:ring-[#D4A843]/20 transition-all";

function pwStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6)               s++;
  if (pw.length >= 9)               s++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

function strengthColor(s: number): string {
  return (["", "#EF4444", "#F59E0B", "#22C55E", "#D4A843"] as const)[s];
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {label}
    </span>
  );
}
