"use server";
// lib/actions/gifts.ts
// ══════════════════════════════════════════════════════════════
// Jai Bajrang Mobiles — Gift Claims & Admin Management Actions
// ══════════════════════════════════════════════════════════════

import { createClient }   from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function svcClient() {
  return createClient(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL),
    String(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Types ───────────────────────────────────────────────────

export interface SpendRange {
  id:         string;
  label:      string;
  min_spend:  number;
  max_spend:  number;
  is_active:  boolean;
  range_gifts?: RangeGift[];
}

export interface RangeGift {
  id:          string;
  range_id:    string;
  name:        string;
  description: string | null;
  image_url:   string | null;
  stock:       number;      // -1 = unlimited
  is_active:   boolean;
}

export interface MilestoneSetting {
  id:          string;
  visit_count: number;
  label:       string;
  is_active:   boolean;
}

export interface GiftClaim {
  id:              string;
  customer_id:     string;
  milestone_id:    string;
  range_id:        string | null;
  gift_id:         string | null;
  spend_in_window: number;
  status:          "eligible" | "selected" | "claimed";
  selected_at:     string | null;
  claimed_at:      string | null;
  created_at:      string;
  // Joined
  milestone_settings?: MilestoneSetting;
  spend_ranges?:       SpendRange;
  range_gifts?:        RangeGift;
}

export interface ActionResult<T = undefined> {
  success: boolean;
  error?:  string;
  data?:   T;
}

// ══════════════════════════════════════════════════════════════
// CUSTOMER: Fetch their active gift claims
// ══════════════════════════════════════════════════════════════

export async function getMyGiftClaims(
  customerId: string
): Promise<GiftClaim[]> {
  const { data, error } = await svcClient()
    .from("gift_claims")
    .select(`
      *,
      milestone_settings ( id, visit_count, label ),
      spend_ranges       ( id, label, min_spend, max_spend,
        range_gifts ( id, name, description, image_url, stock, is_active )
      ),
      range_gifts ( id, name, description )
    `)
    .eq("customer_id", customerId)
    .neq("status", "claimed")           // claimed claims disappear from UI
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMyGiftClaims]", error.message);
    return [];
  }
  return (data ?? []) as GiftClaim[];
}

// ══════════════════════════════════════════════════════════════
// CUSTOMER: Select a gift for an eligible claim
// ══════════════════════════════════════════════════════════════

