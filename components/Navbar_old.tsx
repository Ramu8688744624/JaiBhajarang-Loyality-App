"use client";
// components/Navbar.tsx  ─ PRODUCTION FINAL
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Dynamic Navbar
//
// • Shop name + logo fetched from DB (never hardcoded)
// • Role-aware nav links (super_admin / admin / customer)
// • Logout uses router.replace('/') + router.refresh()
//   so back-button cannot return to a protected page
// • 30-day session handled via cookies (set in auth.ts)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import Link                    from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient }        from "@supabase/supabase-js";
import { logout }              from "@/lib/actions/auth";
import { getShopSettings }     from "@/lib/actions/settings";

// ─── Types ───────────────────────────────────────────────────

type Role = "super_admin" | "admin" | "customer" | null;

interface NavLink { href: string; label: string; icon: string }

// ─── Role → navigation links ─────────────────────────────────

function getLinks(role: Role): NavLink[] {
  if (role === "super_admin") return [
    { href: "/admin/billing",   label: "Billing",   icon: "🧾" },
    { href: "/admin/dashboard", label: "Analytics", icon: "📊" },
    { href: "/admin/settings",  label: "Settings",  icon: "⚙️" },
    { href: "/admin/customers", label: "Customers", icon: "👥" },
  ];
  if (role === "admin") return [
    { href: "/admin/billing",   label: "Billing",   icon: "🧾" },
    { href: "/admin/customers", label: "Customers", icon: "👥" },
  ];
  return [
    { href: "/dashboard",       label: "Wallet",    icon: "💼" },
    { href: "/dashboard/gifts", label: "Gifts",     icon: "🎁" },
  ];
}

function badgeConfig(role: Role) {
  if (role === "super_admin") return { label: "Super Admin", color: "#D4A843", bg: "rgba(212,168,67,0.18)" };
  if (role === "admin")       return { label: "Staff",       color: "#60A5FA", bg: "rgba(96,165,250,0.18)" };
  return                             { label: "Member",      color: "#64748B", bg: "rgba(100,116,139,0.18)" };
}

// ─── Props ───────────────────────────────────────────────────

interface NavbarProps {
  /** Passed from server layout; falls back to DB fetch if empty */
  initialShopName?:   string;
  initialLogoUrl?:    string | null;
  initialRole?:       Role;
  initialUserName?:   string | null;
}

// ─── Component ───────────────────────────────────────────────

