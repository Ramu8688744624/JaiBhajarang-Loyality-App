// lib/email.ts
// ─────────────────────────────────────────────────────────────
// Transactional email via Resend
// Matches imports used in lib/actions/billing.ts
// ─────────────────────────────────────────────────────────────

import { Resend } from "resend";
import { getShopSettings } from "@/lib/actions/settings";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_DOMAIN = process.env.EMAIL_FROM_DOMAIN ?? "noreply@yourdomain.com";

// ─── Types ────────────────────────────────────────────────────

export interface ReceiptEmailData {
  to: string;
  name: string;
  grossAmount: number;
  redemptionAmount: number;
  netAmount: number;
  cashbackEarned: number;
  newWalletBalance: number;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
  joiningBonus: number;
}

export interface MilestoneEmailData {
  to: string;
  name: string;
  milestoneLabel: string;
  rewardType: "wallet_credit" | "gift_choice" | "discount_voucher";
  rewardValue?: number;
}

// ─── Shared HTML Shell ────────────────────────────────────────

function emailShell(shopName: string, logoUrl: string | null, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${shopName}</title>
</head>
<body style="margin:0;padding:0;background:#0A0F1E;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#0F1729;border-radius:16px;border:1px solid #1E2D4A;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1B3A6B,#0D1F3C);padding:24px 28px;border-bottom:2px solid #D4A843;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${logoUrl ? `<img src="${logoUrl}" alt="${shopName}" height="40" style="border-radius:8px;margin-bottom:8px;display:block;"/>` : ""}
                    <h1 style="margin:0;color:#D4A843;font-size:22px;font-weight:700;letter-spacing:-0.5px;">${shopName}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #1E2D4A;text-align:center;">
              <p style="margin:0;color:#475569;font-size:11px;">
                This is an automated message from ${shopName}. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function statRow(label: string, value: string, highlight = false, prefix = ""): string {
  return `
  <tr>
    <td style="padding:8px 0;color:#94A3B8;font-size:14px;border-bottom:1px solid #1E2D4A;">${label}</td>
    <td style="padding:8px 0;text-align:right;font-size:14px;font-weight:${highlight ? "700" : "500"};
               color:${highlight ? "#D4A843" : "#E2E8F0"};border-bottom:1px solid #1E2D4A;">
      ${prefix}${value}
    </td>
  </tr>`;
}

// ─── Receipt Email ─────────────────────────────────────────────

export async function sendReceiptEmail(data: ReceiptEmailData): Promise<void> {
  const settings = await getShopSettings();
  const shopName = settings?.shop_name ?? "My Shop";
  const logoUrl = settings?.shop_logo_url ?? null;
  const sym = settings?.currency_symbol ?? "₹";

  const content = `
    <h2 style="margin:0 0 6px;color:#F1F5F9;font-size:18px;font-weight:700;">Payment Receipt</h2>
    <p style="margin:0 0 20px;color:#94A3B8;font-size:14px;">Hi ${data.name}, thank you for your visit!</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${statRow("Gross Bill Amount", `${sym}${data.grossAmount.toFixed(2)}`)}
      ${data.redemptionAmount > 0 ? statRow("Wallet Discount Applied", `− ${sym}${data.redemptionAmount.toFixed(2)}`) : ""}
      ${statRow("You Paid", `${sym}${data.netAmount.toFixed(2)}`, true)}
    </table>

    ${data.cashbackEarned > 0 ? `
    <div style="background:#14532D22;border:1px solid #22C55E44;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;color:#22C55E;font-size:14px;font-weight:600;">
        🎉 ${sym}${data.cashbackEarned.toFixed(2)} cashback credited to your wallet!
      </p>
    </div>` : ""}

    <div style="background:#1B3A6B33;border:1px solid #2563EB44;border-radius:10px;padding:14px 16px;">
      <p style="margin:0;color:#93C5FD;font-size:13px;">Wallet Balance</p>
      <p style="margin:4px 0 0;color:#D4A843;font-size:24px;font-weight:800;">
        ${sym}${data.newWalletBalance.toFixed(2)}
      </p>
    </div>`;

  const html = emailShell(shopName, logoUrl, content);

  await resend.emails.send({
    from: `${shopName} <${FROM_DOMAIN}>`,
    to: data.to,
    subject: `Receipt from ${shopName} — ${sym}${data.netAmount.toFixed(2)} paid`,
    html,
  });
}

// ─── Welcome Email ─────────────────────────────────────────────

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const settings = await getShopSettings();
  const shopName = settings?.shop_name ?? "My Shop";
  const logoUrl = settings?.shop_logo_url ?? null;
  const sym = settings?.currency_symbol ?? "₹";

  const content = `
    <h2 style="margin:0 0 6px;color:#F1F5F9;font-size:18px;font-weight:700;">
      Welcome to ${shopName}! 🎉
    </h2>
    <p style="margin:0 0 20px;color:#94A3B8;font-size:14px;">
      Hi ${data.name}, your loyalty account is ready.
    </p>

    <div style="background:#D4A84322;border:1px solid #D4A84366;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="margin:0;color:#D4A843;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Joining Bonus Credited
      </p>
      <p style="margin:8px 0 0;color:#FDE68A;font-size:36px;font-weight:800;">
        ${sym}${data.joiningBonus.toFixed(2)}
      </p>
      <p style="margin:6px 0 0;color:#94A3B8;font-size:12px;">
        Use this on your next visit at checkout!
      </p>
    </div>

    <p style="color:#94A3B8;font-size:13px;line-height:1.6;margin:0;">
      Every visit earns you cashback and brings you closer to exclusive milestone rewards.
      Visit your loyalty dashboard to track your progress.
    </p>`;

  const html = emailShell(shopName, logoUrl, content);

  await resend.emails.send({
    from: `${shopName} <${FROM_DOMAIN}>`,
    to: data.to,
    subject: `Welcome to ${shopName} — Your ${sym}${data.joiningBonus.toFixed(2)} bonus is here!`,
    html,
  });
}

