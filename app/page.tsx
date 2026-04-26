// app/page.tsx  ─ SMART PUBLIC HOMEPAGE
// ══════════════════════════════════════════════════════════════
// Server component: reads session cookie and passes isLoggedIn +
// dashboardHref as props to the client content component.
// This eliminates the useEffect race condition entirely —
// the CTA button is correct on the VERY FIRST render.
// ══════════════════════════════════════════════════════════════

import { cookies }      from "next/headers";
import { createClient } from "@supabase/supabase-js";
import HomeClient       from "./HomeClient";

export default async function HomePage() {
  const jar         = await cookies();
  const accessToken = jar.get("sb-access-token")?.value ?? null;

  let isLoggedIn   = false;
  let dashboardHref = "/dashboard";

  if (accessToken) {
    try {
      const svc = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: authData } = await svc.auth.getUser(accessToken);
      if (authData?.user) {
        isLoggedIn = true;
        const { data: profile } = await svc
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();
        const role = profile?.role ?? "customer";
        dashboardHref =
          role === "admin" || role === "super_admin"
            ? "/admin/billing"
            : "/dashboard";
      }
    } catch {
      // Token invalid — treat as logged-out
    }
  }

  return <HomeClient isLoggedIn={isLoggedIn} dashboardHref={dashboardHref} />;
}