export default function Navbar({
  initialShopName,
  initialLogoUrl,
  initialRole,
  initialUserName,
}: NavbarProps) {
  const [shopName,  setShopName]  = useState(initialShopName ?? "");
  const [logoUrl,   setLogoUrl]   = useState<string | null>(initialLogoUrl ?? null);
  const [role,      setRole]      = useState<Role>(initialRole ?? null);
  const [userName,  setUserName]  = useState<string | null>(initialUserName ?? null);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [scrolled,  setScrolled]  = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const pathname = usePathname();
  const router   = useRouter();

  // ── Scroll effect ──────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // ── Close mobile menu on route change ─────────────────────
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // ── Client-side hydration: fetch shop + user if not passed ─
  useEffect(() => {
    // Fetch shop name from DB (overrides any stale prop)
    getShopSettings().then((s) => {
      if (!s) return;
      const name = s.shop_name?.trim();
      // Normalise common misspellings
      const display = (name === "Jai Bhajarang" || name === "Jai Bhajarang Mobiles")
        ? "Jai Bajrang Mobiles"
        : (name || "Jai Bajrang Mobiles");
      setShopName(display);
      setLogoUrl(s.shop_logo_url ?? null);
    });

    // Fetch current user role
    const sb = createClient(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL),
      String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    sb.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) return;
      sb.from("profiles")
        .select("role, username, full_name")
        .eq("id", uid)
        .single()
        .then(({ data: p }) => {
          if (!p) return;
          setRole(p.role as Role);
          setUserName(p.full_name ?? p.username ?? null);
        });
    });
  }, []);

  // ── Sign out ────────────────────────────────────────────────
  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    // Replace instead of push: removes the protected page from
    // browser history so the Back button cannot return to it.
    router.replace("/");
    router.refresh();
  };

  const links  = getLinks(role);
  const badge  = badgeConfig(role);
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  const displayName = shopName || "Jai Bajrang Mobiles";

  return (
    <>
      {/* ── Fixed navbar ─────────────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0A0F1E]/96 backdrop-blur-lg shadow-xl shadow-black/50"
            : "bg-[#0A0F1E]"
        }`}
        style={{ borderBottom: "1px solid rgba(212,168,67,0.15)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Brand */}
            <Link
              href={role === "customer" ? "/dashboard" : role ? "/admin/billing" : "/"}
              className="flex items-center gap-2.5 flex-shrink-0 min-w-0 group"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="h-9 w-9 rounded-xl object-cover border border-[#D4A843]/30 flex-shrink-0"
                />
              ) : (
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
                >
                  📱
                </div>
              )}
              <div className="min-w-0">
                <p
                  className="font-bold text-sm leading-tight truncate max-w-[160px] transition-colors group-hover:text-[#F5D078]"
                  style={{ color: "#D4A843" }}
                >
                  {displayName}
                </p>
                <p className="text-xs text-slate-600 leading-none">Karimnagar</p>
              </div>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-center" aria-label="Main">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive(l.href)
                      ? "text-[#D4A843] bg-[#D4A843]/12"
                      : "text-slate-400 hover:text-[#D4A843] hover:bg-[#D4A843]/6"
                  }`}
                >
                  <span className="text-base leading-none">{l.icon}</span>
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* Desktop right: badge + name + sign out */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {role && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44` }}
                >
                  {badge.label}
                </span>
              )}
              {userName && (
                <span className="text-sm text-slate-400 max-w-[120px] truncate">{userName}</span>
              )}
              {role ? (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-white/6 transition-all disabled:opacity-50"
                >
                  {signingOut ? "…" : "Sign out"}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-semibold px-4 py-1.5 rounded-xl transition-all active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl gap-[5px] hover:bg-white/6 transition-colors flex-shrink-0"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className={`block h-[2px] bg-[#D4A843] transition-all duration-300 ${menuOpen ? "w-5 rotate-45 translate-y-[7px]" : "w-5"}`} />
              <span className={`block h-[2px] bg-[#D4A843] transition-all duration-300 ${menuOpen ? "w-0 opacity-0" : "w-4"}`} />
              <span className={`block h-[2px] bg-[#D4A843] transition-all duration-300 ${menuOpen ? "w-5 -rotate-45 -translate-y-[7px]" : "w-5"}`} />
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ borderTop: menuOpen ? "1px solid rgba(212,168,67,0.12)" : "none" }}
        >
          <div className="bg-[#0A0F1E] px-4 py-3 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive(l.href)
                    ? "text-[#D4A843] bg-[#D4A843]/10"
                    : "text-slate-400 hover:text-[#D4A843] hover:bg-[#D4A843]/6"
                }`}
              >
                <span className="text-xl leading-none">{l.icon}</span>
                {l.label}
              </Link>
            ))}

            {/* Mobile footer row */}
            <div className="pt-3 mt-2 border-t border-white/6 px-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {role && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44` }}
                  >
                    {badge.label}
                  </span>
                )}
                {userName && (
                  <span className="text-xs text-slate-500 truncate max-w-[100px]">{userName}</span>
                )}
              </div>
              {role ? (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-white/6 transition-all"
                >
                  {signingOut ? "…" : "Sign out"}
                </button>
              ) : (
                <Link href="/login"
                  className="text-sm font-semibold px-4 py-1.5 rounded-xl"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer — keeps content below fixed nav */}
      <div className="h-16" aria-hidden="true" />
    </>
  );
}
