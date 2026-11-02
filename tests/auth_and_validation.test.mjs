import test from "node:test";
import assert from "node:assert/strict";

// Indian Phone Number normalizer matching auth.ts
function normalisePhone(raw) {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return raw.startsWith("+") ? raw : `+${raw}`;
}

function validatePhoneNumber(phone) {
  if (!phone) return true; // Optional in public register
  const norm = normalisePhone(phone);
  return norm.length === 13 && norm.startsWith("+91");
}

function emailToUsername(email) {
  return email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "_").toLowerCase();
}

function validateRegistrationPayload(payload) {
  if (!payload.fullName || !payload.fullName.trim()) {
    return { valid: false, error: "Full name is required." };
  }
  if (!payload.email || !payload.email.includes("@")) {
    return { valid: false, error: "A valid email address is required." };
  }
  if (payload.phone && !validatePhoneNumber(payload.phone)) {
    return { valid: false, error: "A valid 10-digit Indian phone number is required." };
  }
  if (!payload.acceptedTerms) {
    return { valid: false, error: "You must accept the Terms and Conditions to register." };
  }
  if (!payload.password || payload.password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters." };
  }
  return { valid: true };
}

test("Auth & Validation - Indian phone normalization", () => {
  assert.strictEqual(normalisePhone("9876543210"), "+919876543210");
  assert.strictEqual(normalisePhone("09876543210"), "+919876543210");
  assert.strictEqual(normalisePhone("+919876543210"), "+919876543210");
  assert.strictEqual(normalisePhone("919876543210"), "+919876543210");
  assert.strictEqual(validatePhoneNumber("9876543210"), true);
  assert.strictEqual(validatePhoneNumber("12345"), false); // Invalid length
});

test("Auth & Validation - Terms & Conditions acceptance enforcement", () => {
  const withoutTerms = validateRegistrationPayload({
    fullName: "Ramesh Kumar",
    email: "ramesh@example.com",
    phone: "9876543210",
    password: "securePassword123",
    acceptedTerms: false, // Not accepted
  });

  assert.strictEqual(withoutTerms.valid, false);
  assert.strictEqual(withoutTerms.error, "You must accept the Terms and Conditions to register.");

  const withTerms = validateRegistrationPayload({
    fullName: "Ramesh Kumar",
    email: "ramesh@example.com",
    phone: "9876543210",
    password: "securePassword123",
    acceptedTerms: true, // Accepted
  });

  assert.strictEqual(withTerms.valid, true);
});

test("Auth & Validation - Email to username normalization", () => {
  assert.strictEqual(emailToUsername("ramesh.kumar@gmail.com"), "ramesh.kumar");
  assert.strictEqual(emailToUsername("JaiBhajarang+test@gmail.com"), "jaibhajarang_test");
});

test("Auth & Validation - Role authorization checks", () => {
  function checkRouteAccess(role, pathname) {
    const isStaff = role === "admin" || role === "super_admin";

    if (pathname.startsWith("/admin/dashboard") || pathname.startsWith("/admin/settings")) {
      return role === "super_admin";
    }
    if (pathname.startsWith("/admin")) {
      return isStaff;
    }
    return true; // /dashboard accessible to all authenticated users
  }

  // super_admin has access to everything
  assert.strictEqual(checkRouteAccess("super_admin", "/admin/billing"), true);
  assert.strictEqual(checkRouteAccess("super_admin", "/admin/dashboard"), true);
  assert.strictEqual(checkRouteAccess("super_admin", "/admin/settings"), true);

  // admin (staff) can bill and see customers
  assert.strictEqual(checkRouteAccess("admin", "/admin/billing"), true);
  assert.strictEqual(checkRouteAccess("admin", "/admin/customers"), true);
  assert.strictEqual(checkRouteAccess("admin", "/admin/dashboard"), false);

  // customer cannot access /admin
  assert.strictEqual(checkRouteAccess("customer", "/admin/billing"), false);
  assert.strictEqual(checkRouteAccess("customer", "/dashboard"), true);
});
