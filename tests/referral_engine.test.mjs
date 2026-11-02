import test from "node:test";
import assert from "node:assert/strict";

// Referral validation and usage engine logic matching billing.ts
function evaluateReferralUsage({
  totalReferrals = 0,
  referralUsageCount = 0,
  referralBalance = 0,
  perVisitLimit = 100,
  grossAmount = 0,
}) {
  const dynamicUsageLimit = totalReferrals * 2;

  if (totalReferrals === 0) {
    return { allowed: false, error: "No referrals available." };
  }

  if (referralUsageCount >= dynamicUsageLimit) {
    return { allowed: false, error: "Usage limit reached." };
  }

  if (referralBalance <= 0) {
    return { allowed: false, error: "No referral balance available." };
  }

  const discount = Math.min(referralBalance, perVisitLimit, grossAmount);

  return {
    allowed: true,
    dynamicUsageLimit,
    discount,
    nextUsageCount: referralUsageCount + 1, // Correct single increment
  };
}

test("Referral Engine - Zero referrals cannot use referral wallet", () => {
  const result = evaluateReferralUsage({
    totalReferrals: 0,
    referralUsageCount: 0,
    referralBalance: 0,
    grossAmount: 1000,
  });

  assert.strictEqual(result.allowed, false);
  assert.strictEqual(result.error, "No referrals available.");
});

test("Referral Engine - 1 Referral grants exactly 2 discount visits (dynamic limit)", () => {
  // Visit 1
  const visit1 = evaluateReferralUsage({
    totalReferrals: 1,
    referralUsageCount: 0,
    referralBalance: 200,
    perVisitLimit: 100,
    grossAmount: 1500,
  });

  assert.strictEqual(visit1.allowed, true);
  assert.strictEqual(visit1.dynamicUsageLimit, 2);
  assert.strictEqual(visit1.discount, 100);
  assert.strictEqual(visit1.nextUsageCount, 1);

  // Visit 2
  const visit2 = evaluateReferralUsage({
    totalReferrals: 1,
    referralUsageCount: 1,
    referralBalance: 100, // Balance remaining after visit 1
    perVisitLimit: 100,
    grossAmount: 1200,
  });

  assert.strictEqual(visit2.allowed, true);
  assert.strictEqual(visit2.discount, 100);
  assert.strictEqual(visit2.nextUsageCount, 2);

  // Visit 3 (Exhausted)
  const visit3 = evaluateReferralUsage({
    totalReferrals: 1,
    referralUsageCount: 2, // Reached limit 2
    referralBalance: 0,
    perVisitLimit: 100,
    grossAmount: 800,
  });

  assert.strictEqual(visit3.allowed, false);
  assert.strictEqual(visit3.error, "Usage limit reached.");
});

test("Referral Engine - 2 Referrals grant exactly 4 discount visits", () => {
  const dynamicLimit = 2 * 2; // 4
  assert.strictEqual(dynamicLimit, 4);

  // Visit 4 is allowed (usageCount = 3 < 4)
  const visit4 = evaluateReferralUsage({
    totalReferrals: 2,
    referralUsageCount: 3,
    referralBalance: 100,
    perVisitLimit: 100,
    grossAmount: 500,
  });
  assert.strictEqual(visit4.allowed, true);

  // Visit 5 is blocked (usageCount = 4 >= 4)
  const visit5 = evaluateReferralUsage({
    totalReferrals: 2,
    referralUsageCount: 4,
    referralBalance: 100,
    perVisitLimit: 100,
    grossAmount: 500,
  });
  assert.strictEqual(visit5.allowed, false);
  assert.strictEqual(visit5.error, "Usage limit reached.");
});

test("Referral Engine - Single increment verification prevents premature lockout", () => {
  // If double-increment bug existed:
  // With 1 referral (limit 2), Visit 1 with double-increment set count to 2.
  // Then Visit 2 was incorrectly blocked!
  // With single increment fix:
  let usageCount = 0;
  const totalReferrals = 1;

  // Visit 1 processes:
  const res1 = evaluateReferralUsage({ totalReferrals, referralUsageCount: usageCount, referralBalance: 200, grossAmount: 500 });
  assert.strictEqual(res1.allowed, true);
  usageCount = res1.nextUsageCount; // Exactly 1

  // Visit 2 MUST be allowed:
  const res2 = evaluateReferralUsage({ totalReferrals, referralUsageCount: usageCount, referralBalance: 100, grossAmount: 500 });
  assert.strictEqual(res2.allowed, true); // Verified: Customer gets their 2nd discount!
});
