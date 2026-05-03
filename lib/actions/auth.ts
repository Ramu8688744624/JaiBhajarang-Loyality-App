"use server";
// lib/actions/auth.ts  ─ TRIGGER-FIRST FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Auth Server Actions
//
// Auth strategy  : EMAIL + PASSWORD
// Profile creation: 100% handled by DB trigger handle_new_user_registration()
// This file      : creates the auth.users row, passes metadata, polls
//                  for the trigger-created profile, then signs in.
//
// What was removed vs previous version:
//   ✂  registerCustomer  — fallback upsert block (was racing the trigger)
//   ✂  adminRegisterCustomer — fallback upsert + referral table insert
//   ✂  fetchJoiningBonus() helper (trigger reads shop_settings directly)
//   ✂  generateCode() helper    (trigger generates referral_code)
//   The polling loop is KEPT — it is the correct way to wait for the trigger.
// ══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies }        from "next/headers";

// ─── Supabase clients ─────────────────────────────────────────

/** Public anon client — signs in users, sends reset emails */
function anonClient() {
  return createClient(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL),
    String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Service-role client — admin mutations, bypasses RLS */
function svcClient() {
  return createClient(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL),
    String(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Shared types ─────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "customer";

export interface ActionResult<T = undefined> {
  success: boolean;
  error?:  string;
  data?:   T;
}

export interface SessionPayload {
  userId:       string;
  role:         UserRole;
  accessToken:  string;
  refreshToken: string;
}

export interface RegisteredProfile {
  id:              string;
  username:        string;
  full_name:       string | null;
  email:           string | null;
  phone:           string | null;
  wallet_balance:  number;
  referral_code:   string | null;
}

// ─── Cookie helpers ───────────────────────────────────────────

async function setSessionCookies(
  accessToken:  string,
  refreshToken: string,
  maxAge = 60 * 60 * 24 * 7   // 7 days
): Promise<void> {
  const jar  = await cookies();
  const base = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
  };
  jar.set("sb-access-token",  String(accessToken),  { ...base, maxAge });
  jar.set("sb-refresh-token", String(refreshToken), { ...base, maxAge });
}

async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete("sb-access-token");
  jar.delete("sb-refresh-token");
}

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get("sb-access-token")?.value ?? null;
}

/** Read session from httpOnly cookies and validate with Supabase */
export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const jar    = await cookies();
    const access = jar.get("sb-access-token")?.value;
    const refresh= jar.get("sb-refresh-token")?.value;
    if (!access || !refresh) return null;

    const { data, error } = await svcClient().auth.getUser(String(access));
    if (error || !data.user) return null;

    const { data: profile } = await svcClient()
      .from("profiles")
      .select("role")
      .eq("id", String(data.user.id))
      .single();

    return {
      userId:       String(data.user.id),
      role:         (profile?.role ?? "customer") as UserRole,
      accessToken:  String(access),
      refreshToken: String(refresh),
    };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// 1. LOGIN  (email + password)
// ══════════════════════════════════════════════════════════════

