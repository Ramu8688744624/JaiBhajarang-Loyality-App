"use client";
// app/admin/settings/page.tsx
// ─────────────────────────────────────────────────────────────
// Admin Settings — The "Business OS" panel
// Blue/Gold theme, fully responsive
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useTransition } from "react";
import {
  getShopSettings,
  updateShopSettings,
  getMilestones,
  upsertMilestone,
  deleteMilestone,
  getGiftTiers,
  upsertGiftTier,
  upsertGiftItem,
  type ShopSettings,
} from "@/lib/actions/settings";
import MilestoneGiftSettings from "@/components/admin/MilestoneGiftSettings";
import { getMilestoneSettings, getSpendRanges } from "@/lib/actions/gifts";

// ─── Toast ────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium pointer-events-auto transition-all
      ${type === "success" ? "bg-green-900/90 text-green-300 border border-green-700/50" : "bg-red-900/90 text-red-300 border border-red-700/50"}`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {msg}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1E2D4A] flex items-center gap-3"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.5),rgba(15,23,41,0.5))" }}>
        <span className="text-xl">{icon}</span>
        <h2 className="text-[#D4A843] font-bold text-sm tracking-wide uppercase">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#D4A843]/60 focus:ring-1 focus:ring-[#D4A843]/30 transition-all";

const btnPrimary =
  "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0A0F1E] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

// ─── Main Page ────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [giftTiers, setGiftTiers] = useState<any[]>([]);
  const [milestoneSettings, setMilestoneSettings] = useState<any[]>([]);
  const [spendRanges, setSpendRanges] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string>("shop");

  // Form states
  // Updated Form states
  const [form, setForm] = useState({
    shop_name: "",
    shop_logo_url: "",
    joining_bonus: "500",
    default_redemption_pct: "5",
    default_cashback_pct: "3",
    currency_symbol: "₹",
    // New Fields
    referral_bonus: "200",
    referral_per_visit_limit: "100",
    referral_usage_count_limit: "2",
    min_bill_for_referral: "500",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function load() {
      const [s, m, g, ms, sr] = await Promise.all([
        getShopSettings(),
        getMilestones(),
        getGiftTiers(),
        getMilestoneSettings(),
        getSpendRanges(),
      ]);
      if (s) {
        setSettings(s);
        setForm({
          shop_name: s.shop_name,
          shop_logo_url: s.shop_logo_url ?? "",
          joining_bonus: String(s.joining_bonus),
          default_redemption_pct: String(s.default_redemption_pct),
          default_cashback_pct: String(s.default_cashback_pct),
          currency_symbol: s.currency_symbol,
          // New Fields from database
          referral_bonus: String(s.referral_bonus ?? "200"),
          referral_per_visit_limit: String(s.referral_per_visit_limit ?? "100"),
          referral_usage_count_limit: String(s.referral_usage_count_limit ?? "2"),
          min_bill_for_referral: String(s.min_bill_for_referral ?? "500"),
        });
      }
      setMilestones(m);
      setGiftTiers(g);
      setMilestoneSettings(ms);
      setSpendRanges(sr);
    }
    load();
  }, []);
  const handleSaveSettings = () => {
    startTransition(async () => {
      const res = await updateShopSettings({
        shop_name: form.shop_name,
        shop_logo_url: form.shop_logo_url || null,
        joining_bonus: parseFloat(form.joining_bonus),
        default_redemption_pct: parseFloat(form.default_redemption_pct),
        default_cashback_pct: parseFloat(form.default_cashback_pct),
        currency_symbol: form.currency_symbol,
        // New Fields
        referral_bonus: parseFloat(form.referral_bonus),
        referral_per_visit_limit: parseFloat(form.referral_per_visit_limit),
        referral_usage_count_limit: parseInt(form.referral_usage_count_limit),
        min_bill_for_referral: parseFloat(form.min_bill_for_referral),
      });
      if (res.success) showToast("Settings saved successfully!");
      else showToast(res.error ?? "Failed to save", "error");
    });
  };

  const navSections = [
    { id: "shop", label: "Shop Identity", icon: "🏪" },
    { id: "loyalty", label: "Loyalty Rules", icon: "💰" },
    { id: "milestones", label: "Milestones", icon: "🎯" },
    { id: "gifts", label: "Gift Tiers", icon: "🎁" },
  ];

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="border-b border-[#1E2D4A] px-4 py-5"
        style={{ background: "linear-gradient(135deg,rgba(27,58,107,0.6),rgba(10,15,30,0.8))" }}>
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Business Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure all shop rules — changes apply instantly across the app</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6 flex-col md:flex-row">

          {/* Sidebar nav */}
          <aside className="md:w-48 flex-shrink-0">
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl overflow-hidden sticky top-20">
              {navSections.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-b border-[#1E2D4A] last:border-0
                    ${activeSection === s.id ? "text-[#D4A843] bg-[#D4A843]/10" : "text-slate-400 hover:text-[#D4A843] hover:bg-[#D4A843]/5"}`}>
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 space-y-6">

            {/* ── Shop Identity ── */}
            {activeSection === "shop" && (
              <SectionCard title="Shop Identity" icon="🏪">
                <div className="space-y-4">
                  <Field label="Shop Name" hint="Appears in the Navbar, emails, and receipts">
                    <input className={inputCls} value={form.shop_name}
                      onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
                  </Field>
                  <Field label="Logo URL" hint="Paste a direct image URL or Supabase Storage URL">
                    <input className={inputCls} value={form.shop_logo_url} placeholder="https://..."
                      onChange={(e) => setForm({ ...form, shop_logo_url: e.target.value })} />
                    {form.shop_logo_url && (
                      <img src={form.shop_logo_url} alt="logo preview"
                        className="mt-3 h-16 w-16 rounded-xl object-cover border border-[#1E2D4A]" />
                    )}
                  </Field>
                  <Field label="Currency Symbol">
                    <input className={`${inputCls} w-24`} value={form.currency_symbol} maxLength={3}
                      onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
                  </Field>
                  <div className="pt-2">
                    <button onClick={handleSaveSettings} disabled={isPending}
                      className={btnPrimary}
                      style={{ background: isPending ? "#64748B" : "linear-gradient(135deg,#D4A843,#F5D078)" }}>
                      {isPending ? "Saving…" : "💾 Save Changes"}
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── Loyalty Rules ── */}
            {activeSection === "loyalty" && (
              <SectionCard title="Loyalty Rules" icon="💰">
                <div className="space-y-6">
                  
                  {/* Row 1: Signup & Referrals */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Joining Bonus" hint="Auto-credit on registration">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4A843] font-bold text-sm">{form.currency_symbol}</span>
                        <input type="number" className={`${inputCls} pl-8`} value={form.joining_bonus}
                          onChange={(e) => setForm({ ...form, joining_bonus: e.target.value })} />
                      </div>
                    </Field>

                    <Field label="Referral Bonus" hint="Credit to referrer when friend joins">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4A843] font-bold text-sm">{form.currency_symbol}</span>
                        <input type="number" className={`${inputCls} pl-8`} value={form.referral_bonus}
                          onChange={(e) => setForm({ ...form, referral_bonus: e.target.value })} />
                      </div>
                    </Field>
                  </div>

                  {/* Referral Usage Controls (The New Logic) */}
                  <div className="bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl p-5 space-y-4">
                    <h3 className="text-[#D4A843] text-xs font-bold uppercase tracking-widest">Referral Wallet Controls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Field label="Max Spend / Visit" hint="e.g. ₹100 cap per bill">
                        <input type="number" className={inputCls} value={form.referral_per_visit_limit}
                          onChange={(e) => setForm({ ...form, referral_per_visit_limit: e.target.value })} />
                      </Field>
                      <Field label="Visits Per Referral" hint="Installments per friend">
                        <input type="number" className={inputCls} value={form.referral_usage_count_limit}
                          onChange={(e) => setForm({ ...form, referral_usage_count_limit: e.target.value })} />
                      </Field>
                      <Field label="Min Bill to Use" hint="Bill must exceed this">
                        <input type="number" className={inputCls} value={form.min_bill_for_referral}
                          onChange={(e) => setForm({ ...form, min_bill_for_referral: e.target.value })} />
                      </Field>
                    </div>
                  </div>

                  {/* Standard Sliders */}
                  <Field label="Default Redemption %" hint="% suggested as discount by default.">
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="100" step="1" value={form.default_redemption_pct}
                        onChange={(e) => setForm({ ...form, default_redemption_pct: e.target.value })}
                        className="flex-1 accent-[#2563EB]" />
                      <div className="w-16 text-center bg-[#0A0F1E] border border-[#1E2D4A] rounded-lg py-1.5 text-sm font-bold text-[#2563EB]">
                        {form.default_redemption_pct}%
                      </div>
                    </div>
                  </Field>

                  <Field label="Default Cashback %" hint="% credited back to wallet after purchase">
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="30" step="0.5" value={form.default_cashback_pct}
                        onChange={(e) => setForm({ ...form, default_cashback_pct: e.target.value })}
                        className="flex-1 accent-[#22C55E]" />
                      <div className="w-16 text-center bg-[#0A0F1E] border border-[#1E2D4A] rounded-lg py-1.5 text-sm font-bold text-[#22C55E]">
                        {form.default_cashback_pct}%
                      </div>
                    </div>
                  </Field>

                  <div className="pt-2">
                    <button onClick={handleSaveSettings} disabled={isPending}
                      className={btnPrimary}
                      style={{ background: isPending ? "#64748B" : "linear-gradient(135deg,#D4A843,#F5D078)" }}>
                      {isPending ? "Saving…" : "💾 Save Loyalty Rules"}
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}
            {/* ── Milestones & Gifts (Unified) ── */}
            {(activeSection === "milestones" || activeSection === "gifts") && (
              <MilestoneGiftSettings
                milestones={milestoneSettings}
                ranges={spendRanges}
              />
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
