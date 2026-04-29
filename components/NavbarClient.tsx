"use client";
// components/NavbarClient.tsx
// ══════════════════════════════════════════════════════════════
// Receives server-fetched props — zero client-side DB calls.
// No useEffect, no "Session Loading", no race conditions.
//
// Role → display label:
//   super_admin → "Super Admin"
//   admin       → "Admin"       ← was incorrectly "Staff" before
//   customer    → "Member"
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import Link                    from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logout }              from "@/lib/actions/auth";

// ─── Types ───────────────────────────────────────────────────

type Role = "super_admin" | "admin" | "customer" | null;
type Language = "en" | "te" | "hi";

interface NavLink { href: string; label: string; icon: string }

interface Props {
  shopName:    string;
  shopLogoUrl: string | null;
  userRole:    string | null;
  userName:    string | null;
}

// ─── Navigation links per role ────────────────────────────────

function getLinks(role: string | null): NavLink[] {
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
  if (role === "customer") return [
    { href: "/dashboard",       label: "Wallet",    icon: "💼" },
    { href: "/dashboard/gifts", label: "Gifts",     icon: "🎁" },
  ];
  // Unauthenticated
  return [];
}

// Role badge config — correct labels
function getBadge(role: string | null) {
  switch (role) {
    case "super_admin": return { label: "Super Admin", color: "#D4A843", bg: "rgba(212,168,67,0.18)" };
    case "admin":       return { label: "Admin",       color: "#60A5FA", bg: "rgba(96,165,250,0.16)" };
    case "customer":    return { label: "Member",      color: "#64748B", bg: "rgba(100,116,139,0.16)" };
    default:            return null;
  }
}

// ─── Language Switcher Sub-component ───────────────────────

interface LanguageSwitcherProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

