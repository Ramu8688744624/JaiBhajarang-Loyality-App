"use server";
// lib/actions/auth.ts  ─ EMAIL/PASSWORD FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Auth Server Actions
//
// Auth strategy: EMAIL + PASSWORD (no OTP, no Twilio)
// Password reset: Supabase magic-link / reset email flow
// Phone field: stored in profiles for business records only
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
  id:             string;
  username:       string;
  full_name:      string | null;
  email:          string | null;
  phone:          string | null;
  wallet_balance: number;
  referral_code:  string | null;
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
    const emailStr    = String(email ?? "").trim().toLowerCase();
    const passwordStr = String(password ?? "");

    if (!emailStr)    return { success: false, error: "Email is required." };
    if (!passwordStr) return { success: false, error: "Password is required." };

    const { data, error } = await anonClient().auth.signInWithPassword({
      email:    emailStr,
      password: passwordStr,
    });

    if (error)         return { success: false, error: friendlyError(error.message) };
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
// 3. FORGOT PASSWORD  (sends a reset link via Supabase)
//    No Twilio needed — Supabase emails the reset link directly.
// ══════════════════════════════════════════════════════════════

export async function forgotPassword(email: string): Promise<ActionResult> {
  try {
    const emailStr  = String(email ?? "").trim().toLowerCase();
    if (!emailStr)  return { success: false, error: "Email is required." };

    const redirectTo = `${String(process.env.NEXT_PUBLIC_APP_URL ?? "")}/reset-password`;

    const { error } = await anonClient().auth.resetPasswordForEmail(emailStr, {
      redirectTo,
    });

    // Always return success to the UI — prevents email enumeration.
    // Supabase silently no-ops if the email doesn't exist.
    if (error) {
      console.error("[forgotPassword]", error.message);
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("[forgotPassword]", err);
    return { success: true }; // still return true to prevent enumeration
  }
}

// ══════════════════════════════════════════════════════════════
// 4. RESET PASSWORD  (called from /reset-password page)
//    Supabase embeds the access_token in the reset-link URL as
//    a hash fragment (#access_token=...). The client page
//    exchanges it with setSession, then calls this action.
// ══════════════════════════════════════════════════════════════

export async function resetPassword(
  newPassword: string,
  accessToken: string
): Promise<ActionResult> {
  try {
    const passwordStr = String(newPassword ?? "");
    const tokenStr    = String(accessToken ?? "");

    if (passwordStr.length < 6)
      return { success: false, error: "Password must be at least 6 characters." };
    if (!tokenStr)
      return { success: false, error: "Reset token is missing. Please use the link from your email." };

    // Establish session from the token embedded in the reset URL
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
//    Primary identifier: email
//    Phone stored for business records but NOT used for auth
// ══════════════════════════════════════════════════════════════

export interface RegisterPayload {
  fullName:      string;
  email:         string;
  phone:         string;        // business record, not auth
  password:      string;
  referralCode?: string;
}

export async function registerCustomer(
  payload: RegisterPayload
): Promise<ActionResult<RegisteredProfile>> {
  try {
    const fullName     = String(payload.fullName     ?? "").trim();
    const emailStr     = String(payload.email        ?? "").trim().toLowerCase();
    const phoneStr     = normalisePhone(payload.phone);
    const passwordStr  = String(payload.password     ?? "");
    const referralCode = payload.referralCode
      ? String(payload.referralCode).trim().toUpperCase()
      : undefined;

    // ── Validation ─────────────────────────────────────────────
    if (!fullName)
      return { success: false, error: "Full name is required." };
    if (!emailStr || !emailStr.includes("@"))
      return { success: false, error: "A valid email address is required." };
    if (passwordStr.length < 6)
      return { success: false, error: "Password must be at least 6 characters." };

    const svc = svcClient();

    // ── Duplicate email check ──────────────────────────────────
    const { data: existingEmail } = await svc
      .from("profiles")
      .select("id")
      .eq("email", emailStr)
      .maybeSingle();
    if (existingEmail)
      return { success: false, error: "An account with this email already exists." };

    // ── Duplicate phone check (if provided) ───────────────────
    if (phoneStr) {
      const { data: existingPhone } = await svc
        .from("profiles")
        .select("id")
        .eq("phone", phoneStr)
        .maybeSingle();
      if (existingPhone)
        return { success: false, error: "This phone number is already registered." };
    }

    // ── Validate referral code ─────────────────────────────────
    if (referralCode) {
      const { data: refProfile } = await svc
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
      if (!refProfile)
        return { success: false, error: "Invalid referral code. Please check and try again." };
    }

    // ── Create auth.users row (triggers handle_new_user) ───────
    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email:          emailStr,
      password:       passwordStr,
      email_confirm:  true,        // skip confirmation email for staff-created accounts
      user_metadata: {
        full_name:     fullName,
        phone:         phoneStr,
        username:      emailToUsername(emailStr),
        referral_code: referralCode ?? null,
      },
    });

    if (authErr) {
      const msg = authErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("duplicate"))
        return { success: false, error: "An account with this email already exists." };
      return { success: false, error: friendlyError(authErr.message) };
    }

    const userId = String(authData.user.id);
    if (referralCode) {
  try {
    // 1. Find the Referrer's ID and the promised bonus amount from settings
    const { data: refProfile } = await svc
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    const { data: settings } = await svc
      .from("shop_settings")
      .select("referral_bonus")
      .single();

    if (refProfile) {
      // 2. Insert the row so the "Pending" reward exists in the DB
      await svc.from("referrals").insert({
        referrer_id:     refProfile.id,
        referee_id:      userId,
        promised_amount: Number(settings?.referral_bonus ?? 200),
        bonus_paid:      false, // This keeps it in "Pending/Locked" status
      });
    }
  } catch (err) {
    console.error("Failed to link referral:", err);
    // We don't block registration if referral linking fails, but we log it.
  }
}

    // ── Wait for trigger to create profile row (max 2 s) ───────
    let profile: RegisteredProfile | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      await sleep(400);
      const { data } = await svc
        .from("profiles")
        .select("id, username, full_name, email, phone, wallet_balance, referral_code")
        .eq("id", userId)
        .maybeSingle();
      if (data) { profile = data as RegisteredProfile; break; }
    }

    // ── Fallback upsert if trigger was too slow ─────────────────
    if (!profile) {
      const bonus = await fetchJoiningBonus(svc);
      const code  = await generateCode(svc);

      const { data: upserted, error: upErr } = await svc
        .from("profiles")
        .upsert(
          {
            id:                     userId,
            email:                  emailStr,
            phone:                  phoneStr || null,
            full_name:              fullName,
            username:               emailToUsername(emailStr),
            role:                   "customer",
            wallet_balance:         bonus,
            joining_bonus_credited: bonus > 0,
            referral_code:          code,
          },
          { onConflict: "id" }
        )
        .select("id, username, full_name, email, phone, wallet_balance, referral_code")
        .single();

      if (upErr) {
        console.error("[registerCustomer] fallback upsert:", upErr.message);
        return {
          success: false,
          error:   "Account created but profile setup failed. Please contact support.",
        };
      }

      profile = upserted as RegisteredProfile;

      if (bonus > 0) {
        await svc.from("wallet_transactions").insert({
          profile_id:    userId,
          type:          "joining_bonus",
          amount:        bonus,
          balance_after: bonus,
          description:   "Welcome Joining Bonus",
        });
      }
    }

    // ── Auto sign-in (email confirmed above) ───────────────────
    const { data: session } = await anonClient().auth.signInWithPassword({
      email:    emailStr,
      password: passwordStr,
    });
    if (session?.session) {
      await setSessionCookies(
        String(session.session.access_token),
        String(session.session.refresh_token)
      );
    }

    revalidatePath("/admin/customers");
    return { success: true, data: profile! };

  } catch (err: unknown) {
    console.error("[registerCustomer]", err);
    return { success: false, error: "An unexpected error occurred during registration." };
  }
}

