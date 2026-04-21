"use client";
// app/reset-password/page.tsx  ─ EMAIL RESET FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Reset Password
//
// Supabase embeds the token in the URL hash as:
//   /reset-password#access_token=XXX&type=recovery
//
// This page reads it from window.location.hash on mount,
// calls resetPassword() server action, then redirects.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useTransition } from "react";
import { useRouter }                           from "next/navigation";
import Link                                    from "next/link";
import { resetPassword }                       from "@/lib/actions/auth";

export default function ResetPasswordPage() {
  const [accessToken,  setAccessToken]  = useState("");
  const [tokenReady,   setTokenReady]   = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [error,        setError]        = useState("");
  const [done,         setDone]         = useState(false);
  const [isPending,    startTransition] = useTransition();
  const router = useRouter();

  // Parse the access_token from the URL hash on the client side.
  // Supabase puts it there after the user clicks the reset email link.
  useEffect(() => {
    const hash   = window.location.hash.slice(1);          // strip #
    const params = new URLSearchParams(hash);
    const token  = params.get("access_token");
    const type   = params.get("type");

    if (token && type === "recovery") {
      setAccessToken(token);
      setTokenReady(true);
      // Clean the token from the URL bar (cosmetic)
      window.history.replaceState({}, "", "/reset-password");
    } else {
      setTokenMissing(true);
    }
  }, []);

  const strength = pwStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6)    { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm)   { setError("Passwords do not match."); return; }
    if (!accessToken)           { setError("Reset token not found. Please use the link from your email."); return; }

    startTransition(async () => {
      const res = await resetPassword(password, accessToken);
      if (!res.success) { setError(res.error ?? "Reset failed."); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    });
  };

  // ── Done screen ────────────────────────────────────────────
  if (done) {
    return (
      <Shell>
        <div className="text-center py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: "rgba(34,197,94,0.12)", border: "2px solid #22C55E" }}
          >
            ✓
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Password updated!</h2>
          <p className="text-slate-400 text-sm">Redirecting you to login…</p>
        </div>
      </Shell>
    );
  }

  // ── Token missing screen ───────────────────────────────────
  if (tokenMissing) {
    return (
      <Shell>
        <div className="text-center py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: "rgba(239,68,68,0.12)", border: "2px solid #EF4444" }}
          >
            ⚠️
          </div>
          <h2 className="text-base font-bold text-white mb-2">Link expired or invalid</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            This reset link has expired or has already been used.
            Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold text-[#0A0F1E] transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}
          >
            Request New Reset Link
          </Link>
        </div>
      </Shell>
    );
  }

  // ── Loading token ──────────────────────────────────────────
  if (!tokenReady) {
    return (
      <Shell>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Verifying reset link…</p>
        </div>
      </Shell>
    );
  }

  // ── Reset form ─────────────────────────────────────────────
  return (
    <Shell>
      <h2 className="text-base font-bold text-white mb-1">Set a new password</h2>
      <p className="text-slate-400 text-sm mb-6">
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* New password */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              autoFocus
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
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            className={`${inputCls} ${
              confirm && confirm !== password
                ? "border-red-700"
                : confirm && confirm === password
                ? "border-green-700"
                : ""
            }`}
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          />
          {confirm && confirm !== password && (
            <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
            <span className="text-red-400 text-sm flex-shrink-0 mt-px">⚠</span>
            <p className="text-red-300 text-sm leading-snug">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            isPending ||
            password.length < 6 ||
            password !== confirm
          }
          className="w-full py-4 rounded-xl text-base font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}
        >
          {isPending ? <Spinner label="Updating…" /> : "Update Password"}
        </button>
      </form>
    </Shell>
  );
}

// ─── Layout shell (shared across all states) ──────────────────

function Shell({ children }: { children: React.ReactNode }) {
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
          🔑
        </div>
        <h1 className="text-2xl font-bold text-white">New Password</h1>
        <p className="text-slate-400 text-sm mt-1">Jai Bajrang Mobiles</p>
      </div>
      <div className="w-full max-w-sm">
        <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-8 shadow-2xl">
          {children}
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

function pwStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6)                        s++;
  if (pw.length >= 9)                        s++;
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
