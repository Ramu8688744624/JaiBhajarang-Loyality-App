"use client";
// components/GiftBanner.tsx
// ══════════════════════════════════════════════════════════════
// Jai Bhajarang Mobiles — Gift Claim Banner (Customer Side)
//
// Renders one banner per active (eligible | selected) gift claim.
// State 1 — eligible: celebratory banner + gift picker
// State 2 — selected: confirmation card with "show to shop owner"
// State 3 — claimed: disappears (filtered out in page.tsx query)
//
// Usage in DashboardClient.tsx:
//   <GiftBanner claims={giftClaims} currencySymbol={sym} />
// ══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { selectGift }              from "@/lib/actions/gifts";
import type { GiftClaim, RangeGift } from "@/lib/actions/gifts";

interface Props {
  claims:         GiftClaim[];
  currencySymbol: string;
  customerId:     string;
}

// ─── Single gift option card ──────────────────────────────────

function GiftOption({
  gift,
  selected,
  onSelect,
  disabled,
}: {
  gift:     RangeGift;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const outOfStock = gift.stock === 0;
  return (
    <button
      onClick={onSelect}
      disabled={disabled || outOfStock}
      className={`relative w-full text-left p-3 rounded-xl border transition-all active:scale-[0.97] ${
        outOfStock   ? "opacity-40 cursor-not-allowed border-[#1E2D4A]" :
        selected     ? "border-[#D4A843] bg-[#D4A843]/12 shadow-md shadow-[#D4A843]/10" :
                       "border-[#1E2D4A] hover:border-[#D4A843]/40 bg-[#0A0F1E]"
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>
          ✓ Selected
        </span>
      )}
      <p className="text-sm font-semibold text-slate-200 pr-16">{gift.name}</p>
      {gift.description && (
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{gift.description}</p>
      )}
      <p className={`text-xs mt-1.5 font-medium ${outOfStock ? "text-red-400" : "text-green-400"}`}>
        {outOfStock ? "Out of stock" : gift.stock === -1 ? "Available" : `${gift.stock} left`}
      </p>
    </button>
  );
}

// ─── Single claim banner ──────────────────────────────────────

function ClaimBanner({
  claim,
  currencySymbol,
  customerId,
}: {
  claim:          GiftClaim;
  currencySymbol: string;
  customerId:     string;
}) {
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(claim.gift_id);
  const [isPending, sp]                     = useTransition();
  const [error, setError]                   = useState("");
  const [localStatus, setLocalStatus]       = useState(claim.status);

  const sym      = currencySymbol;
  const gifts    = (claim.spend_ranges?.range_gifts ?? []).filter((g) => g.is_active);
  const msLabel  = claim.milestone_settings?.label ?? `${claim.milestone_settings?.visit_count} Visit Milestone`;
  const spend    = Number(claim.spend_in_window ?? 0);
  const visits   = claim.milestone_settings?.visit_count ?? "?";

  const handleConfirm = () => {
    if (!selectedGiftId || isPending) return;
    setError("");
    sp(async () => {
      const res = await selectGift(claim.id, selectedGiftId, customerId);
      if (res.success) {
        setLocalStatus("selected");
      } else {
        setError(res.error ?? "Could not select gift.");
      }
    });
  };

  // ── State 2: Selected ────────────────────────────────────────
  if (localStatus === "selected") {
    const chosenGift = gifts.find((g) => g.id === (selectedGiftId ?? claim.gift_id));
    return (
      <div className="rounded-2xl p-5"
        style={{ background: "rgba(34,197,94,0.07)", border: "2px solid rgba(34,197,94,0.35)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.15)" }}>
            🎁
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-400">Gift Selected!</p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="font-semibold text-slate-200">{chosenGift?.name ?? "Your gift"}</span>
              {" "}— Show this screen to the shop owner to collect.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <div>
            <p className="text-xs text-slate-500">Milestone</p>
            <p className="text-sm font-semibold text-slate-200">{msLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Spent this window</p>
            <p className="text-sm font-semibold text-green-400">{sym}{spend.toFixed(0)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Waiting for shop owner to mark as collected
        </div>
      </div>
    );
  }

  // ── State 1: Eligible ────────────────────────────────────────
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: "2px solid rgba(212,168,67,0.45)" }}>

      {/* Confetti header */}
      <div className="px-5 py-4 text-center"
        style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.18),rgba(212,168,67,0.08))" }}>
        <p className="text-2xl mb-1">🎉🥳</p>
        <h3 className="text-base font-black" style={{ color: "#D4A843" }}>
          Congratulations!
        </h3>
        <p className="text-sm text-slate-300 mt-1">
          You hit your <strong className="text-white">{visits}{getOrdinal(Number(visits))} visit milestone</strong>
          {" "}with <strong className="text-white">{sym}{spend.toLocaleString("en-IN")}</strong> spent.
        </p>
        {claim.spend_ranges && (
          <p className="text-xs text-[#D4A843] mt-1 font-medium">
            Eligible range: {claim.spend_ranges.label}
            {" "}({sym}{Number(claim.spend_ranges.min_spend).toLocaleString("en-IN")} – {sym}{Number(claim.spend_ranges.max_spend).toLocaleString("en-IN")})
          </p>
        )}
      </div>

      {/* Gift selection */}
      <div className="bg-[#0F1729] px-5 py-4">
        {gifts.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-3">
            No gifts configured for this range yet. Visit the shop to choose!
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Select Your Gift
            </p>
            <div className="space-y-2">
              {gifts.map((g) => (
                <GiftOption
                  key={g.id}
                  gift={g}
                  selected={selectedGiftId === g.id}
                  onSelect={() => setSelectedGiftId(g.id)}
                  disabled={isPending}
                />
              ))}
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
                <span>⚠</span>{error}
              </p>
            )}
            <button
              onClick={handleConfirm}
              disabled={!selectedGiftId || isPending}
              className="mt-4 w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: selectedGiftId ? "linear-gradient(135deg,#D4A843,#F5D078)" : "#1E2D4A",
                color:      selectedGiftId ? "#0A0F1E" : "#475569",
              }}
            >
              {isPending ? "Confirming…" : selectedGiftId ? "✓ Confirm Selection" : "Choose a gift above"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────

export default function GiftBanner({ claims, currencySymbol, customerId }: Props) {
  if (!claims || claims.length === 0) return null;

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <ClaimBanner
          key={claim.id}
          claim={claim}
          currencySymbol={currencySymbol}
          customerId={customerId}
        />
      ))}
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
