"use server";
// lib/actions/billing.ts  ─ v4 DUAL-WALLET FINAL (PATCHED)
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Billing & Analytics Server Actions
//
// Fixes applied:
//   • processBill: all RPC args use p_ prefix
//   • processBill: numeric args wrapped in .toFixed(2) → NUMERIC(15,2) safe
//   • processBill: rpcData cast to Record<string,unknown> with explicit coercion
//   • processBill: null guard on raw RPC return
// ══════════════════════════════════════════════════════════════

import { createClient }     from "@supabase/supabase-js";
import { revalidatePath }   from "next/cache";
import { sendReceiptEmail } from "@/lib/email";

function svcClient() {
  return createClient(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL),
    String(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export type WalletSource = "cashback" | "referral" | "none";

export interface CustomerSearchResult {
  id:                string;
  username:          string;
  full_name:         string | null;
  email:             string | null;
  phone:             string | null;
  wallet_balance:    number;   // combined (legacy)
  cashback_balance:  number;
  referral_balance:  number;
  total_spent:       number;
  visit_count:       number;
  referral_code:     string | null;
  wallet_expires_at: string | null;
}

export interface BillPayload {
  customerId:    string;
  billedBy:      string;
  grossAmount:   number;
  redemptionPct: number;
  cashbackPct:   number;
  paymentMethod: "cash" | "card" | "upi" | "mixed";
  walletSource:  WalletSource;
}

export interface BillSummary {
  id:                string;
  gross_amount:      number;
  redemption_amount: number;
  net_amount:        number;
  cashback_earned:   number;
  wallet_source:     string;
}

export interface BillResult {
  success:              boolean;
  bill?:                BillSummary;
  newCashbackBalance?:  number;
  newReferralBalance?:  number;
  referralBonusPaid?:   boolean;
  error?:               string;
}

export interface BillPreview {
  cashbackBalance:       number;
  referralBalance:       number;
  referralUsableCap:     number;
  activeBalance:         number;
  redemptionAmount:      number;
  netAmount:             number;
  cashbackEarned:        number;
  projectedCashback:     number;
  projectedReferral:     number;
  walletExpiresAt:       string | null;
  daysUntilExpiry:       number | null;
}

export interface ShopConfig {
  currency_symbol:          string;
  default_redemption_pct:   number;
  default_cashback_pct:     number;
  joining_bonus:            number;
  referral_bonus:           number;
  referral_per_visit_limit: number | null; // This is the ₹100 limit
  referral_usage_limit:     number;        // ADDED: This is the '2 times' limit
  wallet_expiry_days:       number;
}

export interface AnalyticsSummary {
  total_customers:            number;
  total_staff:                number;
  new_customers_30d:          number;
  total_revenue:              number;
  total_gross:                number;
  revenue_30d:                number;
  total_bills:                number;
  bills_30d:                  number;
  avg_bill_value:             number;
  total_cashback_given:       number;
  wallet_liabilities:         number;
  total_joining_bonus_given:  number;
  total_referral_bonus_given: number;
  total_referred_users:       number;
}

export interface DayRevenue {
  bill_date:  string;
  bill_count: number;
  revenue:    number;
  cashback:   number;
}

export interface CustomerRow {
  id:               string;
  full_name:        string | null;
  username:         string;
  email:            string | null;
  phone:            string | null;
  role:             string;
  wallet_balance:   number;
  cashback_balance: number;
  referral_balance: number;
  total_spent:      number;
  visit_count:      number;
  total_referrals:  number;
  referral_code:    string | null;
  created_at:       string;
  wallet_expires_at: string | null;
}

// ══════════════════════════════════════════════════════════════
// SHOP CONFIG
// ══════════════════════════════════════════════════════════════

export async function getShopConfig(): Promise<ShopConfig> {
  // We added 'referral_usage_count_limit' to the select query
  const { data, error } = await svcClient()
    .from("shop_settings")
    .select(`
      currency_symbol, 
      default_redemption_pct, 
      default_cashback_pct,
      joining_bonus, 
      referral_bonus, 
      referral_per_visit_limit, 
      referral_usage_count_limit,
      wallet_expiry_days
    `)
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error fetching shop config:", error);
  }

  return {
    currency_symbol:          String(data?.currency_symbol          ?? "₹"),
    default_redemption_pct:   Number(data?.default_redemption_pct   ?? 5),
    default_cashback_pct:     Number(data?.default_cashback_pct     ?? 3),
    joining_bonus:            Number(data?.joining_bonus            ?? 500),
    referral_bonus:           Number(data?.referral_bonus           ?? 200),
    // If the database value is null, we default to 100 for your requirement
    referral_per_visit_limit: data?.referral_per_visit_limit != null
      ? Number(data.referral_per_visit_limit)
      : 100,
    // Maps the database column to the new 'referral_usage_limit' in your interface
    referral_usage_limit:     Number(data?.referral_usage_count_limit ?? 2),
    wallet_expiry_days:       Number(data?.wallet_expiry_days       ?? 365),
  };
}

// ══════════════════════════════════════════════════════════════
// CUSTOMER SEARCH
// ══════════════════════════════════════════════════════════════

export async function searchCustomers(
  query: string
): Promise<CustomerSearchResult[]> {
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];

  const { data, error } = await svcClient()
    .from("profiles")
    .select(
      "id, username, full_name, email, phone," +
      " wallet_balance, cashback_balance, referral_balance," +
      " total_spent, visit_count, referral_code, wallet_expires_at"
    )
    .eq("role", "customer")
    .or(
      `phone.ilike.%${q}%,email.ilike.%${q}%,` +
      `full_name.ilike.%${q}%,username.ilike.%${q}%`
    )
    .order("full_name", { nullsFirst: false })
    .limit(10);

  if (error) { console.error("[searchCustomers]", error.message); return []; }
  return (data ?? []).map(toCustomerSearchResult);
}

