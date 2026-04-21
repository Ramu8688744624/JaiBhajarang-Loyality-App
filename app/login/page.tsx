"use client";
// app/login/page.tsx  ─ EMAIL/PASSWORD FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Login Page
// Auth: email + password. No OTP, no Twilio.
// ══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { login }                   from "@/lib/actions/auth";

export default function LoginPage() {
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [error,       setError]       = useState("");
  const [isPending,   startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim())    { setError("Email is required.");    return; }
    if (!password)        { setError("Password is required."); return; }

    startTransition(async () => {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setError(res.error ?? "Login failed.");
        return;
      }
      router.push(res.data!.redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: `
          radial-gradient(ellipse 90% 60% at 15% 0%,  rgba(27,58,107,0.55) 0%, transparent 65%),
          radial-gradient(ellipse 70% 50% at 85% 100%, rgba(212,168,67,0.08) 0%, transparent 55%),
          #0A0F1E
        `,
      }}
    >
      {/* Brand */}
      <div className="mb-9 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-2xl"
          style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
        >
          📱
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Jai Bajrang Mobiles
        </h1>
        <p className="text-slate-400 text-sm mt-1">Karimnagar · Loyalty Rewards</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-7">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                className={inputCls}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${inputCls} pr-12`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
                <span className="text-red-400 text-sm flex-shrink-0 mt-px">⚠</span>
                <p className="text-red-300 text-sm leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-xl text-base font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isPending
                  ? "#334155"
                  : "linear-gradient(135deg,#D4A843,#F5D078)",
              }}
            >
              {isPending ? <Spinner label="Signing in…" /> : "Sign In"}
            </button>
          </form>

          {/* Forgot password */}
          <div className="mt-5 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-[#D4A843] hover:text-[#F5D078] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Register link */}
        <p className="text-center text-xs text-slate-600 mt-5">
          New customer?{" "}
          <Link href="/register" className="text-[#D4A843] hover:text-[#F5D078] transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Shared atoms ─────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3.5 text-base " +
  "text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 " +
  "focus:ring-2 focus:ring-[#D4A843]/20 transition-all";

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="animate-spin h-4 w-4 text-[#0A0F1E]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {label}
    </span>
  );
}
