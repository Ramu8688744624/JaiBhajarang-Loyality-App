import test from "node:test";
import assert from "node:assert/strict";

// Validation helper for non-overlapping spend ranges matching Postgres trigger
function validateSpendRangeOverlap(existingRanges, newRange) {
  const min = Number(newRange.min_spend);
  const max = Number(newRange.max_spend);

  if (max <= min) {
    return { valid: false, error: "max_spend must be greater than min_spend" };
  }

  for (const r of existingRanges) {
    if (r.id === newRange.id) continue;
    if (!r.is_active) continue;

    // Overlap condition: min <= r.max_spend && max >= r.min_spend
    if (min <= r.max_spend && max >= r.min_spend) {
      return {
        valid: false,
        error: `Spend range ₹${min} – ₹${max} overlaps existing range ₹${r.min_spend} – ₹${r.max_spend}`,
      };
    }
  }

  return { valid: true };
}

// Resolver for matching spend range
function resolveEligibleSpendRange(ranges, spendInWindow) {
  return ranges.find(
    (r) => r.is_active && spendInWindow >= r.min_spend && spendInWindow <= r.max_spend
  ) ?? null;
}

test("Milestone Gift System - Spend range overlap detection", () => {
  const existing = [
    { id: "1", min_spend: 500, max_spend: 2000, is_active: true },
    { id: "2", min_spend: 2001, max_spend: 5000, is_active: true },
  ];

  // Overlapping case 1: [1500, 3000]
  const overlap1 = validateSpendRangeOverlap(existing, { id: "3", min_spend: 1500, max_spend: 3000, is_active: true });
  assert.strictEqual(overlap1.valid, false);

  // Overlapping case 2: [4000, 6000]
  const overlap2 = validateSpendRangeOverlap(existing, { id: "4", min_spend: 4000, max_spend: 6000, is_active: true });
  assert.strictEqual(overlap2.valid, false);

  // Non-overlapping valid case: [5001, 15000]
  const validRange = validateSpendRangeOverlap(existing, { id: "5", min_spend: 5001, max_spend: 15000, is_active: true });
  assert.strictEqual(validRange.valid, true);

  // Invalid min >= max:
  const invalidBounds = validateSpendRangeOverlap(existing, { id: "6", min_spend: 2000, max_spend: 1000, is_active: true });
  assert.strictEqual(invalidBounds.valid, false);
});

test("Milestone Gift System - Spend range resolution for milestone window", () => {
  const ranges = [
    { id: "tier-1", label: "Bronze Range", min_spend: 500, max_spend: 2000, is_active: true },
    { id: "tier-2", label: "Silver Range", min_spend: 2001, max_spend: 5000, is_active: true },
    { id: "tier-3", label: "Gold Range",   min_spend: 5001, max_spend: 20000, is_active: true },
  ];

  // ₹1,400 spent in window between visit 1 and visit 5
  const match1 = resolveEligibleSpendRange(ranges, 1400);
  assert.strictEqual(match1?.id, "tier-1");

  // ₹3,500 spent
  const match2 = resolveEligibleSpendRange(ranges, 3500);
  assert.strictEqual(match2?.id, "tier-2");

  // ₹12,000 spent (e.g. phone purchase)
  const match3 = resolveEligibleSpendRange(ranges, 12000);
  assert.strictEqual(match3?.id, "tier-3");

  // ₹300 spent (below min range) -> returns null (admin review)
  const match4 = resolveEligibleSpendRange(ranges, 300);
  assert.strictEqual(match4, null);
});

test("Milestone Gift System - Gift claim state lifecycle", () => {
  const claim = {
    id: "claim-101",
    customerId: "cust-1",
    status: "eligible",
    selectedGiftId: null,
    claimedAt: null,
  };

  // 1. Customer selects a gift
  function selectGift(c, giftId, inStock = true) {
    if (c.status !== "eligible") throw new Error("Claim not in eligible state");
    if (!inStock) throw new Error("Gift out of stock");
    return { ...c, status: "selected", selectedGiftId: giftId, selectedAt: new Date().toISOString() };
  }

  // 2. Admin marks gift as handed over / claimed
  function markClaimed(c, adminId) {
    if (c.status !== "selected") throw new Error("Gift must be selected first");
    return { ...c, status: "claimed", claimedBy: adminId, claimedAt: new Date().toISOString() };
  }

  const selected = selectGift(claim, "gift-tempered-glass", true);
  assert.strictEqual(selected.status, "selected");
  assert.strictEqual(selected.selectedGiftId, "gift-tempered-glass");

  const claimed = markClaimed(selected, "admin-1");
  assert.strictEqual(claimed.status, "claimed");
  assert.strictEqual(claimed.claimedBy, "admin-1");

  // Cannot select again when already selected or claimed
  assert.throws(() => selectGift(claimed, "gift-cable"), /Claim not in eligible state/);
});

test("Milestone Gift System - Gift stock management", () => {
  function decrementStock(currentStock) {
    if (currentStock === -1) return -1; // Unlimited stock stays -1
    if (currentStock <= 0) throw new Error("Out of stock");
    return currentStock - 1;
  }

  assert.strictEqual(decrementStock(-1), -1); // Unlimited
  assert.strictEqual(decrementStock(5), 4);   // Decrement
  assert.strictEqual(decrementStock(1), 0);   // Last item
  assert.throws(() => decrementStock(0), /Out of stock/);
});