// ══════════════════════════════════════════════════════════════
// 6. ADMIN: Register customer (terminal flow — no self-login)
//    Admin enters Name + Phone + Email; system generates a
//    temporary password and shows it once.
// ══════════════════════════════════════════════════════════════

export async function adminRegisterCustomer(payload: {
  fullName: string;
  email:    string;
  phone?:   string;
}): Promise<ActionResult<RegisteredProfile & { _tempPassword: string }>> {
  try {
    const fullName = String(payload.fullName ?? "").trim();
    const emailStr = String(payload.email    ?? "").trim().toLowerCase();
    const phoneStr = payload.phone ? normalisePhone(payload.phone) : "";

    if (!fullName)                          return { success: false, error: "Full name is required." };
    if (!emailStr || !emailStr.includes("@")) return { success: false, error: "A valid email is required." };

    const svc = svcClient();

    // Duplicate checks
    const { data: existingEmail } = await svc
      .from("profiles").select("id").eq("email", emailStr).maybeSingle();
    if (existingEmail)
      return { success: false, error: "An account with this email already exists." };

    if (phoneStr) {
      const { data: existingPhone } = await svc
        .from("profiles").select("id").eq("phone", phoneStr).maybeSingle();
      if (existingPhone)
        return { success: false, error: "This phone number is already registered." };
    }

    const tempPassword = `JB@${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: authData, error: authErr } = await svc.auth.admin.createUser({
      email:         emailStr,
      password:      tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone:     phoneStr || null,
        username:  emailToUsername(emailStr),
      },
    });

    if (authErr) return { success: false, error: friendlyError(authErr.message) };

    const userId = String(authData.user.id);
    let profile: RegisteredProfile | null = null;

    for (let i = 0; i < 5; i++) {
      await sleep(400);
      const { data } = await svc
        .from("profiles")
        .select("id, username, full_name, email, phone, wallet_balance, referral_code")
        .eq("id", userId)
        .maybeSingle();
      if (data) { profile = data as RegisteredProfile; break; }
    }

    if (!profile) {
      const bonus = await fetchJoiningBonus(svc);
      const code  = await generateCode(svc);
      const { data: up } = await svc
        .from("profiles")
        .upsert({
          id: userId, email: emailStr,
          phone: phoneStr || null, full_name: fullName,
          username: emailToUsername(emailStr),
          role: "customer", wallet_balance: bonus,
          joining_bonus_credited: bonus > 0, referral_code: code,
        }, { onConflict: "id" })
        .select("id, username, full_name, email, phone, wallet_balance, referral_code")
        .single();
      profile = up as RegisteredProfile;
    }

    revalidatePath("/admin/billing");
    return { success: true, data: { ...profile!, _tempPassword: tempPassword } };

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
    if (!userId)        return { success: false, error: "User ID is required." };
    const passwordStr = String(newPassword ?? "");
    if (passwordStr.length < 6)
      return { success: false, error: "Password must be at least 6 characters." };

    const { error } = await svcClient().auth.admin.updateUserById(
      String(userId),
      { password: passwordStr }
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

/** Convert email to a stable username slug */
function emailToUsername(email: string): string {
  return String(email).split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase();
}

/** Normalise Indian phone numbers to +91XXXXXXXXXX */
/** Normalise Indian phone numbers to +91XXXXXXXXXX */
export async function normalisePhone(raw: unknown): Promise<string> {
  const s      = String(raw ?? "").trim();
  const digits = s.replace(/\D/g, "");

  if (s.startsWith("+")) return s;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  
  return `+91${digits}`;
}

async function fetchJoiningBonus(
  svc: ReturnType<typeof svcClient>
): Promise<number> {
  const { data } = await svc
    .from("shop_settings")
    .select("joining_bonus")
    .limit(1)
    .single();
  return Number(data?.joining_bonus ?? 0);
}

async function generateCode(svc: ReturnType<typeof svcClient>): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = "JB-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data } = await svc
      .from("profiles").select("id").eq("referral_code", code).maybeSingle();
    if (!data) return code;
  }
  return "JB-" + Date.now().toString(36).slice(-4).toUpperCase();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function friendlyError(message: string): string {
  const m = String(message).toLowerCase();
  if (m.includes("invalid login credentials"))      return "Incorrect email or password.";
  if (m.includes("email not confirmed"))            return "Please confirm your email before logging in.";
  if (m.includes("user not found"))                 return "No account found with this email.";
  if (m.includes("already registered"))             return "An account with this email already exists.";
  if (m.includes("token has expired"))              return "Reset link has expired. Please request a new one.";
  if (m.includes("rate limit"))                     return "Too many attempts. Please wait a moment.";
  if (m.includes("weak_password") || m.includes("password should")) return "Password too weak. Use at least 6 characters.";
  return message;
}
