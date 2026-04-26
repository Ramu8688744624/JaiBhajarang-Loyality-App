"use client";
// app/HomeClient.tsx
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Homepage UI (client component)
// Receives isLoggedIn + dashboardHref from server — no useEffect
// needed for the login button. Language toggle is the only
// client-side state here.
// ══════════════════════════════════════════════════════════════

import { useState } from "react";
import Link         from "next/link";

type Lang = "en" | "te" | "hi";

const T = {
  en: {
    city:           "Karimnagar, Telangana",
    tagline:        "Karimnagar's Most Trusted Mobile Repair Shop",
    since:          "Serving Karimnagar since 2019  ·  10,000+ Happy Customers",
    btn_dashboard:  "My Dashboard →",
    btn_login:      "Customer Login",
    btn_register:   "Join & Get ₹500 Bonus",
    btn_shop:       "Visit Our Shop",
    highlight:      "⚡ Display Changed in Under 30 Minutes!",
    highlight_sub:  "Walk in with a cracked screen — walk out with a brand-new display. Guaranteed.",
    highlight_tags: ["✅ Original displays", "✅ Warranty included", "✅ All brands"],
    services_title: "Our Services",
    services: [
      { icon: "📱", title: "iPhone Repair",        desc: "Screen, battery, camera, charging port — all models, same day." },
      { icon: "🤖", title: "Android Repair",       desc: "Samsung, Xiaomi, OnePlus, Vivo, Oppo and every other brand." },
      { icon: "🔬", title: "Chip-Level Service",   desc: "Motherboard diagnosis & repair. Water damage recovery specialists." },
      { icon: "🖥️", title: "Display Replacement", desc: "Original & compatible screens. Done in 30 minutes — guaranteed." },
      { icon: "🔋", title: "Battery Replacement", desc: "Genuine batteries for all brands. Back to full-day charge." },
      { icon: "💧", title: "Water Damage Repair", desc: "Comprehensive cleaning, component replacement & data recovery." },
    ],
    loyalty_title:  "Loyalty Rewards Program",
    loyalty_desc:   "Every purchase earns cashback. Refer friends and earn bonus rewards. Exclusive gifts for loyal customers.",
    loyalty_points: [
      "₹500 joining bonus credited on sign-up",
      "Cashback on every purchase",
      "Earn referral bonus when friends buy",
      "Exclusive gifts at loyalty milestones",
    ],
    stats: [
      { value: "5+",      label: "Years in Karimnagar" },
      { value: "10,000+", label: "Happy Customers" },
      { value: "30 min",  label: "Display Change" },
      { value: "100%",    label: "Satisfaction" },
    ],
    contact_title: "Find Us",
    contact_info:  "Karimnagar, Telangana  ·  Open 10 AM – 9 PM, All Days",
    footer:        "© 2024 Jai Bajrang Mobiles, Karimnagar. All rights reserved.",
    terms_link:    "Terms & Conditions",
  },
  te: {
    city:           "కరీంనగర్, తెలంగాణ",
    tagline:        "కరీంనగర్ లో అత్యంత విశ్వసనీయ మొబైల్ రిపేర్ షాప్",
    since:          "2019 నుండి కరీంనగర్ కు సేవ · 10,000+ సంతోష కస్టమర్లు",
    btn_dashboard:  "నా డాష్‌బోర్డ్ →",
    btn_login:      "కస్టమర్ లాగిన్",
    btn_register:   "చేరండి & ₹500 బోనస్ పొందండి",
    btn_shop:       "షాప్ సందర్శించండి",
    highlight:      "⚡ 30 నిమిషాల్లో డిస్ప్లే మార్పు!",
    highlight_sub:  "పగిలిన స్క్రీన్ తో వచ్చి, కొత్త డిస్ప్లే తో వెళ్ళండి. గ్యారంటీ.",
    highlight_tags: ["✅ ఒరిజినల్ డిస్ప్లేలు", "✅ వారంటీ ఉంటుంది", "✅ అన్ని బ్రాండ్లు"],
    services_title: "మా సేవలు",
    services: [
      { icon: "📱", title: "iPhone రిపేర్",         desc: "అన్ని మోడళ్ళకు స్క్రీన్, బ్యాటరీ, కెమెరా. అదే రోజు." },
      { icon: "🤖", title: "Android రిపేర్",        desc: "Samsung, Xiaomi, OnePlus, Vivo మరియు ఇతర బ్రాండ్లు." },
      { icon: "🔬", title: "చిప్-లెవల్ సర్వీస్",   desc: "మదర్‌బోర్డ్ నిర్ధారణ మరియు రిపేర్. నీటి నష్టం నిపుణులు." },
      { icon: "🖥️", title: "డిస్ప్లే మార్పు",      desc: "ఒరిజినల్ స్క్రీన్లు. 30 నిమిషాల్లో పూర్తి — గ్యారంటీ." },
      { icon: "🔋", title: "బ్యాటరీ మార్పు",      desc: "అన్ని బ్రాండ్లకు అసలైన బ్యాటరీలు." },
      { icon: "💧", title: "నీటి నష్టం రిపేర్",   desc: "సమగ్ర శుభ్రపరచడం, భాగాల మార్పు మరియు డేటా రికవరీ." },
    ],
    loyalty_title:  "లాయల్టీ రివార్డ్స్",
    loyalty_desc:   "ప్రతి కొనుగోలుపై క్యాష్‌బ్యాక్. స్నేహితులను రిఫర్ చేసి బోనస్ పొందండి.",
    loyalty_points: [
      "సైన్-అప్ పై ₹500 జాయినింగ్ బోనస్",
      "ప్రతి కొనుగోలుపై క్యాష్‌బ్యాక్",
      "స్నేహితులు కొన్నప్పుడు రిఫరల్ బోనస్",
      "మైల్‌స్టోన్ గిఫ్ట్‌లు",
    ],
    stats: [
      { value: "5+",      label: "సంవత్సరాల సేవ" },
      { value: "10,000+", label: "సంతోష కస్టమర్లు" },
      { value: "30 నిమి", label: "డిస్ప్లే మార్పు" },
      { value: "100%",    label: "సంతృప్తి" },
    ],
    contact_title: "మాకు కనుగొనండి",
    contact_info:  "కరీంనగర్, తెలంగాణ · ఉదయం 10 – రాత్రి 9, అన్ని రోజులు",
    footer:        "© 2024 జై బజరంగ్ మొబైల్స్, కరీంనగర్.",
    terms_link:    "నిబంధనలు & షరతులు",
  },
  hi: {
    city:           "करीमनगर, तेलंगाना",
    tagline:        "करीमनगर का सबसे भरोसेमंद मोबाइल रिपेयर शॉप",
    since:          "2019 से करीमनगर की सेवा में · 10,000+ खुश ग्राहक",
    btn_dashboard:  "मेरा डैशबोर्ड →",
    btn_login:      "कस्टमर लॉगिन",
    btn_register:   "जॉइन करें & ₹500 बोनस पाएं",
    btn_shop:       "शॉप पर आएं",
    highlight:      "⚡ 30 मिनट में डिस्प्ले चेंज!",
    highlight_sub:  "टूटी स्क्रीन लेकर आएं — नया डिस्प्ले लेकर जाएं। गारंटी।",
    highlight_tags: ["✅ ओरिजिनल डिस्प्ले", "✅ वारंटी शामिल", "✅ सभी ब्रांड"],
    services_title: "हमारी सेवाएं",
    services: [
      { icon: "📱", title: "iPhone रिपेयर",        desc: "सभी मॉडल के लिए स्क्रीन, बैटरी, कैमरा — उसी दिन।" },
      { icon: "🤖", title: "Android रिपेयर",       desc: "Samsung, Xiaomi, OnePlus, Vivo और सभी ब्रांड।" },
      { icon: "🔬", title: "चिप-लेवल सर्विस",     desc: "मदरबोर्ड डायग्नोसिस और रिपेयर। वाटर डैमेज एक्सपर्ट।" },
      { icon: "🖥️", title: "डिस्प्ले बदलाव",      desc: "ओरिजिनल स्क्रीन। 30 मिनट में — गारंटी।" },
      { icon: "🔋", title: "बैटरी बदलाव",        desc: "सभी ब्रांड के लिए असली बैटरी।" },
      { icon: "💧", title: "वाटर डैमेज रिपेयर", desc: "पूर्ण सफाई, पार्ट्स बदलाव और डेटा रिकवरी।" },
    ],
    loyalty_title:  "लॉयल्टी रिवार्ड्स प्रोग्राम",
    loyalty_desc:   "हर खरीदारी पर कैशबैक। दोस्तों को रेफर करें और बोनस पाएं।",
    loyalty_points: [
      "साइन-अप पर ₹500 जॉइनिंग बोनस",
      "हर खरीदारी पर कैशबैक",
      "दोस्त खरीदारी करे तो रेफरल बोनस",
      "माइलस्टोन गिफ्ट्स",
    ],
    stats: [
      { value: "5+",      label: "साल की सेवा" },
      { value: "10,000+", label: "खुश ग्राहक" },
      { value: "30 मिनट", label: "डिस्प्ले चेंज" },
      { value: "100%",    label: "संतुष्टि" },
    ],
    contact_title: "हमें खोजें",
    contact_info:  "करीमनगर, तेलंगाना · सुबह 10 – रात 9, सभी दिन",
    footer:        "© 2024 जय बजरंग मोबाइल्स, करीमनगर।",
    terms_link:    "नियम और शर्तें",
  },
};

