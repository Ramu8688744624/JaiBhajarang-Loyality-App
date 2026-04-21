// lib/actions/settings.ts
// ─────────────────────────────────────────────────────────────
// Admin Settings Server Actions
// ─────────────────────────────────────────────────────────────
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ShopSettings {
  id: string;
  shop_name: string;
  shop_logo_url: string | null;
  joining_bonus: number;
  default_redemption_pct: number;
  default_cashback_pct: number;
  currency_symbol: string;
}

// ─── Fetch Settings ───────────────────────────────────────────

export async function getShopSettings(): Promise<ShopSettings | null> {
  const { data, error } = await adminSupabase
    .from("shop_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    console.error("getShopSettings error:", error);
    return null;
  }
  return data;
}

// ─── Update Settings ──────────────────────────────────────────

export async function updateShopSettings(
  settings: Partial<Omit<ShopSettings, "id">>
): Promise<{ success: boolean; error?: string }> {
  const { data: existing } = await adminSupabase
    .from("shop_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) return { success: false, error: "Settings row not found" };

  const { error } = await adminSupabase
    .from("shop_settings")
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/admin/billing");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Milestones CRUD ──────────────────────────────────────────

export async function getMilestones() {
  const { data } = await adminSupabase
    .from("milestones")
    .select("*")
    .order("visit_count");
  return data ?? [];
}

export async function upsertMilestone(milestone: {
  id?: string;
  visit_count: number;
  reward_type: string;
  reward_value?: number | null;
  label: string;
  is_active: boolean;
}) {
  const { error } = await adminSupabase
    .from("milestones")
    .upsert(milestone, { onConflict: "id" });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function deleteMilestone(id: string) {
  const { error } = await adminSupabase
    .from("milestones")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

// ─── Gift Tiers CRUD ──────────────────────────────────────────

export async function getGiftTiers() {
  const { data } = await adminSupabase
    .from("gift_tiers")
    .select("*, gift_inventory(*)")
    .order("min_spend");
  return data ?? [];
}

export async function upsertGiftTier(tier: {
  id?: string;
  label: string;
  min_spend: number;
  max_spend?: number | null;
  tier_color: string;
  is_active: boolean;
}) {
  const { error } = await adminSupabase
    .from("gift_tiers")
    .upsert(tier, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function upsertGiftItem(item: {
  id?: string;
  tier_id: string;
  name: string;
  description?: string;
  image_url?: string;
  stock: number;
  is_active: boolean;
}) {
  const { error } = await adminSupabase
    .from("gift_inventory")
    .upsert(item, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}
