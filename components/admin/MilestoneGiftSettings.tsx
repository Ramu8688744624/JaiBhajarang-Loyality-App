"use client";
// components/admin/MilestoneGiftSettings.tsx
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Admin: Milestone + Spend Range + Gift CRUD
//
// Three collapsible sections:
//   1. Visit Milestones  — create/edit/delete milestone_settings rows
//   2. Spend Ranges      — create/edit/delete spend_ranges rows
//                          with overlap validation in-form
//   3. Range Gifts       — add/edit/delete range_gifts per range
//
// Usage in settings/page.tsx (server component):
//   const milestones = await getMilestoneSettings();
//   const ranges     = await getSpendRanges();
//   <MilestoneGiftSettings milestones={milestones} ranges={ranges} />
// ══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import {
  upsertMilestoneSetting, deleteMilestoneSetting,
  upsertSpendRange, deleteSpendRange,
  upsertRangeGift, deleteRangeGift,
  type MilestoneSetting, type SpendRange, type RangeGift,
} from "@/lib/actions/gifts";

// ─── Shared atoms ─────────────────────────────────────────────

const inputCls =
  "w-full bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-3 py-2.5 text-sm " +
  "text-white placeholder-slate-700 focus:outline-none focus:border-[#D4A843]/60 " +
  "focus:ring-1 focus:ring-[#D4A843]/30 transition-all";

function ErrBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/50 rounded-xl px-3 py-2 text-xs text-red-300">
      <span>⚠</span>{msg}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-slate-200">{title}</span>
        </div>
        <span className="text-slate-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="border-t border-[#1E2D4A] p-5 space-y-4">{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Section 1: Milestone Settings
// ══════════════════════════════════════════════════════════════

function MilestoneSection({ initial }: { initial: MilestoneSetting[] }) {
  const [items,    setItems]    = useState<MilestoneSetting[]>(initial);
  const [editing,  setEditing]  = useState<Partial<MilestoneSetting> | null>(null);
  const [err,      setErr]      = useState("");
  const [isPending, sp]         = useTransition();

  const save = () => {
    if (!editing) return;
    const vc = Math.floor(Number(editing.visit_count ?? 0));
    const lb = String(editing.label ?? "").trim();
    if (vc < 1)  { setErr("Visit count must be at least 1."); return; }
    if (!lb)     { setErr("Label is required."); return; }
    setErr("");
    sp(async () => {
      const res = await upsertMilestoneSetting({
        id:          editing.id,
        visit_count: vc,
        label:       lb,
        is_active:   editing.is_active ?? true,
      });
      if (!res.success) { setErr(res.error ?? "Save failed."); return; }
      // Refresh list optimistically
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === editing.id);
        const next = { ...editing, visit_count: vc, label: lb } as MilestoneSetting;
        return idx >= 0
          ? [...prev.slice(0, idx), next, ...prev.slice(idx + 1)]
          : [...prev, next].sort((a, b) => a.visit_count - b.visit_count);
      });
      setEditing(null);
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this milestone? Existing claims will remain.")) return;
    sp(async () => {
      const res = await deleteMilestoneSetting(id);
      if (res.success) setItems((p) => p.filter((x) => x.id !== id));
    });
  };

  return (
    <>
      <div className="space-y-2">
        {items.map((m, index) => (
          <div key={m.id || m.visit_count || index} className="flex items-center justify-between gap-3 bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-200">{m.label}</p>
              <p className="text-xs text-slate-500">Visit #{m.visit_count}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(m)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all">
                Edit
              </button>
              <button onClick={() => remove(m.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-3">No milestones yet</p>
        )}
      </div>

      {/* Inline form */}
      {editing !== null ? (
        <div className="bg-[#0A0F1E] border border-[#D4A843]/25 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider">
            {editing.id ? "Edit Milestone" : "New Milestone"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Visit # *</label>
              <input type="number" min="1" className={inputCls} placeholder="5"
                value={editing.visit_count ?? ""}
                onChange={(e) => setEditing({ ...editing, visit_count: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Label *</label>
              <input type="text" className={inputCls} placeholder="5th Visit Milestone"
                value={editing.label ?? ""}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ms-active" checked={editing.is_active ?? true}
              onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              className="accent-[#D4A843]" />
            <label htmlFor="ms-active" className="text-xs text-slate-400">Active</label>
          </div>
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2">
            <button onClick={save} disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#0A0F1E] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(null); setErr(""); }}
              className="px-4 py-2.5 rounded-xl text-xs text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ is_active: true })}
          className="w-full py-2.5 rounded-xl text-xs font-semibold border border-dashed border-[#1E2D4A] text-slate-500 hover:text-[#D4A843] hover:border-[#D4A843]/40 transition-all">
          + Add Milestone
        </button>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// Section 2: Spend Ranges
// ══════════════════════════════════════════════════════════════

function SpendRangeSection({ initial }: { initial: SpendRange[] }) {
  const [items,    setItems]    = useState<SpendRange[]>(initial);
  const [editing,  setEditing]  = useState<Partial<SpendRange> | null>(null);
  const [err,      setErr]      = useState("");
  const [isPending, sp]         = useTransition();

  // Client-side overlap check (DB trigger is the authoritative guard)
  const hasOverlap = (candidate: Partial<SpendRange>): boolean => {
    const min = Number(candidate.min_spend ?? -1);
    const max = Number(candidate.max_spend ?? -1);
    return items.some((r) => {
      if (r.id === candidate.id) return false;  // skip self on edit
      if (!r.is_active) return false;
      return min <= Number(r.max_spend) && max >= Number(r.min_spend);
    });
  };

  const save = () => {
    if (!editing) return;
    const min  = Number(Number(editing.min_spend ?? 0).toFixed(2));
    const max  = Number(Number(editing.max_spend ?? 0).toFixed(2));
    const lb   = String(editing.label ?? "").trim();
    if (!lb)         { setErr("Label is required.");               return; }
    if (min < 0)     { setErr("Min spend cannot be negative.");    return; }
    if (max <= min)  { setErr("Max spend must be greater than min spend."); return; }
    if (hasOverlap({ ...editing, min_spend: min, max_spend: max })) {
      setErr(`Range ₹${min}–₹${max} overlaps an existing range.`);
      return;
    }
    setErr("");
    sp(async () => {
      const res = await upsertSpendRange({ id: editing.id, label: lb, min_spend: min, max_spend: max, is_active: editing.is_active ?? true });
      if (!res.success) { setErr(res.error ?? "Save failed."); return; }
      const updated = res.data!;
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.id === updated.id);
        return idx >= 0
          ? [...prev.slice(0, idx), { ...prev[idx], ...updated }, ...prev.slice(idx + 1)]
          : [...prev, updated].sort((a, b) => a.min_spend - b.min_spend);
      });
      setEditing(null);
    });
  };

  const remove = (id: string) => {
    if (!confirm("Delete this spend range? All linked gifts will also be removed.")) return;
    sp(async () => {
      const res = await deleteSpendRange(id);
      if (res.success) setItems((p) => p.filter((x) => x.id !== id));
    });
  };

  return (
    <>
      <p className="text-xs text-slate-600">
        Ranges must not overlap. Start the next range at (previous max + 1).
      </p>
      <div className="space-y-2">
        {items.map((r, index) => (
          <div key={r.id || `range-${index}`} className="flex items-center justify-between gap-3 bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-200">{r.label}</p>
              <p className="text-xs text-slate-500">₹{Number(r.min_spend).toLocaleString("en-IN")} – ₹{Number(r.max_spend).toLocaleString("en-IN")}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(r)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all">
                Edit
              </button>
              <button onClick={() => remove(r.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-800/40 text-red-400 hover:bg-red-900/20 transition-all">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-3">No spend ranges yet</p>
        )}
      </div>

      {editing !== null ? (
        <div className="bg-[#0A0F1E] border border-[#D4A843]/25 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider">
            {editing.id ? "Edit Spend Range" : "New Spend Range"}
          </p>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Label *</label>
            <input type="text" className={inputCls} placeholder="e.g. Silver Range"
              value={editing.label ?? ""}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Min Spend (₹) *</label>
              <input type="number" min="0" className={inputCls} placeholder="2000"
                value={editing.min_spend ?? ""}
                onChange={(e) => setEditing({ ...editing, min_spend: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Max Spend (₹) *</label>
              <input type="number" min="0" className={inputCls} placeholder="4999"
                value={editing.max_spend ?? ""}
                onChange={(e) => setEditing({ ...editing, max_spend: Number(e.target.value) })} />
            </div>
          </div>
          {editing.min_spend != null && editing.max_spend != null && items.length > 0 && (
            <p className="text-xs text-slate-500">
              Tip: If the previous range ends at ₹{Math.max(...items.filter(r=>r.id!==editing.id).map(r=>r.max_spend)).toLocaleString("en-IN")},
              {" "}start this one at ₹{(Math.max(...items.filter(r=>r.id!==editing.id).map(r=>r.max_spend)) + 1).toLocaleString("en-IN")}.
            </p>
          )}
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2">
            <button onClick={save} disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#0A0F1E] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
              {isPending ? "Saving…" : "Save Range"}
            </button>
            <button onClick={() => { setEditing(null); setErr(""); }}
              className="px-4 py-2.5 rounded-xl text-xs text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing({ is_active: true })}
          className="w-full py-2.5 rounded-xl text-xs font-semibold border border-dashed border-[#1E2D4A] text-slate-500 hover:text-[#D4A843] hover:border-[#D4A843]/40 transition-all">
          + Add Spend Range
        </button>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// Section 3: Range Gifts
// ══════════════════════════════════════════════════════════════

function RangeGiftsSection({ initial }: { initial: SpendRange[] }) {
  const [ranges,   setRanges]   = useState<SpendRange[]>(initial);
  const [editing,  setEditing]  = useState<(Partial<RangeGift> & { range_id: string }) | null>(null);
  const [err,      setErr]      = useState("");
  const [isPending, sp]         = useTransition();

  const save = () => {
    if (!editing) return;
    const name = String(editing.name ?? "").trim();
    if (!name)   { setErr("Gift name is required."); return; }
    setErr("");
    sp(async () => {
      const res = await upsertRangeGift({
        id:          editing.id,
        range_id:    editing.range_id,
        name,
        description: editing.description?.trim() || undefined,
        image_url:   editing.image_url?.trim()   || undefined,
        stock:       editing.stock ?? -1,
        is_active:   editing.is_active ?? true,
      });
      if (!res.success) { setErr(res.error ?? "Save failed."); return; }
      // Refresh the gifts list for this range optimistically
      setRanges((prev) => prev.map((r) => {
        if (r.id !== editing.range_id) return r;
        const gifts = r.range_gifts ?? [];
        const idx   = gifts.findIndex((g) => g.id === editing.id);
        const next  = { ...editing, name } as RangeGift;
        return {
          ...r,
          range_gifts: idx >= 0
            ? [...gifts.slice(0, idx), next, ...gifts.slice(idx + 1)]
            : [...gifts, next],
        };
      }));
      setEditing(null);
    });
  };

  const remove = (giftId: string, rangeId: string) => {
    if (!confirm("Delete this gift?")) return;
    sp(async () => {
      const res = await deleteRangeGift(giftId);
      if (res.success) {
        setRanges((prev) => prev.map((r) =>
          r.id === rangeId
            ? { ...r, range_gifts: (r.range_gifts ?? []).filter((g) => g.id !== giftId) }
            : r
        ));
      }
    });
  };

  return (
    <>
      {ranges.length === 0 && (
        <p className="text-xs text-slate-600 text-center py-3">Create spend ranges first, then add gifts.</p>
      )}
      <div className="space-y-5">
        {ranges.map((r) => (
          <div key={r.id} className="bg-[#0A0F1E] border border-[#1E2D4A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-slate-200">{r.label}</p>
                <p className="text-xs text-slate-500">₹{Number(r.min_spend).toLocaleString("en-IN")} – ₹{Number(r.max_spend).toLocaleString("en-IN")}</p>
              </div>
              <button onClick={() => setEditing({ range_id: r.id, is_active: true, stock: -1 })}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/10 transition-all">
                + Add Gift
              </button>
            </div>

            {(r.range_gifts ?? []).length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">No gifts yet</p>
            ) : (
              <div className="space-y-2">
                {(r.range_gifts ?? []).map((g, index) => (
                  <div key={g.id || `new-gift-${index}`} className="flex items-start justify-between gap-3 bg-[#0F1729] border border-[#1E2D4A] rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{g.name}</p>
                      {g.description && <p className="text-xs text-slate-500 truncate mt-0.5">{g.description}</p>}
                      <p className="text-xs text-slate-600 mt-0.5">
                        Stock: {g.stock === -1 ? "Unlimited" : g.stock}
                        {!g.is_active && <span className="text-red-400 ml-2">Inactive</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => setEditing({ ...g, range_id: r.id })}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[#D4A843]/25 text-[#D4A843] hover:bg-[#D4A843]/8 transition-all">
                        Edit
                      </button>
                      <button onClick={() => remove(g.id, r.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-red-800/30 text-red-400 hover:bg-red-900/15 transition-all">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline form — only show for this range */}
            {editing?.range_id === r.id && (
              <div className="mt-3 bg-[#0F1729] border border-[#D4A843]/20 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[#D4A843] uppercase tracking-wider">
                  {editing.id ? "Edit Gift" : "New Gift"}
                </p>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Gift Name *</label>
                  <input type="text" className={inputCls} placeholder="e.g. Screen Protector"
                    value={editing.name ?? ""}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Description</label>
                  <input type="text" className={inputCls} placeholder="Optional short description"
                    value={editing.description ?? ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5">Stock (-1 = unlimited)</label>
                    <input type="number" min="-1" className={inputCls} placeholder="-1"
                      value={editing.stock ?? -1}
                      onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#D4A843]"
                        checked={editing.is_active ?? true}
                        onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                      <span className="text-xs text-slate-400">Active</span>
                    </label>
                  </div>
                </div>
                {err && <ErrBox msg={err} />}
                <div className="flex gap-2">
                  <button onClick={save} disabled={isPending}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-[#0A0F1E] disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)" }}>
                    {isPending ? "Saving…" : "Save Gift"}
                  </button>
                  <button onClick={() => { setEditing(null); setErr(""); }}
                    className="px-3 py-2 rounded-xl text-xs text-slate-400 border border-[#1E2D4A] hover:border-[#2D3F5E] transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// Main exported component
// ══════════════════════════════════════════════════════════════

interface Props {
  milestones: MilestoneSetting[];
  ranges:     SpendRange[];
}

export default function MilestoneGiftSettings({ milestones, ranges }: Props) {
  return (
    <div className="space-y-4">
      <SectionCard title="Visit Milestones" icon="🎯">
        <MilestoneSection initial={milestones} />
      </SectionCard>
      <SectionCard title="Spend Ranges" icon="💰">
        <SpendRangeSection initial={ranges} />
      </SectionCard>
      <SectionCard title="Gifts per Spend Range" icon="🎁">
        <RangeGiftsSection initial={ranges} />
      </SectionCard>
    </div>
  );
}