export async function selectGift(
  claimId:    string,
  giftId:     string,
  customerId: string
): Promise<ActionResult> {
  // Verify the claim belongs to this customer and is in eligible state
  const { data: claim } = await svcClient()
    .from("gift_claims")
    .select("id, status, range_id")
    .eq("id", claimId)
    .eq("customer_id", customerId)
    .eq("status", "eligible")
    .single();

  if (!claim)
    return { success: false, error: "Claim not found or already selected." };

  // Verify gift belongs to the claim's range and is in stock
  const { data: gift } = await svcClient()
    .from("range_gifts")
    .select("id, stock, is_active, range_id")
    .eq("id", giftId)
    .eq("range_id", claim.range_id ?? "")
    .eq("is_active", true)
    .single();

  if (!gift)
    return { success: false, error: "Gift not available." };
  if (gift.stock === 0)
    return { success: false, error: "This gift is out of stock. Please choose another." };

  const { error } = await svcClient()
    .from("gift_claims")
    .update({
      gift_id:     giftId,
      status:      "selected",
      selected_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Mark a gift claim as collected
// ══════════════════════════════════════════════════════════════

export async function markGiftClaimed(
  claimId: string,
  adminId: string
): Promise<ActionResult> {
  const svc = svcClient();

  // Fetch claim + gift to decrement stock
  const { data: claim } = await svc
    .from("gift_claims")
    .select("id, gift_id, status")
    .eq("id", claimId)
    .single();

  if (!claim)
    return { success: false, error: "Claim not found." };
  if (claim.status === "claimed")
    return { success: false, error: "Already marked as claimed." };
  if (claim.status !== "selected")
    return { success: false, error: "Customer has not selected a gift yet." };

  // Update claim
  const { error: claimErr } = await svc
    .from("gift_claims")
    .update({
      status:     "claimed",
      claimed_at: new Date().toISOString(),
      claimed_by: adminId,
    })
    .eq("id", claimId);

  if (claimErr) return { success: false, error: claimErr.message };

  // Decrement stock if not unlimited (-1)
  if (claim.gift_id) {
    await svc.rpc("decrement_gift_stock", { p_gift_id: claim.gift_id });
    // If RPC doesn't exist yet, fall back to inline update
    // (the RPC is created at the bottom of the migration)
  }

  revalidatePath("/admin/customers");
  revalidatePath("/dashboard");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Fetch all pending gift claims for admin panel
// ══════════════════════════════════════════════════════════════

export async function getAdminGiftClaims(filter?: "eligible" | "selected" | "claimed"): Promise<any[]> {
  let q = svcClient()
    .from("gift_claims")
    .select(`
      *,
      profiles ( id, full_name, username, phone, email ),
      milestone_settings ( id, visit_count, label ),
      spend_ranges ( id, label, min_spend, max_spend ),
      range_gifts ( id, name )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter) q = q.eq("status", filter);

  const { data, error } = await q;
  if (error) { console.error("[getAdminGiftClaims]", error.message); return []; }
  return data ?? [];
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Spend Ranges CRUD
// ══════════════════════════════════════════════════════════════

export async function getSpendRanges(): Promise<SpendRange[]> {
  const { data, error } = await svcClient()
    .from("spend_ranges")
    .select("*, range_gifts(*)")
    .order("min_spend");

  if (error) { console.error("[getSpendRanges]", error.message); return []; }
  return (data ?? []) as SpendRange[];
}

export async function upsertSpendRange(range: {
  id?:       string;
  label:     string;
  min_spend: number;
  max_spend: number;
  is_active: boolean;
}): Promise<ActionResult<SpendRange>> {
  // Client-side overlap validation is in the form, but DB trigger is the source of truth
  const { data, error } = await svcClient()
    .from("spend_ranges")
    .upsert(
      {
        ...range,
        min_spend:  Number(Number(range.min_spend).toFixed(2)),
        max_spend:  Number(Number(range.max_spend).toFixed(2)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    // Surface the overlap constraint message cleanly
    const msg = error.message.includes("overlaps")
      ? error.message.replace("ERROR: ", "")
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/settings");
  return { success: true, data: data as SpendRange };
}

export async function deleteSpendRange(id: string): Promise<ActionResult> {
  const { error } = await svcClient()
    .from("spend_ranges")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Range Gifts CRUD
// ══════════════════════════════════════════════════════════════

export async function upsertRangeGift(gift: {
  id?:         string;
  range_id:    string;
  name:        string;
  description?: string;
  image_url?:  string;
  stock:       number;
  is_active:   boolean;
}): Promise<ActionResult> {
  const { error } = await svcClient()
    .from("range_gifts")
    .upsert({ ...gift, updated_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function deleteRangeGift(id: string): Promise<ActionResult> {
  const { error } = await svcClient()
    .from("range_gifts")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Milestone Settings CRUD
// ══════════════════════════════════════════════════════════════

export async function getMilestoneSettings(): Promise<MilestoneSetting[]> {
  const { data, error } = await svcClient()
    .from("milestone_settings")
    .select("*")
    .order("visit_count");

  if (error) { console.error("[getMilestoneSettings]", error.message); return []; }
  return (data ?? []) as MilestoneSetting[];
}

export async function upsertMilestoneSetting(ms: {
  id?:         string;
  visit_count: number;
  label:       string;
  is_active:   boolean;
}): Promise<ActionResult> {
  const { error } = await svcClient()
    .from("milestone_settings")
    .upsert(
      { ...ms, visit_count: Math.floor(Number(ms.visit_count)), updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );

  if (error) {
    const msg = error.message.includes("unique") || error.message.includes("duplicate")
      ? `A milestone for visit #${ms.visit_count} already exists.`
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function deleteMilestoneSetting(id: string): Promise<ActionResult> {
  const { error } = await svcClient()
    .from("milestone_settings")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/settings");
  return { success: true };
}