// ══════════════════════════════════════════════════════════════
// BILL PREVIEW (read-only)
// ══════════════════════════════════════════════════════════════

export async function previewBill(
  customerId:    string,
  grossAmount:   number,
  redemptionPct: number,
  cashbackPct:   number,
  walletSource:  WalletSource = "cashback"
): Promise<BillPreview> {
  const svc = svcClient();

  const [profileRes, configRes] = await Promise.all([
    svc
      .from("profiles")
      .select("cashback_balance, referral_balance, wallet_expires_at")
      .eq("id", String(customerId))
      .single(),
    svc
      .from("shop_settings")
      .select("referral_per_visit_limit")
      .limit(1)
      .single(),
  ]);

  const cashbackBal  = Number(profileRes.data?.cashback_balance  ?? 0);
  const referralBal  = Number(profileRes.data?.referral_balance  ?? 0);
  const expiresAt    = profileRes.data?.wallet_expires_at ?? null;

  // Use the limit from settings (defaulting to 100 if not set)
  const perVisitCap  = configRes.data?.referral_per_visit_limit != null
    ? Number(configRes.data.referral_per_visit_limit)
    : 100;

  // The maximum referral amount they can use is the smaller of their balance or the cap
  const referralUsable = Math.min(referralBal, perVisitCap);

  const activeBalance =
    walletSource === "cashback" ? cashbackBal :
    walletSource === "referral" ? referralUsable : 0;

  const gross = Number(grossAmount);
  const cPct  = Number(cashbackPct);

  // ─── UPDATED CALCULATION LOGIC ──────────────────────────────────────
  let redemptionAmount = 0;

  if (walletSource === "referral") {
    // For referral: Ignore the percentage slider and apply the flat discount cap
    // We use the smaller of the 'activeBalance' (which is capped at ₹100) or the bill
    redemptionAmount = Math.min(activeBalance, gross);
  } else if (walletSource === "cashback") {
    // For cashback: Keep using the percentage slider (e.g., 5% of bill)
    const rPct             = Number(redemptionPct);
    const redemptionMax    = Math.round(gross * rPct / 100 * 100) / 100;
    redemptionAmount       = Math.min(redemptionMax, activeBalance);
  }
  // ────────────────────────────────────────────────────────────────────

  const netAmount      = gross - redemptionAmount;
  const cashbackEarned = Math.round(netAmount * cPct / 100 * 100) / 100;

  let daysUntilExpiry: number | null = null;
  if (expiresAt) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    daysUntilExpiry = Math.max(0, Math.ceil(diff / 86400000));
  }

  return {
    cashbackBalance:   cashbackBal,
    referralBalance:   referralBal,
    referralUsableCap: referralUsable,
    activeBalance,
    redemptionAmount,
    netAmount,
    cashbackEarned,
    projectedCashback: walletSource === "cashback"
      ? cashbackBal - redemptionAmount + cashbackEarned
      : cashbackBal + cashbackEarned,
    projectedReferral: walletSource === "referral"
      ? referralBal - redemptionAmount
      : referralBal,
    walletExpiresAt:   expiresAt,
    daysUntilExpiry,
  };
}
// ══════════════════════════════════════════════════════════════
// PROCESS BILL
// ══════════════════════════════════════════════════════════════

