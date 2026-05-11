// ═══════════════════════════════════════════════════════════════
// FILE: components/NavbarServer.tsx
// ─────────────────────────────────────────────────────────────
// Async server component — fetches shop settings + user profile
// from DB, passes them as plain props to the client Navbar.
// Import THIS in app/layout.tsx (not the client Navbar directly).
// ═══════════════════════════════════════════════════════════════
// "use server" is implicit for async server components — no
// directive needed. Do NOT add "use client" here.

import { cookies }       from "next/headers";
import { createClient }  from "@supabase/supabase-js";
import NavbarClient      from "./NavbarClient";

export default async function Navbar({ shopName, logoUrl }: { shopName?: string; logoUrl?: string | null }) {
  // Read httpOnly session cookie
  const jar         = await cookies();
  const accessToken = jar.get("sb-access-token")?.value ?? null;

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Normalise shop name if provided and preserve fallback defaults
  const rawName = String(shopName ?? "").trim();
  const normalizedShopName =
    rawName === "" ||
    rawName.toLowerCase() === "jai bhajarang" ||
    rawName.toLowerCase() === "jai bhajarang mobiles"
      ? "Jai Bhajarang Mobiles"
      : rawName;

  let userId:   string | null = null;
  let userRole: string | null = null;
  let userName: string | null = null;

  if (accessToken) {
    const { data: authData } = await svc.auth.getUser(accessToken);
    if (authData?.user) {
      userId = authData.user.id;
      const { data: profile } = await svc
        .from("profiles")
        .select("role, username, full_name")
        .eq("id", userId)
        .single();
      userRole = profile?.role ?? null;
      userName = profile?.full_name ?? profile?.username ?? null;
    }
  }

  return (
    <NavbarClient
      shopName={normalizedShopName}
      logoUrl={logoUrl ?? null}
      userRole={userRole}
      userName={userName}
    />
  );
}
