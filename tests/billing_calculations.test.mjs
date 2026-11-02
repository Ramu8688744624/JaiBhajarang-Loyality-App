import test from "node:test";
import assert from "node:assert/strict";

// Re-implement pure calculation matching calculateBillDetails from lib/actions/billing.ts
function calculateBillDetails({
  grossAmount,
  redemptionPct = 5,
  cashbackPct = 3,
  walletSource = "cashback",
  cashbackBalance = 0,
  referralBalance = 0,
  referralPerVisitLimit = 100,
}) {
  const gross = Math.max(0, Number(grossAmount) || 0);
  const cPct = Math.max(0, Number(cashbackPct) || 0);
  const rPct = Math.max(0, Number(redemptionPct) || 0);
  const perVisitCap = referralPerVisitLimit != null ? Number(referralPerVisitLimit) : 100;

  let redemptionAmount = 0;
  if (walletSource === "referral") {
    const usableReferral = Math.min(Math.max(0, referralBalance || 0), perVisitCap);
    redemptionAmount = Math.min(usableReferral, gross);
  } else if (walletSource === "cashback") {
    const maxDiscount = Math.round((gross * rPct) / 100 * 100) / 100;
    redemptionAmount = Math.min(maxDiscount, Math.max(0, cashbackBalance || 0));
  } else {
    redemptionAmount = 0;
  }

  redemptionAmount = Math.min(redemptionAmount, gross);
  redemptionAmount = Math.round(redemptionAmount * 100) / 100;

  const netAmount = Math.round((gross - redemptionAmount) * 100) / 100;
  const cashbackEarned = Math.round(((netAmount * cPct) / 100) * 100) / 100;

  return {
    grossAmount: gross,
    redemptionAmount,
    netAmount,
    cashbackEarned,
  };
}

test("Billing Calculation - Standard cashback redemption and earning", () => {
  const result = calculateBillDetails({
    grossAmount: 2000,
    redemptionPct: 5,     // 5% max discount = ₹100
    cashbackPct: 3,       // 3% cashback
    walletSource: "cashback",
    cashbackBalance: 250, // Has ₹250
    referralBalance: 0,
  });

  assert.strictEqual(result.grossAmount, 2000);
  assert.strictEqual(result.redemptionAmount, 100); // 5% of 2000 = 100
  assert.strictEqual(result.netAmount, 1900);       // 2000 - 100 = 1900
  assert.strictEqual(result.cashbackEarned, 57);     // 3% of 1900 = 57
});

test("Billing Calculation - Cashback redemption capped by customer balance", () => {
  const result = calculateBillDetails({
    grossAmount: 2000,
    redemptionPct: 5,    // 5% of 2000 is 100
    cashbackPct: 3,
    walletSource: "cashback",
    cashbackBalance: 45, // Customer only has ₹45
    referralBalance: 0,
  });

  assert.strictEqual(result.redemptionAmount, 45); // Capped by available balance
  assert.strictEqual(result.netAmount, 1955);       // 2000 - 45 = 1955
  assert.strictEqual(result.cashbackEarned, 58.65); // 3% of 1955 = 58.65
});

test("Billing Calculation - Referral wallet capped at ₹100 per visit", () => {
  const result = calculateBillDetails({
    grossAmount: 1500,
    redemptionPct: 5,
    cashbackPct: 3,
    walletSource: "referral",
    cashbackBalance: 500,
    referralBalance: 400, // Has ₹400 in referral balance
    referralPerVisitLimit: 100, // ₹100 cap
  });

  assert.strictEqual(result.redemptionAmount, 100); // Flat cap ₹100 applied
  assert.strictEqual(result.netAmount, 1400);       // 1500 - 100 = 1400
  assert.strictEqual(result.cashbackEarned, 42);     // 3% of 1400 = 42
});

test("Billing Calculation - Referral wallet when bill is smaller than ₹100 cap", () => {
  const result = calculateBillDetails({
    grossAmount: 70, // Small purchase like tempered glass or cable
    redemptionPct: 5,
    cashbackPct: 3,
    walletSource: "referral",
    cashbackBalance: 0,
    referralBalance: 200,
    referralPerVisitLimit: 100,
  });

  // Discount cannot exceed bill amount!
  assert.strictEqual(result.redemptionAmount, 70);
  assert.strictEqual(result.netAmount, 0);
  assert.strictEqual(result.cashbackEarned, 0); // No cashback when net paid is 0
});

test("Billing Calculation - None wallet source gives zero discount", () => {
  const result = calculateBillDetails({
    grossAmount: 3500,
    redemptionPct: 5,
    cashbackPct: 4,
    walletSource: "none",
    cashbackBalance: 500,
    referralBalance: 300,
  });

  assert.strictEqual(result.redemptionAmount, 0);
  assert.strictEqual(result.netAmount, 3500);
  assert.strictEqual(result.cashbackEarned, 140); // 4% of 3500 = 140
});

test("Billing Calculation - Smartphone purchase with high value", () => {
  const result = calculateBillDetails({
    grossAmount: 34999, // Vivo / OnePlus smartphone
    redemptionPct: 5,   // 5% max = 1749.95
    cashbackPct: 3,     // 3% cashback
    walletSource: "cashback",
    cashbackBalance: 600, // Redeems full ₹600
    referralBalance: 0,
  });

  assert.strictEqual(result.redemptionAmount, 600);
  assert.strictEqual(result.netAmount, 34399);
  assert.strictEqual(result.cashbackEarned, 1031.97); // 3% of 34399
});

test("Billing Calculation - Zero or negative input handling", () => {
  const result = calculateBillDetails({
    grossAmount: 0,
    redemptionPct: 5,
    cashbackPct: 3,
    walletSource: "cashback",
    cashbackBalance: 100,
    referralBalance: 0,
  });

  assert.strictEqual(result.grossAmount, 0);
  assert.strictEqual(result.redemptionAmount, 0);
  assert.strictEqual(result.netAmount, 0);
  assert.strictEqual(result.cashbackEarned, 0);
});