export async function login(
  email:    string,
  password: string
): Promise<ActionResult<{ role: UserRole; redirectTo: string }>> {
  try {
    const emailStr    = String(email    ?? "").trim().toLowerCase();
    const passwordStr = String(password ?? "");

    if (!emailStr)    return { success: false, error: "Email is required." };
    if (!passwordStr) return { success: false, error: "Password is required." };

    const { data, error } = await anonClient().auth.signInWithPassword({
      email:    emailStr,
      password: passwordStr,
    });

    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("invalid") || m.includes("credentials"))
        return { success: false, error: "Incorrect email or password." };
      return { success: false, error: friendlyError(error.message) };
    }
    if (!data.session) return { success: false, error: "Login failed. Please try again." };

    await setSessionCookies(
      String(data.session.access_token),
      String(data.session.refresh_token)
    );

    const { data: profile } = await svcClient()
      .from("profiles")
      .select("role")
      .eq("id", String(data.user.id))
      .single();

    const role       = (profile?.role ?? "customer") as UserRole;
    const redirectTo = role === "customer" ? "/dashboard" : "/admin/billing";

    return { success: true, data: { role, redirectTo } };
  } catch (err: unknown) {
    console.error("[login]", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ══════════════════════════════════════════════════════════════
// 2. LOGOUT
// ══════════════════════════════════════════════════════════════

export async function logout(): Promise<ActionResult> {
  try {
    await clearSessionCookies();
    return { success: true };
  } catch (err: unknown) {
    console.error("[logout]", err);
    return { success: false, error: "Logout failed." };
  }
}

// ══════════════════════════════════════════════════════════════
// 3. FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════

export async function forgotPassword(email: string): Promise<ActionResult> {
  try {
    const emailStr = String(email ?? "").trim().toLowerCase();
    if (!emailStr) return { success: false, error: "Email is required." };

    const redirectTo = `${String(process.env.NEXT_PUBLIC_APP_URL ?? "")}/reset-password`;
    const { error }  = await anonClient().auth.resetPasswordForEmail(emailStr, { redirectTo });
    if (error) console.error("[forgotPassword]", error.message);

    // Always succeed — prevents email enumeration
    return { success: true };
  } catch (err: unknown) {
    console.error("[forgotPassword]", err);
    return { success: true };
  }
}

// ══════════════════════════════════════════════════════════════
// 4. RESET PASSWORD  (called from /reset-password page)
// ══════════════════════════════════════════════════════════════

export async function resetPassword(
  newPassword: string,
  accessToken: string
): Promise<ActionResult> {
  try {
    const passwordStr = String(newPassword  ?? "");
    const tokenStr    = String(accessToken  ?? "");

    if (passwordStr.length < 6)
      return { success: false, error: "Password must be at least 6 characters." };
    if (!tokenStr)
      return { success: false, error: "Reset token is missing. Please use the link from your email." };

    const db = anonClient();
    const { error: sessionError } = await db.auth.setSession({
      access_token:  tokenStr,
      refresh_token: "",
    });
    if (sessionError)
      return { success: false, error: "Reset link has expired. Please request a new one." };

    const { error } = await db.auth.updateUser({ password: passwordStr });
    if (error) return { success: false, error: friendlyError(error.message) };

    await clearSessionCookies();
    return { success: true };
  } catch (err: unknown) {
    console.error("[resetPassword]", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ══════════════════════════════════════════════════════════════
// 5. REGISTER CUSTOMER  (public self-registration)
//
// Flow:
//   1. Validate inputs + check for duplicate email/phone
//   2. Validate referral code if provided
//   3. Call auth.admin.createUser with metadata — triggers DB function
//   4. Poll profiles table until trigger-created row appears (max 5 s)
//   5. Auto sign-in and set session cookies
//   6. Return profile to client
//
// The DB trigger handle_new_user_registration() does ALL of:
//   • INSERT into profiles with wallet_balance = joining_bonus
//   • Record the wallet_transaction for the joining bonus
//   • Store referred_by UUID from referral code lookup
//   • Generate referral_code for the new user
//   This function does NONE of those things.
// ══════════════════════════════════════════════════════════════

export interface RegisterPayload {
  fullName:      string;
  email:         string;
  phone:         string;        // business record, not used for auth
  password:      string;
  referralCode?: string;
}

export async function registerCustomer(
  payload: RegisterPayload
): Promise<ActionResult<RegisteredProfile>> {
  try {
    const fullName     = String(payload.fullName    ?? "").trim();
    const emailStr     = String(payload.email       ?? "").trim().toLowerCase();
    const passwordStr  = String(payload.password    ?? "");
    const referralCode = payload.referralCode
      ? String(payload.referralCode).trim().toUpperCase()
      : undefined;

    // Normalise phone → +91XXXXXXXXXX (10-digit Indian numbers)
    const phone = await normalisePhone(payload.phone);

    // ── Validation ─────────────────────────────────────────────
    if (!fullName)
      return { success: false, error: "Full name is required." };
    if (!emailStr || !emailStr.includes("@"))
      return { success: false, error: "A valid email address is required." };
    if (!phone || phone.length !== 13 || !phone.startsWith("+91"))
      return { success: false, error: "A valid 10-digit Indian phone number is required." };
    if (passwordStr.length < 6)
      return { success: false, error: "Password must be at least 6 characters." };

    const svc = svcClient();

    // ── Duplicate checks ───────────────────────────────────────
    const [emailCheck, phoneCheck] = await Promise.all([
      svc.from("profiles").select("id").eq("email", emailStr).maybeSingle(),
      svc.from("profiles").select("id").eq("phone", phone).maybeSingle(),
    ]);
    if (emailCheck.data)
      return { success: false, error: "An account with this email already exists." };
    if (phoneCheck.data)
      return { success: false, error: "This phone number is already registered." };

    // ── Validate referral code (reject unknown codes early) ────
    if (referralCode) {
      const { data: refProfile } = await svc
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
      if (!refProfile)
        return { success: false, error: "Invalid referral code. Please check and try again." };
    }

    // ── Create auth.users row — trigger fires automatically ────
    //    All profile data is passed via user_metadata so the
    //    trigger can read it from NEW.raw_user_meta_data.
    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email:         emailStr,
      password:      passwordStr,
      email_confirm: true,
      user_metadata: {
        full_name:        fullName,
        phone:            phone,
        username:         emailToUsername(emailStr),
        referred_by_code: referralCode ?? null,
      },
    });

    if (authErr) {
      console.error("[registerCustomer] createUser:", authErr.message);
      return { success: false, error: friendlyError(authErr.message) };
    }
    if (!authData?.user)
      return { success: false, error: "Failed to create user account." };

    const userId = String(authData.user.id);

    // ── Poll for trigger-created profile row (max 5 s / 10 attempts) ──
    //    Do NOT insert or upsert here — that races the trigger.
    const profile = await pollForProfile(svc, userId);

    if (!profile) {
      // Trigger failed or timed out — surface a clear message
      console.error("[registerCustomer] profile trigger timed out for user:", userId);
      return {
        success: false,
        error:   "Account created but profile setup timed out. Please contact support.",
      };
    }

    // ── Auto sign-in — email was confirmed above ───────────────
    const { data: session, error: signInErr } = await anonClient()
      .auth.signInWithPassword({ email: emailStr, password: passwordStr });

    if (signInErr) {
      // Profile exists — registration succeeded, just auto-login failed.
      // Return success anyway; the login page will handle the rest.
      console.warn("[registerCustomer] auto sign-in failed:", signInErr.message);
      return { success: true, data: profile };
    }

    if (session?.session) {
      await setSessionCookies(
        String(session.session.access_token),
        String(session.session.refresh_token)
      );
    }

    revalidatePath("/admin/customers");
    return { success: true, data: profile };

  } catch (err: unknown) {
    console.error("[registerCustomer]", err);
    return { success: false, error: "An unexpected error occurred during registration." };
  }
}

// ══════════════════════════════════════════════════════════════
// 6. ADMIN: Register customer (terminal flow)
//    Admin provides Name + Email; optional Phone.
//    System creates user, trigger builds profile, a temp password
//    is shown once in the UI.
//
// Changes vs previous version:
//   ✂  Removed referrals table insert (trigger handles it)
//   ✂  Removed fallback upsert (was the race condition source)
//   ✂  Kept polling loop (correct approach)
// ══════════════════════════════════════════════════════════════

export async function adminRegisterCustomer(payload: {
  fullName: string;
  email:    string;
  phone?:   string;
}): Promise<ActionResult<RegisteredProfile & { _tempPassword: string }>> {
  try {
    const fullName = String(payload.fullName ?? "").trim();
    const emailStr = String(payload.email    ?? "").trim().toLowerCase();
    const phone    = payload.phone ? await normalisePhone(payload.phone) : "";

    // ── Validation ─────────────────────────────────────────────
    if (!fullName)
      return { success: false, error: "Full name is required." };
    if (!emailStr || !emailStr.includes("@"))
      return { success: false, error: "A valid email is required." };
    if (phone && (phone.length !== 13 || !phone.startsWith("+91")))
      return { success: false, error: "A valid 10-digit Indian phone number is required." };

    const svc = svcClient();

    // ── Duplicate checks ───────────────────────────────────────
    const emailCheck = await svc.from("profiles").select("id").eq("email", emailStr).maybeSingle();
    if (emailCheck.data)
      return { success: false, error: "An account with this email already exists." };

    if (phone) {
      const phoneCheck = await svc.from("profiles").select("id").eq("phone", phone).maybeSingle();
      if (phoneCheck.data)
        return { success: false, error: "This phone number is already registered." };
    }

    // ── Generate a one-time temp password ─────────────────────
    const tempPassword = `JB@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // ── Create auth.users row — trigger fires automatically ────
    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email:         emailStr,
      password:      tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username:  emailToUsername(emailStr),
        ...(phone ? { phone } : {}),
        // No referral for admin-created accounts
        referred_by_code: null,
      },
    });

    if (authErr) {
      console.error("[adminRegisterCustomer] createUser:", authErr.message);
      return { success: false, error: friendlyError(authErr.message) };
    }
    if (!authData?.user)
      return { success: false, error: "Failed to create user account." };

    const userId = String(authData.user.id);

    // ── Poll for trigger-created profile (max 5 s) ─────────────
    const profile = await pollForProfile(svc, userId);

    if (!profile) {
      console.error("[adminRegisterCustomer] profile trigger timed out for user:", userId);
      return {
        success: false,
        error:   "Profile setup timed out. The account was created — please refresh and try again.",
      };
    }

    revalidatePath("/admin/billing");
    return { success: true, data: { ...profile, _tempPassword: tempPassword } };

  } catch (err: unknown) {
    console.error("[adminRegisterCustomer]", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ══════════════════════════════════════════════════════════════
// 7. ADMIN: Reset a customer's password
// ══════════════════════════════════════════════════════════════

export async function adminResetPassword(
  userId:      string,
  newPassword: string
): Promise<ActionResult> {
  try {
    if (!userId)       return { success: false, error: "User ID is required." };
    const pw = String(newPassword ?? "");
    if (pw.length < 6) return { success: false, error: "Password must be at least 6 characters." };

    const { error } = await svcClient().auth.admin.updateUserById(
      String(userId),
      { password: pw }
    );

    if (error) return { success: false, error: friendlyError(error.message) };
    return { success: true };
  } catch (err: unknown) {
    console.error("[adminResetPassword]", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ══════════════════════════════════════════════════════════════
// 8. SUPER ADMIN: Change a user's role
// ══════════════════════════════════════════════════════════════

export async function setUserRole(
  targetUserId: string,
  newRole:      "super_admin" | "admin" | "customer"
): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "super_admin")
      return { success: false, error: "Insufficient permissions. Super Admin only." };

    const { error } = await svcClient()
      .from("profiles")
      .update({ role: String(newRole), updated_at: new Date().toISOString() })
      .eq("id", String(targetUserId));

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("[setUserRole]", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ══════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Poll profiles table until the DB trigger has created the row.
 * Tries every 500 ms for up to 5 seconds (10 attempts).
 * Returns the profile or null if timed out.
 */
async function pollForProfile(
  svc:    ReturnType<typeof svcClient>,
  userId: string
): Promise<RegisteredProfile | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(500);
    const { data } = await svc
      .from("profiles")
      .select("id, username, full_name, email, phone, wallet_balance, referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (data) return data as RegisteredProfile;
  }
  return null;
}

/** Convert email prefix to a safe lowercase username slug */
function emailToUsername(email: string): string {
  return String(email).split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase();
}

/** Normalise Indian phone numbers to +91XXXXXXXXXX */
export async function normalisePhone(raw: unknown): Promise<string> {
  const s      = String(raw ?? "").trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+"))                              return s;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10)                           return `+91${digits}`;
  return `+91${digits}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function friendlyError(message: string): string {
  const m = String(message).toLowerCase();
  if (m.includes("invalid login credentials"))       return "Incorrect email or password.";
  if (m.includes("email not confirmed"))             return "Please confirm your email before logging in.";
  if (m.includes("user not found"))                  return "No account found with this email.";
  if (m.includes("already registered"))              return "An account with this email already exists.";
  if (m.includes("token has expired"))               return "Reset link has expired. Please request a new one.";
  if (m.includes("rate limit"))                      return "Too many attempts. Please wait a moment.";
  if (m.includes("weak_password") || m.includes("password should"))
    return "Password too weak. Use at least 6 characters.";
  return message;
}
