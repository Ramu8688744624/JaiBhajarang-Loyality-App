// app/admin/billing/page.tsx
// ══════════════════════════════════════════════════════════════
// Server component wrapper: reads session once server-side and
// passes adminId + shopConfig as props to the client terminal.
// This ELIMINATES the "Session Loading" bug completely —
// adminId is NEVER undefined when the client component mounts.
// ══════════════════════════════════════════════════════════════

import { cookies }      from "next/headers";
import { redirect }     from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getShopConfig, type ShopConfig } from "@/lib/actions/billing";
import BillingTerminal  from "./BillingTerminal";

export default async function AdminBillingPage() {
  // ── 1. Validate session server-side ───────────────────────
  const jar         = await cookies();
  const accessToken = jar.get("sb-access-token")?.value;
  if (!accessToken) redirect("/login?next=/admin/billing");

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error } = await svc.auth.getUser(accessToken);
  if (error || !authData?.user) redirect("/login?next=/admin/billing");

  const userId = authData.user.id;

  // ── 2. Verify admin/super_admin role ──────────────────────
  const { data: profile } = await svc
    .from("profiles")
    .select("role, username, full_name")
    .eq("id", userId)
    .single();

  const role = String(profile?.role ?? "customer");
  if (role !== "admin" && role !== "super_admin") redirect("/dashboard");

  // ── 3. Fetch shop config once (server-side) ───────────────
  const config = await getShopConfig();

  // ── 4. Render client terminal with guaranteed adminId ─────
  return (
    <BillingTerminal
      adminId={userId}
      adminName={profile?.full_name ?? profile?.username ?? "Admin"}
      config={config}
    />
  );
}
