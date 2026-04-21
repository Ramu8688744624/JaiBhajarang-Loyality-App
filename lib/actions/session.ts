"use server";
// lib/actions/session.ts
// ─────────────────────────────────────────────────────────────
// Thin server action to safely read the access token
// from the httpOnly cookie set by verifyOTP.
// The reset-password client page calls this on mount.
// ─────────────────────────────────────────────────────────────

import { cookies } from "next/headers";

export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token");
    return token?.value ?? null;
  } catch {
    return null;
  }
}
