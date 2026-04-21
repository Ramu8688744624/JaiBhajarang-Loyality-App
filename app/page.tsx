"use client";
// app/page.tsx  ─ MARKETING HOMEPAGE
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Karimnagar
// Multi-language: English | Telugu | Hindi
// ══════════════════════════════════════════════════════════════

import { useState } from "react";
import Link         from "next/link";

type Lang = "en" | "te" | "hi";

// ── Translations ─────────────────────────────────────────────

const T = {
  en: {
    tagline:    "Karimnagar's Most Trusted Mobile Store",
    since:      "Serving Karimnagar since 2019 · 10,000+ Happy Customers",
    cta_login:  "Customer Login",
    cta_register: "Join Loyalty Program",
    cta_shop:   "Visit Our Shop",
    services_title: "Our Services",
    highlight_title: "⚡ Display Change in Under 30 Minutes!",
    highlight_desc: "Walk in with a cracked screen, walk out with a brand-new display. Guaranteed.",
    services: [
      { icon: "📱", title: "iPhone Repair",         desc: "Screen, battery, camera, charging port — all iPhone models." },
      { icon: "🤖", title: "Android Repair",        desc: "Samsung, Xiaomi, OnePlus, Vivo, Oppo and more." },
      { icon: "🔬", title: "Chip-Level Service",    desc: "Motherboard-level diagnosis & repair. Water damage recovery." },
      { icon: "🖥️", title: "Display Replacement",  desc: "Original & compatible displays. 30-minute service guaranteed." },
      { icon: "🔋", title: "Battery Replacement",  desc: "Genuine batteries for all brands. Back to full-day charge." },
      { icon: "💾", title: "Data Recovery",        desc: "Recover photos, contacts & files from damaged devices." },
    ],
    loyalty_title: "Loyalty Rewards",
    loyalty_desc:  "Earn cashback on every purchase. Refer friends and earn bonus rewards. Exclusive gifts for loyal customers.",
    loyalty_points: [
      "₹500 joining bonus on sign-up",
      "Cashback on every bill",
      "Referral rewards when friends buy",
      "Exclusive milestone gifts",
    ],
    stats: [
      { value: "5+",     label: "Years of Service" },
      { value: "10,000+",label: "Happy Customers" },
      { value: "30 min", label: "Display Change" },
      { value: "100%",   label: "Satisfaction" },
    ],
    contact_title: "Find Us",
    contact_info:  "Karimnagar, Telangana · Open 10 AM – 9 PM",
    footer:        "© 2024 Jai Bajrang Mobiles, Karimnagar. All rights reserved.",
  },
  te: {
    tagline:    "కరీంనగర్ లో అత్యంత విశ్వసనీయ మొబైల్ షాప్",
    since:      "2019 నుండి కరీంనగర్ కు సేవ చేస్తున్నాం · 10,000+ సంతోష కస్టమర్లు",
    cta_login:  "లాగిన్ చేయండి",
    cta_register: "లాయల్టీ ప్రోగ్రామ్ లో చేరండి",
    cta_shop:   "షాప్ సందర్శించండి",
    services_title: "మా సేవలు",
    highlight_title: "⚡ 30 నిమిషాల్లో డిస్ప్లే మార్పు!",
    highlight_desc: "పగిలిన స్క్రీన్ తో వచ్చి, కొత్త డిస్ప్లే తో వెళ్ళండి. గ్యారంటీ.",
    services: [
      { icon: "📱", title: "iPhone రిపేర్",          desc: "అన్ని iPhone మోడల్‌లకు స్క్రీన్, బ్యాటరీ, కెమెరా రిపేర్." },
      { icon: "🤖", title: "Android రిపేర్",         desc: "Samsung, Xiaomi, OnePlus మరియు ఇతర బ్రాండ్లు." },
      { icon: "🔬", title: "చిప్-లెవల్ సర్వీస్",    desc: "మదర్‌బోర్డ్ స్థాయి నిర్ధారణ మరియు రిపేర్. నీటి నష్టం రికవరీ." },
      { icon: "🖥️", title: "డిస్ప్లే మార్పు",       desc: "ఒరిజినల్ డిస్ప్లేలు. 30 నిమిషాల సర్వీస్ గ్యారంటీ." },
      { icon: "🔋", title: "బ్యాటరీ మార్పు",       desc: "అన్ని బ్రాండ్లకు అసలైన బ్యాటరీలు." },
      { icon: "💾", title: "డేటా రికవరీ",          desc: "దెబ్బతిన్న పరికరాల నుండి ఫోటోలు, పరిచయాలు రికవర్." },
    ],
    loyalty_title: "లాయల్టీ రివార్డ్స్",
    loyalty_desc:  "ప్రతి కొనుగోలుపై క్యాష్‌బ్యాక్ సంపాదించండి. స్నేహితులను రిఫర్ చేయండి మరియు బోనస్ రివార్డ్‌లు పొందండి.",
    loyalty_points: [
      "సైన్-అప్ పై ₹500 జాయినింగ్ బోనస్",
      "ప్రతి బిల్లుపై క్యాష్‌బ్యాక్",
      "స్నేహితులు కొనుగోలు చేసినప్పుడు రిఫరల్ రివార్డ్‌లు",
      "ఎక్స్‌క్లూజివ్ మైల్‌స్టోన్ గిఫ్ట్‌లు",
    ],
    stats: [
      { value: "5+",     label: "సంవత్సరాల సేవ" },
      { value: "10,000+",label: "సంతోష కస్టమర్లు" },
      { value: "30 నిమి", label: "డిస్ప్లే మార్పు" },
      { value: "100%",   label: "సంతృప్తి" },
    ],
    contact_title: "మాకు కనుగొనండి",
    contact_info:  "కరీంనగర్, తెలంగాణ · ఉదయం 10 – రాత్రి 9",
    footer:        "© 2024 జై బజరంగ్ మొబైల్స్, కరీంనగర్.",
  },
  hi: {
    tagline:    "करीमनगर का सबसे भरोसेमंद मोबाइल स्टोर",
    since:      "2019 से करीमनगर की सेवा में · 10,000+ खुश ग्राहक",
    cta_login:  "लॉगिन करें",
    cta_register: "लॉयल्टी प्रोग्राम जॉइन करें",
    cta_shop:   "शॉप पर आएं",
    services_title: "हमारी सेवाएं",
    highlight_title: "⚡ 30 मिनट में डिस्प्ले चेंज!",
    highlight_desc: "टूटी स्क्रीन लेकर आएं, नया डिस्प्ले लेकर जाएं। गारंटी।",
    services: [
      { icon: "📱", title: "iPhone रिपेयर",          desc: "सभी iPhone मॉडल के लिए स्क्रीन, बैटरी, कैमरा रिपेयर।" },
      { icon: "🤖", title: "Android रिपेयर",         desc: "Samsung, Xiaomi, OnePlus, Vivo और अन्य ब्रांड।" },
      { icon: "🔬", title: "चिप-लेवल सर्विस",       desc: "मदरबोर्ड डायग्नोसिस और रिपेयर। वाटर डैमेज रिकवरी।" },
      { icon: "🖥️", title: "डिस्प्ले बदलाव",        desc: "ओरिजिनल डिस्प्ले। 30 मिनट सर्विस की गारंटी।" },
      { icon: "🔋", title: "बैटरी बदलाव",          desc: "सभी ब्रांड के लिए असली बैटरी।" },
      { icon: "💾", title: "डेटा रिकवरी",          desc: "खराब डिवाइस से फोटो, कॉन्टैक्ट रिकवर।" },
    ],
    loyalty_title: "लॉयल्टी रिवार्ड्स",
    loyalty_desc:  "हर खरीदारी पर कैशबैक कमाएं। दोस्तों को रेफर करें और बोनस पाएं।",
    loyalty_points: [
      "साइन-अप पर ₹500 जॉइनिंग बोनस",
      "हर बिल पर कैशबैक",
      "दोस्त खरीदारी करें तो रेफरल रिवार्ड",
      "एक्सक्लूसिव माइलस्टोन गिफ्ट्स",
    ],
    stats: [
      { value: "5+",    label: "साल की सेवा" },
      { value: "10,000+",label: "खुश ग्राहक" },
      { value: "30 मिनट",label: "डिस्प्ले चेंज" },
      { value: "100%",  label: "संतुष्टि" },
    ],
    contact_title: "हमें खोजें",
    contact_info:  "करीमनगर, तेलंगाना · सुबह 10 – रात 9",
    footer:        "© 2024 जय बजरंग मोबाइल्स, करीमनगर।",
  },
};

