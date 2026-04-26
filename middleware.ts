// middleware.ts  ─ PROJECT ROOT (next to app/, package.json)
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Production Route Guard
//
// Export name MUST be `middleware` — Next.js ignores any other.
// `proxy` is an alias re-export for any wrapper that uses it.
//
// Role mapping (matches profiles.role values in Supabase):
//   'super_admin' → full access to /admin/*
//   'admin'       → full access to /admin/*   ← FIX: was broken
//   'customer'    → /dashboard only
//
// Back-button protection:
//   Every protected response gets Cache-Control: no-store so
//   the browser never serves a cached page after logout.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

// ─── Public paths (no auth needed) ───────────────────────────
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/terms",
]);

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // 1. Pass through Next.js internals and static assets immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/")  ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Public paths — always accessible
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // 3. Read the httpOnly session cookie set by auth.ts
  const accessToken = req.cookies.get("sb-access-token")?.value;
  const loginUrl    = new URL("/login", req.url);

  if (!accessToken) {
    if (pathname !== "/login") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Validate token server-side — service role bypasses RLS
  try {
    const svc = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authData, error } = await svc.auth.getUser(accessToken);

    if (error || !authData?.user) {
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("sb-access-token");
      res.cookies.delete("sb-refresh-token");
      return res;
    }

    const { data: profile } = await svc
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const role = String(profile?.role ?? "customer");
    const isStaff = role === "admin" || role === "super_admin";

    // 5. /admin/* requires admin or super_admin
    if (pathname.startsWith("/admin")) {
      if (!isStaff) {
        // Authenticated customer → their own dashboard
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 6. Attach no-store headers — prevents back-button cache after logout
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;

  } catch (err) {
    console.error("[middleware]", err);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// Re-export alias so any import of `proxy` still works
export { middleware as proxy };

// Apply to all routes except static files
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt)$).*)",
  ],
};
