import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { getShopSettings } from "@/lib/actions/settings";
import Navbar from "@/components/NavbarServer";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getShopSettings();
  return {
    title: settings?.shop_name ?? "Jai Bajrang Mobiles",
    description: "Premium Mobile Servicing & Loyalty Rewards",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <head>
        <meta name="theme-color" content="#0A0F1E" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="font-sans bg-[#0A0F1E] text-slate-200 antialiased min-h-screen">
        <div className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 0%, rgba(27,58,107,0.35) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 80% 100%, rgba(212,168,67,0.08) 0%, transparent 50%),
              #0A0F1E
            `
          }}
        />

        {/* The new server-side Navbar handles its own session logic */}
        <Navbar />

        <main className="relative z-10">
          {children}
        </main>

        <div id="toast-root" className="fixed bottom-6 right-4 z-50 flex flex-col gap-3 pointer-events-none" />
      </body>
    </html>
  );
}