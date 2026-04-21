// app/dashboard/page.tsx  ─ v4 FINAL
// ══════════════════════════════════════════════════════════════
// Server component — fetches all data including:
//   • dual wallet balances (cashback + referral)
//   • pending referrals (people I referred who haven't bought yet)
// ══════════════════════════════════════════════════════════════

import { cookies }      from "next/headers";
import { redirect }     from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getShopSettings } from "@/lib/actions/settings";
import DashboardClient  from "./DashboardClient";

export default async function DashboardPage() {
  const jar         = await cookies();
  const accessToken = jar.get("sb-access-token")?.value;
  if (!accessToken) redirect("/login");

  const svc = createClient(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL),
    String(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: userData, error: userErr } = await svc.auth.getUser(accessToken);
  if (userErr || !userData.user) redirect("/login");
  const userId = userData.user.id;

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
      .select("id, full_name, username, email, phone, role, wallet_balance, cashback_balance, referral_balance, total_spent, visit_count, referral_code, wallet_expires_at")
      .eq("id", userId)
      .single(),

    svc
      .from("bills")
      .select("*")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),

    svc
      .from("milestones")
      .select("*")
      .eq("is_active", true)
      .order("visit_count"),

    svc
      .from("gift_tiers")
      .select("*, gift_inventory(*)")
      .eq("is_active", true)
      .order("min_spend"),

    svc
      .from("user_milestones")
      .select("*, milestones(*)")
      .eq("profile_id", userId),

    // People I referred who haven't made their first purchase yet
    svc
      .from("profiles")
      .select("id, full_name, username, email, phone")
      .eq("referred_by", userId)
      .eq("is_first_purchase_done", false),
  ]);

  return (
    <DashboardClient
      settings={settingsRes}
      profile={profileRes.data}
      bills={billsRes.data ?? []}
      milestones={milestonesRes.data ?? []}
      giftTiers={tiersRes.data ?? []}
      userMilestones={userMilestonesRes.data ?? []}
      pendingReferrals={pendingReferralsRes.data ?? []}
    />
  );
}
