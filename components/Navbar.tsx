"use client";
// components/Navbar.tsx  (v2 — RBAC-aware)
// ─────────────────────────────────────────────────────────────
// Dynamic navbar for Jai Bajrang Mobiles
// Links shown based on role:
//   super_admin → Analytics + Settings + Billing + Customers
//   admin       → Billing + Customers only
//   customer    → Dashboard + Gifts
// No @supabase/auth-helpers. Uses createClient directly.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { logout } from "@/lib/actions/auth";

// ─── Types ────────────────────────────────────────────────────

type Role = "super_admin" | "admin" | "customer" | null;

interface NavProps {
  shopName:    string;
  shopLogoUrl?: string | null;
  userRole:    Role;
  userName?:   string | null;
}

interface NavLink {
  href:  string;
  label: string;
  icon:  string;
}

// ─── Role → links map ─────────────────────────────────────────

function getLinks(role: Role): NavLink[] {
  if (role === "super_admin") {
    return [
      { href: "/admin/billing",   label: "Billing",   icon: "🧾" },
      { href: "/admin/dashboard", label: "Analytics", icon: "📊" },
      { href: "/admin/settings",  label: "Settings",  icon: "⚙️" },
      { href: "/admin/customers", label: "Customers", icon: "👥" },
    ];
  }
  if (role === "admin") {
    return [
      { href: "/admin/billing",   label: "Billing",   icon: "🧾" },
      { href: "/admin/customers", label: "Customers", icon: "👥" },
    ];
  }
  // customer
  return [
    { href: "/dashboard",        label: "Wallet",  icon: "💼" },
    { href: "/dashboard/gifts",  label: "Gifts",   icon: "🎁" },
  ];
}

function roleBadgeStyle(role: Role): { label: string; bg: string; color: string } {
  if (role === "super_admin") return { label: "Super Admin", bg: "rgba(212,168,67,0.2)",  color: "#D4A843" };
  if (role === "admin")       return { label: "Staff",       bg: "rgba(37,99,235,0.2)",   color: "#60A5FA" };
  return                               { label: "Member",      bg: "rgba(100,116,139,0.2)", color: "#94A3B8" };
}

// ─── Component ───────────────────────────────────────────────

export default function Navbar({ shopName, shopLogoUrl, userRole, userName }: NavProps) {
  const [open,    setOpen]    = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setOpen(false), [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  };

  const links  = getLinks(userRole);
  const badge  = roleBadgeStyle(userRole);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0A0F1E]/95 backdrop-blur-md shadow-xl shadow-black/40"
            : "bg-[#0A0F1E]"
        }`}
        style={{ borderBottom: "1px solid rgba(212,168,67,0.18)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Brand */}
            <Link
              href={userRole === "customer" ? "/dashboard" : "/admin/billing"}
              className="flex items-center gap-2.5 flex-shrink-0 min-w-0"
            >
              {shopLogoUrl ? (
                <img src={shopLogoUrl} alt={shopName}
                  className="h-9 w-9 rounded-xl object-cover border border-[#D4A843]/30 flex-shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}>
                  📱
                </div>
              )}
              <span className="font-bold text-sm md:text-base tracking-tight truncate"
                style={{ color: "#D4A843", maxWidth: 160 }}>
                {shopName}
              </span>
            </Link>

            {/* Desktop links */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(l.href)
                      ? "text-[#D4A843] bg-[#D4A843]/10"
                      : "text-slate-400 hover:text-[#D4A843] hover:bg-[#D4A843]/5"
                  }`}>
                  <span className="text-base leading-none">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Desktop right */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44` }}>
                {badge.label}
              </span>
              {userName && (
                <span className="text-sm text-slate-400 max-w-[120px] truncate">{userName}</span>
              )}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50">
                {signingOut ? "…" : "Sign out"}
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg gap-[5px] transition-colors hover:bg-white/5"
              aria-label="Toggle menu"
            >
              <span className={`block h-[2px] bg-[#D4A843] transition-all duration-300 ${open ? "w-5 rotate-45 translate-y-[7px]" : "w-5"}`} />
              <span className={`block h-[2px] bg-[#D4A843] transition-all duration-300 ${open ? "w-0 opacity-0" : "w-4"}`} />
              <span className={`block h-[2px] bg-[#D4A843] transition-all duration-300 ${open ? "w-5 -rotate-45 -translate-y-[7px]" : "w-5"}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            open ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ borderTop: open ? "1px solid rgba(212,168,67,0.12)" : "none" }}
        >
          <div className="bg-[#0A0F1E] px-4 py-3 space-y-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(l.href)
                    ? "text-[#D4A843] bg-[#D4A843]/10"
                    : "text-slate-400 hover:text-[#D4A843] hover:bg-[#D4A843]/5"
                }`}>
                <span className="text-xl leading-none">{l.icon}</span>
                {l.label}
              </Link>
            ))}

            {/* Mobile footer */}
            <div className="pt-3 mt-2 border-t border-white/5">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44` }}>
                    {badge.label}
                  </span>
                  {userName && (
                    <span className="text-xs text-slate-500 max-w-[120px] truncate">{userName}</span>
                  )}
                </div>
                <button onClick={handleSignOut} disabled={signingOut}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                  {signingOut ? "…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Push page content below fixed nav */}
      <div className="h-16" />
    </>
  );
}

// ─── Wrapper for app/layout.tsx ───────────────────────────────
// Drop this in layout.tsx to auto-wire Navbar server-side:
//
// // components/NavbarWrapper.tsx
// import { cookies } from "next/headers";
// import { createClient } from "@supabase/supabase-js";
// import { getShopSettings } from "@/lib/actions/settings";
// import Navbar from "./Navbar";
//
// export default async function NavbarWrapper() {
//   const jar     = await cookies();
//   const token   = jar.get("sb-access-token")?.value;
//   if (!token) return null;
//
//   const svc = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { autoRefreshToken: false, persistSession: false } }
//   );
//
//   const [{ data: userData }, settings] = await Promise.all([
//     svc.auth.getUser(token),
//     getShopSettings(),
//   ]);
//   if (!userData.user) return null;
//
//   const { data: profile } = await svc
//     .from("profiles")
//     .select("role, username, full_name")
//     .eq("id", userData.user.id)
//     .single();
//
//   return (
//     <Navbar
//       shopName={settings?.shop_name ?? "Jai Bajrang Mobiles"}
//       shopLogoUrl={settings?.shop_logo_url}
//       userRole={profile?.role ?? "customer"}
//       userName={profile?.username ?? profile?.full_name}
//     />
//   );
// }