export async function processBill(payload: BillPayload): Promise<BillResult> {
  const {
    customerId, billedBy, grossAmount,
    redemptionPct, cashbackPct, paymentMethod, walletSource,
  } = payload;

  // 1. Basic Validations
  if (Number(grossAmount) <= 0) return { success: false, error: "Bill amount must be greater than zero." };

  const svc = svcClient();

  // 2. Fetch Shop Configuration and Profile
  const [config, profileRes] = await Promise.all([
    getShopConfig(),
    svc.from("profiles")
      .select("referral_balance, referral_usage_count, total_referrals")
      .eq("id", customerId)
      .single()
  ]);

  const profile = profileRes.data;
  if (!config) return { success: false, error: "Could not load shop settings." };

  let finalRedemptionPct = Number(redemptionPct);

  // 3. Referral Logic Enforcement
  if (walletSource === "referral") {
    const totalReferrals = profile?.total_referrals ?? 0;
    const usageCount = profile?.referral_usage_count ?? 0;
    const perVisitLimit = config.referral_per_visit_limit ?? 100;
    const dynamicUsageLimit = totalReferrals * 2;

    if (totalReferrals === 0) return { success: false, error: "No referrals available." };
    if (usageCount >= dynamicUsageLimit) return { success: false, error: "Usage limit reached." };

    // FIX: Send the flat amount (e.g., 100) to the database
    const availableBalance = Number(profile?.referral_balance ?? 0);
    // The discount is the smaller of: Balance OR ₹100 Cap OR Total Bill
    finalRedemptionPct = Math.min(availableBalance, perVisitLimit, Number(grossAmount));
  }

  // 4. Execute Transaction via Database RPC
  // Note: We use 'svc' here because that is how it is defined at the top of your function
  const { data: rpcData, error: rpcErr } = await svc.rpc("process_bill", {
    p_customer_id:    String(customerId),
    p_billed_by:      String(billedBy),
    p_gross_amount:   Number(Number(grossAmount).toFixed(2)),
    p_redemption_pct: Number(finalRedemptionPct.toFixed(2)),
    p_cashback_pct:   Number(Number(cashbackPct).toFixed(2)),
    p_payment_method: String(paymentMethod),
    p_wallet_source:  String(walletSource ?? "cashback"),
  });
  if (rpcErr) return { success: false, error: rpcErr.message };

  const raw = rpcData as Record<string, any> | null;
  const bill: BillSummary = {
    id: String(raw?.bill_id ?? ""),
    gross_amount:      Number(raw?.gross_amount      ?? 0),
    redemption_amount: Number(raw?.redemption_amount ?? 0),
    net_amount:        Number(raw?.net_amount        ?? 0),
    cashback_earned:   Number(raw?.cashback_earned   ?? 0),
    wallet_source:     String(raw?.wallet_source     ?? walletSource),
  };

  // 5. Update Usage Count ONLY if Referral was used
  if (walletSource === "referral" && bill.redemption_amount > 0) {
    await svc.rpc('increment_referral_usage', { p_user_id: customerId });
  }

  // 6. Fetch updated profile for UI and Emails
  const { data: updatedProfile } = await svc
    .from("profiles")
    .select("cashback_balance, referral_balance, email, full_name, is_first_purchase_done")
    .eq("id", String(customerId))
    .single();

  // 7. Revalidate UI
  revalidatePath("/admin/billing");
  revalidatePath("/admin/customers");
  revalidatePath("/dashboard");

  return {
    success:            true,
    bill,
    newCashbackBalance: Number(updatedProfile?.cashback_balance ?? 0),
    newReferralBalance: Number(updatedProfile?.referral_balance ?? 0),
    referralBonusPaid:  updatedProfile?.is_first_purchase_done === true,
  };
}
export async function getAnalytics(): Promise<{
  summary:      AnalyticsSummary | null;
  revenueByDay: DayRevenue[];
}> {
  const svc = svcClient();
  const [sumRes, dayRes] = await Promise.all([
    svc.from("analytics_summary").select("*").single(),
    svc.from("revenue_by_day").select("*"),
  ]);
  if (sumRes.error) console.error("[getAnalytics] summary:", sumRes.error.message);
  if (dayRes.error) console.error("[getAnalytics] by_day:",  dayRes.error.message);
  return {
    summary:      (sumRes.data as AnalyticsSummary) ?? null,
    revenueByDay: (dayRes.data as DayRevenue[])     ?? [],
  };
}