// ── Component ─────────────────────────────────────────────────

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  return (
    <div className="min-h-screen" style={{ background: "#0A0F1E", color: "#E2E8F0", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#1E2D4A] bg-[#0A0F1E]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#1B3A6B,#2563EB)" }}>📱</div>
            <div className="leading-tight">
              <p className="text-sm font-bold" style={{ color: "#D4A843" }}>Jai Bajrang Mobiles</p>
              <p className="text-xs text-slate-500">Karimnagar</p>
            </div>
          </div>

          {/* Right: lang toggle + CTA */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex bg-[#0F1729] border border-[#1E2D4A] rounded-xl overflow-hidden">
              {(["en","te","hi"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${lang === l ? "text-[#0A0F1E]" : "text-slate-500 hover:text-slate-300"}`}
                  style={lang === l ? { background: "linear-gradient(135deg,#D4A843,#F5D078)" } : {}}>
                  {l === "en" ? "EN" : l === "te" ? "తె" : "हि"}
                </button>
              ))}
            </div>
            <Link href="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}>
              {t.cta_login}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-4"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 0%, rgba(27,58,107,0.6) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 100%, rgba(212,168,67,0.1) 0%, transparent 50%),
            #0A0F1E
          `
        }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-semibold"
            style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)", color: "#D4A843" }}>
            📍 Karimnagar, Telangana
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-5 leading-tight"
            style={{ background: "linear-gradient(135deg,#FFFFFF,#D4A843)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {lang === "en" ? "Jai Bajrang" : lang === "te" ? "జై బజరంగ్" : "जय बजरंग"}
            <br />
            {lang === "en" ? "Mobiles" : lang === "te" ? "మొబైల్స్" : "मोबाइल्स"}
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-slate-300 mb-3">{t.tagline}</p>
          <p className="text-slate-400 text-sm mb-10">{t.since}</p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}>
              🎁 {t.cta_register}
            </Link>
            <a href="https://bhajarang.vercel.app" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold border border-[#1E2D4A] hover:border-[#D4A843]/40 text-slate-300 hover:text-[#D4A843] transition-all">
              🏪 {t.cta_shop}
            </a>
            <Link href="/login"
              className="sm:hidden inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-semibold border border-[#1E2D4A] text-slate-400 hover:text-[#D4A843] transition-all">
              {t.cta_login}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="py-10 px-4 border-y border-[#1E2D4A]"
        style={{ background: "rgba(27,58,107,0.15)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {t.stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black" style={{ color: "#D4A843" }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Display Highlight ────────────────────────────────── */}
      <section className="py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl p-8 text-center"
            style={{ background: "linear-gradient(135deg,rgba(212,168,67,0.15),rgba(245,208,120,0.08))", border: "2px solid rgba(212,168,67,0.4)" }}>
            <p className="text-3xl md:text-4xl font-black mb-3" style={{ color: "#D4A843" }}>
              {t.highlight_title}
            </p>
            <p className="text-slate-300 text-lg">{t.highlight_desc}</p>
            <div className="mt-5 flex justify-center gap-3 text-sm text-slate-400">
              <span>✅ Original displays</span>
              <span className="text-slate-600">·</span>
              <span>✅ Warranty included</span>
              <span className="text-slate-600">·</span>
              <span>✅ All brands</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-10" style={{ color: "#D4A843" }}>
            {t.services_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.services.map((svc) => (
              <div key={svc.title}
                className="bg-[#0F1729] border border-[#1E2D4A] rounded-2xl p-6 hover:border-[#D4A843]/30 transition-all">
                <p className="text-3xl mb-3">{svc.icon}</p>
                <h3 className="text-base font-bold text-white mb-2">{svc.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Loyalty ─────────────────────────────────────────── */}
      <section className="py-14 px-4" style={{ background: "rgba(27,58,107,0.12)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-black mb-4" style={{ color: "#D4A843" }}>{t.loyalty_title}</h2>
              <p className="text-slate-300 mb-6 leading-relaxed">{t.loyalty_desc}</p>
              <ul className="space-y-3">
                {t.loyalty_points.map((pt) => (
                  <li key={pt} className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>✓</span>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link href="/register"
                className="inline-flex items-center gap-2 mt-7 px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#D4A843,#F5D078)", color: "#0A0F1E" }}>
                🎁 {t.cta_register}
              </Link>
            </div>
            <div className="bg-[#0F1729] border border-[#1E2D4A] rounded-3xl p-8 text-center">
              <p className="text-6xl mb-4">🏆</p>
              <p className="text-2xl font-black mb-2" style={{ color: "#D4A843" }}>₹500</p>
              <p className="text-sm text-slate-400 mb-4">Joining bonus on sign-up</p>
              <div className="space-y-2 text-sm text-slate-400">
                <p>💚 Cashback every visit</p>
                <p>🔗 Refer & earn ₹200</p>
                <p>🎁 Loyalty milestone gifts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-4" style={{ color: "#D4A843" }}>{t.contact_title}</h2>
          <p className="text-slate-300 mb-2">📍 {t.contact_info}</p>
          <p className="text-slate-400 text-sm mb-6">📞 Call us for repairs & inquiries</p>
          <a href="https://bhajarang.vercel.app" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold border border-[#D4A843]/40 hover:bg-[#D4A843]/10 text-[#D4A843] transition-all">
            🌐 bhajarang.vercel.app ↗
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#1E2D4A] py-6 px-4 text-center">
        <p className="text-xs text-slate-600">{t.footer}</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/login"    className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">Login</Link>
          <Link href="/register" className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">Register</Link>
          <a href="https://bhajarang.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-[#D4A843] transition-colors">Shop</a>
        </div>
      </footer>
    </div>
  );
}