// ── Component ─────────────────────────────────────────────────

export default function HomeClient({
  isLoggedIn,
  dashboardHref,
}: {
  isLoggedIn:    boolean;
  dashboardHref: string;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0A0F1E",
        color: "#E2E8F0",
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* ── Sticky nav ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#1E2D4A] bg-[#0A0F1E]/96 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}
            >📱</div>
            <div className="leading-tight">
              <p className="text-sm font-bold" style={{ color: "#D4A843" }}>Jai Bajrang Mobiles</p>
              <p className="text-[10px] text-slate-600">{t.city}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex bg-[#0F1729] border border-[#1E2D4A] rounded-xl overflow-hidden">
              {(["en","te","hi"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                    lang === l ? "text-[#0A0F1E]" : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={lang === l ? { background: "linear-gradient(135deg,#D4A843,#F5D078)" } : {}}
                >
                  {l === "en" ? "EN" : l === "te" ? "తె" : "हि"}
                </button>
              ))}
            </div>

            {/* Smart CTA — correct on first render, no flicker */}
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
              >
                {t.btn_dashboard}
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
              >
                {t.btn_login}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section
        className="relative py-16 sm:py-24 px-4 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse 85% 60% at 15% -5%, rgba(27,58,107,0.65) 0%, transparent 65%),
            radial-gradient(ellipse 65% 55% at 85% 105%, rgba(212,168,67,0.1) 0%, transparent 55%),
            #0A0F1E
          `,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-semibold"
            style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}
          >
            📍 {t.city}
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-5 leading-tight"
            style={{
              background: "linear-gradient(135deg,#FFFFFF 40%,#D4A843)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Jai Bajrang Mobiles
          </h1>

          <p className="text-lg sm:text-xl font-semibold text-slate-300 mb-2">{t.tagline}</p>
          <p className="text-slate-400 text-sm sm:text-base mb-10">{t.since}</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold transition-all active:scale-[0.98] shadow-lg shadow-yellow-900/20"
                style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
              >
                💼 {t.btn_dashboard}
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold transition-all active:scale-[0.98] shadow-lg shadow-yellow-900/20"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
                >
                  🎁 {t.btn_register}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold border border-[#1E2D4A] text-slate-300 hover:text-[#D4A843] hover:border-[#D4A843]/40 transition-all"
                >
                  {t.btn_login}
                </Link>
              </>
            )}
            <a
              href="https://bhajarang.vercel.app"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold border border-[#1E2D4A] text-slate-400 hover:text-[#D4A843] hover:border-[#D4A843]/40 transition-all"
            >
              🏪 {t.btn_shop} ↗
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────── */}
      <section className="py-10 px-4 border-y border-[#1E2D4A]" style={{ background: "rgba(27,58,107,0.1)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {t.stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-black" style={{ color: "#D4A843" }}>{s.value}</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Display highlight ────────────────────────────── */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl sm:rounded-3xl p-7 sm:p-10 text-center"
            style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.14),rgba(245,208,120,0.05))", border: "2px solid rgba(212,168,67,0.38)" }}
          >
            <p className="text-2xl sm:text-3xl md:text-4xl font-black mb-3" style={{ color: "#D4A843" }}>
              {t.highlight}
            </p>
            <p className="text-slate-300 text-base sm:text-lg mb-5">{t.highlight_sub}</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-400">
              {t.highlight_tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10" style={{ color: "#D4A843" }}>
            {t.services_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {t.services.map((svc) => (
              <div
                key={svc.title}
                className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-5 sm:p-6 hover:border-[#D4A843]/30 transition-all group"
              >
                <p className="text-3xl mb-3">{svc.icon}</p>
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#D4A843] transition-colors">
                  {svc.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Loyalty ──────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4" style={{ background: "rgba(27,58,107,0.1)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black mb-4" style={{ color: "#D4A843" }}>
                {t.loyalty_title}
              </h2>
              <p className="text-slate-300 mb-6 leading-relaxed text-sm sm:text-base">{t.loyalty_desc}</p>
              <ul className="space-y-3 mb-7">
                {t.loyalty_points.map((pt) => (
                  <li key={pt} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: "rgba(212,168,67,0.18)", color: "#D4A843" }}>✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
              {!isLoggedIn && (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}
                >
                  🎁 {t.btn_register}
                </Link>
              )}
            </div>
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-8 text-center">
              <p className="text-6xl mb-4">🏆</p>
              <p className="text-3xl font-black mb-1" style={{ color: "#D4A843" }}>₹500</p>
              <p className="text-sm text-slate-400 mb-5">Joining bonus on sign-up</p>
              <div className="space-y-2.5 text-sm text-slate-400 text-left max-w-[200px] mx-auto">
                <p className="flex items-center gap-2"><span>💚</span>Cashback every visit</p>
                <p className="flex items-center gap-2"><span>🔗</span>Refer & earn ₹200</p>
                <p className="flex items-center gap-2"><span>🎁</span>Milestone gifts</p>
                <p className="flex items-center gap-2"><span>⏰</span>365-day balance expiry</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────── */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-4" style={{ color: "#D4A843" }}>{t.contact_title}</h2>
          <p className="text-slate-300 mb-2 text-sm sm:text-base">📍 {t.contact_info}</p>
          <p className="text-slate-500 text-sm mb-6">📞 Call us for repairs & inquiries</p>
          <a
            href="https://bhajarang.vercel.app"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-[#D4A843]/35 text-[#D4A843] hover:bg-[#D4A843]/8 transition-all"
          >
            🌐 bhajarang.vercel.app ↗
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-[#1E2D4A] py-6 px-4 text-center">
        <p className="text-xs text-slate-600">{t.footer}</p>
        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          <Link href="/login"    className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">Login</Link>
          <Link href="/register" className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">Register</Link>
          <Link href="/terms"    className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">{t.terms_link}</Link>
          <a href="https://bhajarang.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">Shop ↗</a>
        </div>
      </footer>
    </div>
  );
}
