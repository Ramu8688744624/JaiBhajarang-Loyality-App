// middleware.ts  ─ PROJECT ROOT
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Route Protection & Session Middleware
//
// NOTE: Next.js requires this file at the project root and the
// exported function MUST be named `middleware` (not `proxy`).
// If your framework wrapper calls it `proxy`, re-export below.
//
// Session: reads the httpOnly sb-access-token cookie we set in
// auth.ts. Tokens are validated server-side on every request to
// protected routes. No client-side auth helpers needed.
//
// Back-button protection: Protected responses get
// Cache-Control: no-store headers so the browser never caches
// the page HTML, preventing cached pages after logout.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

// ─── Route classification ─────────────────────────────────────

const PUBLIC_EXACT: Set<string> = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

const ADMIN_PREFIX     = "/admin";
const DASHBOARD_PREFIX = "/dashboard";

// ─── Main middleware ──────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always pass through static files, Next internals, API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/")  ||
    /\.[a-zA-Z0-9]+$/.test(pathname)   // has a file extension
  ) {
    return NextResponse.next();
  }

  // 2. Public pages — always allowed, no DB calls
  if (PUBLIC_EXACT.has(pathname)) {
    return NextResponse.next();
  }

  // 3. Everything else requires a valid session
  const accessToken = req.cookies.get("sb-access-token")?.value;
  const loginUrl    = new URL("/login", req.url);

  if (!accessToken) {
    // Preserve intended path so login can redirect back
    if (pathname !== "/login") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Validate token + read role (service role bypasses RLS)
  try {
    const svc = createClient(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL),
      String(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authData, error: authErr } = await svc.auth.getUser(accessToken);

    if (authErr || !authData?.user) {
      loginUrl.searchParams.set("next", pathname);
      const res = NextResponse.redirect(loginUrl);
      // Clear stale cookies
      res.cookies.delete("sb-access-token");
      res.cookies.delete("sb-refresh-token");
      return res;
    }

    const { data: profile } = await svc
      .from("profiles")
      .select("role")
      .eq("id", String(authData.user.id))
      .single();

    const role = String(profile?.role ?? "customer");

    // 5. Admin routes: staff or super_admin only
    if (pathname.startsWith(ADMIN_PREFIX)) {
      if (role !== "admin" && role !== "super_admin") {
        // Authenticated customer → their dashboard, not login
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 6. Build response with no-store headers to prevent
    //    back-button cache after logout
    const response = NextResponse.next();
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma",        "no-cache");
    response.headers.set("Expires",       "0");
    response.headers.set("Surrogate-Control", "no-store");
    return response;

  } catch (err) {
    console.error("[middleware]", err);
    return NextResponse.redirect(loginUrl);
  }
}

// Named re-export so any caller using `proxy` still works
export { middleware as proxy };

// 7. Matcher: apply to all routes except static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
