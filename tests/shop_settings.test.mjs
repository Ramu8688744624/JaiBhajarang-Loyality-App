import test from "node:test";
import assert from "node:assert/strict";

const DEFAULT_SHOP_SETTINGS = {
  shop_name: "Jai Bhajarang Mobiles",
  currency_symbol: "₹",
  joining_bonus: 500,
  referral_bonus: 200,
  default_redemption_pct: 5,
  default_cashback_pct: 3,
  referral_per_visit_limit: 100,
  referral_usage_count_limit: 2,
  min_bill_for_referral: 500,
  wallet_expiry_days: 365,
};

function formatINR(amount) {
  return Number(amount ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function normalizeShopName(rawName) {
  const trimmed = String(rawName ?? "").trim();
  if (
    trimmed === "" ||
    trimmed.toLowerCase() === "jai bhajarang" ||
    trimmed.toLowerCase() === "jai bhajarang mobiles"
  ) {
    return "Jai Bhajarang Mobiles";
  }
  return trimmed;
}

test("Shop Settings - Default configuration integrity", () => {
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.shop_name, "Jai Bhajarang Mobiles");
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.currency_symbol, "₹");
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.joining_bonus, 500);
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.referral_bonus, 200);
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.default_cashback_pct, 3);
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.default_redemption_pct, 5);
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.referral_per_visit_limit, 100);
  assert.strictEqual(DEFAULT_SHOP_SETTINGS.wallet_expiry_days, 365);
});

test("Shop Settings - Shop name normalization", () => {
  assert.strictEqual(normalizeShopName(""), "Jai Bhajarang Mobiles");
  assert.strictEqual(normalizeShopName("jai bhajarang"), "Jai Bhajarang Mobiles");
  assert.strictEqual(normalizeShopName("Jai Bhajarang Mobiles"), "Jai Bhajarang Mobiles");
  assert.strictEqual(normalizeShopName("Custom Store"), "Custom Store");
});

test("Shop Settings - Indian Rupee formatting (en-IN lakh/crore commas)", () => {
  assert.strictEqual(formatINR(500), "500");
  assert.strictEqual(formatINR(1500), "1,500");
  assert.strictEqual(formatINR(48500), "48,500");
  assert.strictEqual(formatINR(125000), "1,25,000"); // Standard Indian comma formatting
  assert.strictEqual(formatINR(1500000), "15,00,000");
});