// ══════════════════════════════════════════════════════════════
// ALL USERS
// ══════════════════════════════════════════════════════════════

export async function getAllUsers(query?: string): Promise<CustomerRow[]> {
  // We now query 'customer_stats' instead of 'profiles' to get calculated totals
  let builder = svcClient()
    .from("customer_stats") 
    .select("*")
    .order("full_name", { ascending: true });

  if (query?.trim()) {
    const q = String(query).trim();
    // Optimized search across primary identification fields
    builder = builder.or(
      `email.ilike.%${q}%,phone.ilike.%${q}%,full_name.ilike.%${q}%,username.ilike.%${q}%`
    );
  }

  const { data, error } = await builder;
  
  if (error) { 
    console.error("[getAllUsers] Database Error:", error.message); 
    return []; 
  }

  return (data ?? []).map((r: any): CustomerRow => ({
    id:               String(r.id               ?? ""),
    full_name:        r.full_name               ?? null,
    username:         String(r.username         ?? ""),
    email:            r.email                   ?? null,
    phone:            r.phone                   ?? null,
    role:             "customer", 
    // Wallet balance is now the sum of their two actual balances
    wallet_balance:   Number(r.cashback_balance ?? 0) + Number(r.referral_balance ?? 0),
    cashback_balance: Number(r.cashback_balance ?? 0),
    referral_balance: Number(r.referral_balance ?? 0),
    // These values are now calculated live from the 'bills' table via the View
    total_spent:      Number(r.total_spent      ?? 0),
    visit_count:      Number(r.visit_count      ?? 0),
    total_referrals:  Number(r.total_referrals  ?? 0),
    referral_code:    r.referral_code           ?? null,
    created_at:       String(r.created_at       ?? ""),
    wallet_expires_at: r.wallet_expires_at      ?? null,
  }));
}
// ══════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ══════════════════════════════════════════════════════════════

function toCustomerSearchResult(r: any): CustomerSearchResult {
  return {
    id:                String(r.id               ?? ""),
    username:          String(r.username         ?? ""),
    full_name:         r.full_name               ?? null,
    email:             r.email                   ?? null,
    phone:             r.phone                   ?? null,
    wallet_balance:    Number(r.wallet_balance   ?? 0),
    cashback_balance:  Number(r.cashback_balance ?? 0),
    referral_balance:  Number(r.referral_balance ?? 0),
    total_spent:       Number(r.total_spent      ?? 0),
    visit_count:       Number(r.visit_count      ?? 0),
    referral_code:     r.referral_code           ?? null,
    wallet_expires_at: r.wallet_expires_at       ?? null,
  };
}