function LanguageSwitcher({ language, onLanguageChange }: LanguageSwitcherProps) {
  const languages: Array<{ code: Language; label: string }> = [
    { code: "en", label: "EN" },
    { code: "te", label: "తె" },
    { code: "hi", label: "हि" },
  ];

  return (
    <div className="flex bg-slate-900/50 rounded-lg p-1 border border-[#D4A843]/20 gap-0">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
            language === lang.code
              ? "text-[#0A0F1E]"
              : "text-slate-400 hover:text-[#D4A843]"
          }`}
          style={
            language === lang.code
              ? { backgroundColor: "#D4A843" }
              : {}
          }
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function NavbarClient({ shopName, shopLogoUrl, userRole, userName }: Props) {
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mounted,    setMounted]    = useState(false);

  const pathname = usePathname();
  const router   = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize language — default to 'en' to match server-side render
  // Only read from client-side sources after mounted to prevent hydration mismatch
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    // Component mounted — now safe to read from URL and localStorage
    setMounted(true);
    
    const langParam = searchParams.get("lang");
    if (langParam === "te" || langParam === "hi") {
      setLanguage(langParam);
      return;
    }
    
    const stored = localStorage.getItem("preferred_language");
    if (stored === "te" || stored === "hi") {
      setLanguage(stored);
    }
  }, [searchParams]);

  // Handle language change by saving to localStorage, updating URL, and refreshing
  const handleLanguageChange = (lang: Language) => {
    // Save to localStorage for persistence across sessions
    localStorage.setItem("preferred_language", lang);
    
    // Set NEXT_LOCALE cookie for server-side locale detection
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
    
    // Update URL with lang parameter
    const params = new URLSearchParams(searchParams);
    params.set("lang", lang);
    router.push(`${pathname}?${params.toString()}`);
    
    // Refresh page so server-side content picks up the new language
    window.location.reload();
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    // replace() removes the page from history → back-button can't return to it
    router.replace("/");
    router.refresh();
  };

  const links   = getLinks(userRole);
  const badge   = getBadge(userRole);
  const isAuth  = userRole !== null;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0A0F1E]/96 backdrop-blur-lg shadow-xl shadow-black/50"
            : "bg-[#0A0F1E]"
        }`}
        style={{ borderBottom: "1px solid rgba(212,168,67,0.14)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── Brand ────────────────────────────────────── */}
            <Link
              href={
                userRole === "admin" || userRole === "super_admin"
                  ? "/admin/billing"
                  : userRole === "customer"
                  ? "/dashboard"
                  : "/"
              }
              className="flex items-center gap-2.5 flex-shrink-0 group min-w-0"
            >
              {shopLogoUrl ? (
                <img
                  src={shopLogoUrl}
                  alt={shopName}
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
              <div className="min-w-0 leading-tight">
                <p
                  className="font-bold text-sm truncate max-w-[155px] transition-colors group-hover:text-[#F5D078]"
                  style={{ color: "#D4A843" }}
                >
                  {shopName}
                </p>
                <p className="text-[10px] text-slate-600 leading-none mt-0.5">Karimnagar</p>
              </div>
            </Link>

            {/* ── Desktop links ─────────────────────────────── */}
            {isAuth && (
              <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center" aria-label="Main navigation">
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
                {/* Home shortcut inside app */}
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    pathname === "/"
                      ? "text-[#D4A843] bg-[#D4A843]/12"
                      : "text-slate-500 hover:text-[#D4A843] hover:bg-[#D4A843]/6"
                  }`}
                >
                  <span className="text-base leading-none">🏠</span>
                  Home
                </Link>
              </nav>
            )}

            {/* ── Desktop right ─────────────────────────────── */}
            {/* ── Desktop right ─────────────────────────────── */}
<div className="hidden md:flex items-center gap-3 flex-shrink-0">
  
  {/* 1. Language Switcher (EN/తె/हि) */}
  <LanguageSwitcher language={language} onLanguageChange={handleLanguageChange} />

  {/* 2. My Dashboard Button (Only for Customers to avoid redundancy) */}
  {userRole === "customer" && pathname !== "/dashboard" && (
    <Link 
      href="/dashboard" 
      className="text-[#0A0F1E] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-[#F5D078] active:scale-95"
      style={{ backgroundColor: "#D4A843" }}
    >
      My Dashboard →
    </Link>
  )}

  {badge && (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}40` }}
    >
      {badge.label}
    </span>
  )}

  {userName && (
    <span className="text-sm text-slate-400 max-w-[120px] truncate">{userName}</span>
  )}

  {isAuth ? (
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
            {/* ── Mobile hamburger ──────────────────────────── */}
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

        {/* ── Mobile drawer ─────────────────────────────────── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ borderTop: menuOpen ? "1px solid rgba(212,168,67,0.1)" : "none" }}
        >
          <div className="bg-[#0A0F1E] px-4 py-3 space-y-3">
            {/* Mobile Language Switcher and Dashboard Button */}
            <div className="space-y-2 pb-2 border-b border-white/6">
              <LanguageSwitcher language={language} onLanguageChange={handleLanguageChange} />
              {userRole === "customer" && pathname !== "/dashboard" && (
                <Link 
                  href="/dashboard" 
                  className="w-full text-[#0A0F1E] px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ backgroundColor: "#D4A843" }}
                >
                  My Dashboard →
                </Link>
              )}
            </div>

            {isAuth && links.map((l) => (
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
            {/* Home link in mobile menu */}
            <Link href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-[#D4A843] hover:bg-[#D4A843]/6 transition-all">
              <span className="text-xl leading-none">🏠</span>
              Home
            </Link>

            {/* Mobile footer */}
            <div className="pt-3 mt-2 border-t border-white/6 px-4 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {badge && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}40` }}>
                    {badge.label}
                  </span>
                )}
                {userName && (
                  <span className="text-xs text-slate-500 truncate max-w-[100px]">{userName}</span>
                )}
              </div>
              {isAuth ? (
                <button onClick={handleSignOut} disabled={signingOut}
                  className="text-sm text-slate-500 hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-white/6 transition-all">
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

      {/* Spacer */}
      <div className="h-16" aria-hidden="true" />
    </>
  );
}