// ─── Milestone Unlocked Email ──────────────────────────────────

export async function sendMilestoneEmail(data: MilestoneEmailData): Promise<void> {
  const settings = await getShopSettings();
  const shopName = settings?.shop_name ?? "My Shop";
  const logoUrl = settings?.shop_logo_url ?? null;
  const sym = settings?.currency_symbol ?? "₹";

  const rewardText =
    data.rewardType === "wallet_credit" && data.rewardValue
      ? `${sym}${data.rewardValue.toFixed(2)} has been credited to your wallet.`
      : data.rewardType === "gift_choice"
      ? "Log in to your dashboard to choose your free gift!"
      : "A special reward is waiting for you!";

  const content = `
    <h2 style="margin:0 0 6px;color:#F1F5F9;font-size:18px;font-weight:700;">
      🏆 Milestone Unlocked!
    </h2>
    <p style="margin:0 0 20px;color:#94A3B8;font-size:14px;">
      Congratulations, ${data.name}!
    </p>

    <div style="background:#D4A84322;border:1px solid #D4A84366;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
      <p style="margin:0;color:#FDE68A;font-size:20px;font-weight:700;">${data.milestoneLabel}</p>
      <p style="margin:10px 0 0;color:#D4A843;font-size:14px;">${rewardText}</p>
    </div>

    <p style="color:#94A3B8;font-size:13px;line-height:1.6;margin:0;">
      Thank you for your loyalty to ${shopName}. Keep visiting to unlock more rewards!
    </p>`;

  const html = emailShell(shopName, logoUrl, content);

  await resend.emails.send({
    from: `${shopName} <${FROM_DOMAIN}>`,
    to: data.to,
    subject: `🎉 You've unlocked: ${data.milestoneLabel} at ${shopName}!`,
    html,
  });
}
