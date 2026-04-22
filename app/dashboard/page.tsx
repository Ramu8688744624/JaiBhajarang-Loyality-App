// app/dashboard/page.tsx  ─ PRODUCTION FINAL
// ══════════════════════════════════════════════════════════════
// Server component: validates session, fetches all dashboard
// data including dual wallet balances and pending referrals.
// ══════════════════════════════════════════════════════════════

import { cookies }      from "next/headers";
import { redirect }     from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getShopSettings } from "@/lib/actions/settings";
import DashboardClient  from "./DashboardClient";

export default async function DashboardPage() {
  // ── 1. Validate session ──────────────────────────────────
  const jar         = await cookies();
  const accessToken = jar.get("sb-access-token")?.value;
  if (!accessToken) redirect("/login");

  const svc = createClient(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL),
    String(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authErr } = await svc.auth.getUser(accessToken);
  if (authErr || !authData?.user) redirect("/login");

  const userId = authData.user.id;

  // ── 2. Parallel data fetch ───────────────────────────────
  const [
    settingsRes,
    profileRes,
    billsRes,
    milestonesRes,
    tiersRes,
    userMilestonesRes,
    pendingReferralsRes,
  ] = await Promise.all([
    getShopSettings(),

    svc
      .from("profiles")
      .select(
        "id, full_name, username, email, phone, role," +
        " wallet_balance, cashback_balance, referral_balance," +
        " total_spent, visit_count, referral_code," +
        " wallet_expires_at, last_activity_at"
      )
      .eq("id", userId)
      .single(),

    svc
      .from("bills")
      .select("id, gross_amount, redemption_amount, net_amount, cashback_earned, payment_method, wallet_source, created_at")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),

    svc
      .from("milestones")
      .select("id, label, visit_count, reward_type, reward_value")
      .eq("is_active", true)
      .order("visit_count"),

    svc
      .from("gift_tiers")
      .select("id, label, min_spend, max_spend, tier_color, gift_inventory(id, name, description, stock, is_active)")
      .eq("is_active", true)
      .order("min_spend"),

    svc
      .from("user_milestones")
      .select("id, redeemed, redeemed_at, milestones(id, label, reward_type, reward_value)")
      .eq("profile_id", userId),

    // Referrals I made where the referee hasn't bought yet
    svc
      .from("profiles")
      .select("id, full_name, username, email, phone")
      .eq("referred_by", userId)
      .eq("is_first_purchase_done", false)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data;

  // ── 3. If profile is truly missing, show a safe state ────
  // (can happen briefly after registration while trigger runs)
  // DashboardClient handles null profile with a loading state.

  return (
    <DashboardClient
      settings={settingsRes}
      profile={profile}
      bills={billsRes.data ?? []}
      milestones={milestonesRes.data ?? []}
      giftTiers={tiersRes.data ?? []}
      userMilestones={userMilestonesRes.data ?? []}
      pendingReferrals={pendingReferralsRes.data ?? []}
    />
  );
}
