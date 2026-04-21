// middleware.ts  ─ ROOT OF PROJECT
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Route Protection Middleware
//
// Rules:
//   /admin/*  → requires role admin | super_admin  → else /login
//   /dashboard → requires any authenticated user   → else /login
//   /login, /register, /forgot-password, /reset-password → public
//   / (homepage) → always public
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";

// Routes that require NO authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

// Routes that require admin or super_admin role
const ADMIN_PREFIX = "/admin";

// Routes that require any authenticated user
const PROTECTED_PREFIX = "/dashboard";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Always allow public paths ──────────────────────────
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")        // static files
  ) {
    return NextResponse.next();
  }

  // ── 2. Read session cookies ────────────────────────────────
  const accessToken  = req.cookies.get("sb-access-token")?.value;
  const refreshToken = req.cookies.get("sb-refresh-token")?.value;

  const loginUrl = new URL("/login", req.url);

  // No token → redirect everything to login
  if (!accessToken) {
    // Preserve intended destination so we can redirect back after login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. Validate token & read role (server-side) ────────────
  try {
    const svc = createClient(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL),
      String(process.env.SUPABASE_SERVICE_ROLE_KEY),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: userData, error: userErr } = await svc.auth.getUser(
      String(accessToken)
    );

    if (userErr || !userData?.user) {
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await svc
      .from("profiles")
      .select("role")
      .eq("id", String(userData.user.id))
      .single();

    const role = String(profile?.role ?? "customer");

    // ── 4. Admin routes: require admin or super_admin ─────────
    if (pathname.startsWith(ADMIN_PREFIX)) {
      if (role !== "admin" && role !== "super_admin") {
        // Customer trying to access admin → go to their dashboard
        if (role === "customer") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    // ── 5. Customer dashboard: any authenticated user ─────────
    if (pathname.startsWith(PROTECTED_PREFIX)) {
      return NextResponse.next();
    }

    return NextResponse.next();

  } catch (err) {
    console.error("[middleware] error:", err);
    return NextResponse.redirect(loginUrl);
  }
}

// Only run middleware on relevant paths (skip static assets)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
