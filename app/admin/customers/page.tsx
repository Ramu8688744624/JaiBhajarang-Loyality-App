"use client";
// app/admin/customers/page.tsx
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Customer Management
// Lists all customers with search, wallet balance, visit count.
// Inline: reset password, promote to admin.
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useTransition, useCallback } from "react";
import { getAllUsers, type CustomerRow }   from "@/lib/actions/billing";
import { adminResetPassword, setUserRole } from "@/lib/actions/auth";

// ══════════════════════════════════════════════════════════════
// TINY SHARED ATOMS
// ══════════════════════════════════════════════════════════════

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3 text-sm " +
  "text-white placeholder-slate-700 focus:outline-none " +
  "focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all";

function Toast({
  msg, type, onClose,
}: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3
        rounded-xl shadow-2xl text-sm font-medium max-w-sm pointer-events-auto
        ${type === "success"
          ? "bg-green-900/95 text-green-300 border border-green-700/50"
          : "bg-red-900/95 text-red-300 border border-red-700/50"}`}
    >
      <span className="flex-shrink-0">{type === "success" ? "✓" : "⚠"}</span>
      <span>{msg}</span>
      <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

function Overlay({
  onClose, children,
}: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-4 py-3">
      <span className="text-red-400 text-sm flex-shrink-0 mt-px">⚠</span>
      <p className="text-red-300 text-sm leading-snug">{msg}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "#D4A843" },
    admin:       { label: "Staff",       color: "#60A5FA" },
    customer:    { label: "Customer",    color: "#64748B" },
  };
  const c = map[role] ?? map.customer;
  return (
    <span
      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
      style={{
        background: `${c.color}20`,
        color:       c.color,
        border:     `1px solid ${c.color}44`,
      }}
    >
      {c.label}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
// RESET PASSWORD MODAL
// ══════════════════════════════════════════════════════════════

function ResetPasswordModal({
  customer, onClose, onSuccess,
}: { customer: CustomerRow; onClose: () => void; onSuccess: () => void }) {
  const [pw,  setPw]  = useState("");
  const [err, setErr] = useState("");
  const [pending, sp] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setErr("Minimum 6 characters."); return; }
    setErr("");
    sp(async () => {
      const res = await adminResetPassword(customer.id, pw);
      if (!res.success) { setErr(res.error ?? "Reset failed."); return; }
      onSuccess();
    });
  };

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
      <p className="text-sm text-slate-400 mb-5">
        {customer.full_name ?? customer.username}
        {customer.email && (
          <span className="block text-xs text-slate-600 mt-0.5">{customer.email}</span>
        )}
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          autoFocus
          placeholder="New password (min 6 characters)"
          className={inputCls}
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(""); }}
        />
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}
          >
            {pending ? "Resetting…" : "Reset Password"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ══════════════════════════════════════════════════════════════
// CHANGE ROLE MODAL
// ══════════════════════════════════════════════════════════════

function ChangeRoleModal({
  customer, onClose, onSuccess,
}: {
  customer:  CustomerRow;
  onClose:   () => void;
  onSuccess: (newRole: string) => void;
}) {
  const [role, setRole]   = useState(customer.role);
  const [err,  setErr]    = useState("");
  const [pending, sp]     = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === customer.role) { onClose(); return; }
    sp(async () => {
      const res = await setUserRole(customer.id, role as any);
      if (!res.success) { setErr(res.error ?? "Failed."); return; }
      onSuccess(role);
    });
  };

  const options = [
    { value: "customer",    label: "Customer",    desc: "Loyalty dashboard only" },
    { value: "admin",       label: "Staff Admin", desc: "Billing terminal + customer search" },
    { value: "super_admin", label: "Super Admin", desc: "Full access including analytics" },
  ];

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-white mb-1">Change Role</h3>
      <p className="text-sm text-slate-400 mb-5">
        {customer.full_name ?? customer.username}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              role === o.value
                ? "border-[#D4A843]/60 bg-[#D4A843]/8"
                : "border-[#1E2D4A] hover:border-[#2D3F5E]"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={o.value}
              checked={role === o.value}
              onChange={() => setRole(o.value)}
              className="mt-0.5 accent-[#D4A843]"
            />
            <div>
              <p className="text-sm font-semibold text-slate-200">{o.label}</p>
              <p className="text-xs text-slate-500">{o.desc}</p>
            </div>
          </label>
        ))}
        {err && <ErrBox msg={err} />}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-[#0A0F1E] transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}
          >
            {pending ? "Saving…" : "Save Role"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-sm text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </Overlay>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════

export default function CustomersPage() {
  const [customers,  setCustomers]  = useState<CustomerRow[]>([]);
  const [query,      setQuery]      = useState("");
  const [loading,    setLoading]    = useState(true);
  const [resetTarget,  setResetTarget]  = useState<CustomerRow | null>(null);
  const [roleTarget,   setRoleTarget]   = useState<CustomerRow | null>(null);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback(
    (msg: string, type: "success" | "error" = "success") =>
      setToast({ msg, type }),
    []
  );

  // Initial load
  useEffect(() => {
    getAllUsers().then((rows) => {
      setCustomers(rows);
      setLoading(false);
    });
  }, []);

  // Live search with 300 ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      getAllUsers(query || undefined).then(setCustomers);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const sym = "₹";

  // Stats bar
  const totalWallet  = customers.reduce((s, c) => s + c.wallet_balance, 0);
  const totalSpent   = customers.reduce((s, c) => s + c.total_spent,    0);
  const customerOnly = customers.filter((c) => c.role === "customer");

  return (
    <div className="min-h-screen pb-16">

      {/* ── Page header ─────────────────────────────────────── */}
      <div
        className="border-b border-[#1E2D4A] px-4 py-5"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.6),rgba(10,15,30,0.8))" }}
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Customers</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your registered customers, wallets, and roles
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* ── Stats row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Customers", value: customerOnly.length.toString(),                     color: "#2563EB", icon: "👥" },
            { label: "Active (searched)", value: customers.filter(c => c.visit_count > 0).length.toString(), color: "#22C55E", icon: "✅" },
            { label: "Wallet Liabilities", value: `${sym}${totalWallet.toFixed(0)}`,               color: "#EF4444", icon: "💼" },
            { label: "Total Revenue",      value: `${sym}${totalSpent.toFixed(0)}`,                color: "#D4A843", icon: "💰" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-4 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: `${s.color}18` }}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-slate-500 leading-none mb-1">{s.label}</p>
                <p className="text-lg font-black leading-none" style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search bar ──────────────────────────────────────── */}
        <div className="relative max-w-lg">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            🔍
          </span>
          <input
            type="search"
            className="w-full bg-[#0F1729] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#D4A843]/50 transition-all"
            placeholder="Search by name, email or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* ── Loading ─────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── Desktop table ───────────────────────────────────── */}
        {!loading && (
          <>
            <div className="hidden md:block bg-[#0F1729] border border-[#1E2D4A] rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ background: "rgba(27,58,107,0.4)" }}>
                    {["Customer", "Email / Phone", "Role", "Wallet", "Spent", "Visits", "Referrals", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c.id}
                      className={`border-t border-[#1E2D4A] hover:bg-white/[0.015] transition-colors ${
                        i % 2 === 1 ? "bg-white/[0.008]" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: "rgba(212,168,67,0.15)", color: "#D4A843" }}
                          >
                            {(c.full_name ?? c.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200 leading-none">
                              {c.full_name ?? c.username}
                            </p>
                            {c.referral_code && (
                              <p className="text-xs text-slate-600 mt-0.5">{c.referral_code}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Email / Phone */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-300">{c.email ?? "—"}</p>
                        <p className="text-xs text-slate-600">{c.phone ?? "—"}</p>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={c.role} />
                      </td>
                      {/* Wallet */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold" style={{ color: "#D4A843" }}>
                          {sym}{c.wallet_balance.toFixed(2)}
                        </span>
                      </td>
                      {/* Spent */}
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {sym}{c.total_spent.toFixed(0)}
                      </td>
                      {/* Visits */}
                      <td className="px-4 py-3 text-sm text-slate-300">{c.visit_count}</td>
                      {/* Referrals */}
                      <td className="px-4 py-3 text-sm text-slate-300">{c.total_referrals}</td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRoleTarget(c)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all"
                          >
                            👑 Role
                          </button>
                          <button
                            onClick={() => setResetTarget(c)}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all"
                          >
                            🔑 Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {customers.length === 0 && (
                <div className="text-center py-14">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-slate-400 text-sm">
                    {query ? "No customers match your search." : "No customers yet."}
                  </p>
                </div>
              )}
            </div>

            {/* ── Mobile card list ──────────────────────────────── */}
            <div className="md:hidden space-y-3">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl overflow-hidden"
                >
                  {/* Summary row — always visible */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-4 text-left"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                      style={{ background: "rgba(212,168,67,0.15)", color: "#D4A843" }}
                    >
                      {(c.full_name ?? c.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {c.full_name ?? c.username}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{c.email ?? c.phone ?? "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-black" style={{ color: "#D4A843" }}>
                        {sym}{c.wallet_balance.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-500">{c.visit_count} visits</p>
                    </div>
                    <span className="text-slate-600 ml-1 text-sm">
                      {expandedId === c.id ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {expandedId === c.id && (
                    <div className="border-t border-[#1E2D4A] px-4 py-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: "Role",       value: <RoleBadge role={c.role} /> },
                          { label: "Phone",      value: c.phone ?? "—" },
                          { label: "Total Spent",value: `${sym}${c.total_spent.toFixed(0)}` },
                          { label: "Referrals",  value: String(c.total_referrals) },
                          { label: "Ref. Code",  value: c.referral_code ?? "—" },
                          { label: "Joined",     value: c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "—" },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-slate-600 mb-0.5">{item.label}</p>
                            <div className="text-slate-300">{item.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setRoleTarget(c)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all"
                        >
                          👑 Change Role
                        </button>
                        <button
                          onClick={() => setResetTarget(c)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all"
                        >
                          🔑 Reset Password
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {customers.length === 0 && (
                <div className="text-center py-14">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-slate-400 text-sm">
                    {query ? "No customers match your search." : "No customers yet."}
                  </p>
                </div>
              )}
            </div>

            {/* Row count */}
            <p className="text-xs text-slate-600 text-right">
              Showing {customers.length} user{customers.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {resetTarget && (
        <ResetPasswordModal
          customer={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={() => {
            showToast(`Password reset for ${resetTarget.full_name ?? resetTarget.username}`);
            setResetTarget(null);
          }}
        />
      )}

      {roleTarget && (
        <ChangeRoleModal
          customer={roleTarget}
          onClose={() => setRoleTarget(null)}
          onSuccess={(newRole) => {
            setCustomers((prev) =>
              prev.map((c) => (c.id === roleTarget.id ? { ...c, role: newRole } : c))
            );
            showToast(`Role updated to ${newRole}`);
            setRoleTarget(null);
          }}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
