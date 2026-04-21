"use client";
// app/forgot-password/page.tsx  ─ EMAIL RESET FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Forgot Password
// Flow: enter email → Supabase sends reset link → user clicks
//       link → lands on /reset-password with token in URL hash
// No OTP, no Twilio. Pure Supabase email.
// ══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import Link                        from "next/link";
import { forgotPassword }          from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim().includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    startTransition(async () => {
      await forgotPassword(email.trim().toLowerCase());
      // Always show the success screen regardless of whether the
      // email exists — prevents account enumeration.
      setSent(true);
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: `
          radial-gradient(ellipse 90% 60% at 15% 0%, rgba(27,58,107,0.55) 0%, transparent 65%),
          #0A0F1E
        `,
      }}
    >
      <div className="mb-9 text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
          style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
        >
          🔐
        </div>
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-slate-400 text-sm mt-1">Jai Bajrang Mobiles</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-8 shadow-2xl">

          {!sent ? (
            <>
              <h2 className="text-base font-bold text-white mb-1">Forgot your password?</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your registered email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    autoFocus
                    autoComplete="email"
                    className={inputCls}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  />
                </div>

                {error && <ErrBox msg={error} />}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-4 rounded-xl text-base font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}
                >
                  {isPending ? <Spinner label="Sending…" /> : "Send Reset Link"}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Back to login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            // Success state
            <div className="text-center py-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-5"
                style={{ background: "rgba(34,197,94,0.12)", border: "2px solid #22C55E" }}
              >
                ✉️
              </div>
              <h2 className="text-base font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-2">
                If <span className="text-[#D4A843]">{email}</span> is registered, a password
                reset link has been sent.
              </p>
              <p className="text-slate-600 text-xs">
                Check your spam folder if you don't see it within a minute.
              </p>
              <div className="mt-6">
                <Link
                  href="/login"
                  className="text-sm text-[#D4A843] hover:text-[#F5D078] transition-colors"
                >
                  ← Back to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3.5 text-base " +
  "text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 " +
  "focus:ring-2 focus:ring-[#D4A843]/20 transition-all";

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
      <span className="text-red-400 text-sm flex-shrink-0 mt-px">⚠</span>
      <p className="text-red-300 text-sm leading-snug">{msg}</p>
    </div>
  );
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
