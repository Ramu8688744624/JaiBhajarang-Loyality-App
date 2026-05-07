-- ══════════════════════════════════════════════════════════════════════
-- JAI BAJRANG MOBILES — MIGRATION v6
-- File: supabase/migrations/20260504000000_milestone_gift_system.sql
--
-- What this adds:
--   1. spend_ranges table     — Admin-defined spending brackets
--   2. range_gifts table      — Gifts linked to a spend range
--   3. milestone_settings     — Admin-defined visit-count milestones
--   4. gift_claims            — One claim per customer per milestone
--   5. Trigger on bills       — Detects milestone hit, calculates
--                               spend-since-last-milestone, resolves
--                               eligible spend range, creates a claim
--   6. RLS policies           — Customers read own claims; admin full access
--
-- DOES NOT TOUCH: process_bill, handle_first_purchase_reward,
--   profiles, wallet_transactions, bills, or referral logic.
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. spend_ranges ─────────────────────────────────────────────────
-- Validation: ranges must not overlap. Enforced via trigger below.

CREATE TABLE IF NOT EXISTS public.spend_ranges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  min_spend   NUMERIC(15,2) NOT NULL,   -- inclusive lower bound
  max_spend   NUMERIC(15,2) NOT NULL,   -- inclusive upper bound
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  spend_ranges_min_lt_max CHECK (max_spend > min_spend)
);

-- Prevent overlapping ranges
CREATE OR REPLACE FUNCTION check_spend_range_no_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.spend_ranges
    WHERE id <> COALESCE(NEW.id, gen_random_uuid())   -- exclude self on UPDATE
      AND is_active = TRUE
      AND (
        (NEW.min_spend <= max_spend AND NEW.max_spend >= min_spend)
      )
  ) THEN
    RAISE EXCEPTION
      'Spend range ₹% – ₹% overlaps an existing active range.',
      NEW.min_spend, NEW.max_spend;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spend_range_no_overlap ON public.spend_ranges;
CREATE TRIGGER trg_spend_range_no_overlap
  BEFORE INSERT OR UPDATE ON public.spend_ranges
  FOR EACH ROW EXECUTE FUNCTION check_spend_range_no_overlap();

-- ─── 2. range_gifts ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.range_gifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_id     UUID NOT NULL REFERENCES public.spend_ranges(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  image_url    TEXT,
  stock        INTEGER NOT NULL DEFAULT -1,   -- -1 = unlimited
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. milestone_settings ───────────────────────────────────────────
-- Replaces the old static milestones table for gift-choice logic.
-- (Existing milestones table is untouched — it drives wallet credits.)

CREATE TABLE IF NOT EXISTS public.milestone_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_count  INTEGER NOT NULL UNIQUE,   -- e.g. 5, 10, 20
  label        TEXT NOT NULL,            -- e.g. "5th Visit Milestone"
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. gift_claims ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gift_claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_id     UUID NOT NULL REFERENCES public.milestone_settings(id) ON DELETE CASCADE,
  range_id         UUID REFERENCES public.spend_ranges(id),
  gift_id          UUID REFERENCES public.range_gifts(id),
  -- spend_in_window: total spent between prev milestone and this one
  spend_in_window  NUMERIC(15,2) NOT NULL DEFAULT 0,
  -- Workflow states: eligible → selected → claimed
  status           TEXT NOT NULL DEFAULT 'eligible'
                   CHECK (status IN ('eligible', 'selected', 'claimed')),
  selected_at      TIMESTAMPTZ,
  claimed_at       TIMESTAMPTZ,
  claimed_by       UUID REFERENCES public.profiles(id),  -- admin who marked claimed
  bill_id          UUID,  -- the bill that triggered this milestone
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One claim per customer per milestone
  UNIQUE (customer_id, milestone_id)
);

-- ─── 5. Trigger: detect milestone hit after bill insert ──────────────

CREATE OR REPLACE FUNCTION trg_check_milestone_on_bill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit_count        INTEGER;
  v_milestone          RECORD;
  v_prev_milestone_vc  INTEGER;
  v_prev_bill_date     TIMESTAMPTZ;
  v_spend_window       NUMERIC(15,2);
  v_eligible_range     RECORD;
BEGIN
  -- 1. Get current visit_count AFTER the bill-sync trigger ran
  --    (trg_bill_sync_profile fires first and already incremented it)
  SELECT visit_count INTO v_visit_count
  FROM   public.profiles
  WHERE  id = NEW.customer_id;

  -- 2. Check if this visit_count matches an active milestone_setting
  SELECT * INTO v_milestone
  FROM   public.milestone_settings
  WHERE  visit_count = v_visit_count
    AND  is_active   = TRUE
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN NEW;   -- Not a milestone visit — nothing to do
  END IF;

  -- 3. Don't create duplicate claims (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.gift_claims
    WHERE customer_id = NEW.customer_id
      AND milestone_id = v_milestone.id
  ) THEN
    RETURN NEW;
  END IF;

  -- 4. Calculate spend since the PREVIOUS milestone
  --    Previous milestone = largest milestone_settings.visit_count < current
  SELECT COALESCE(MAX(ms.visit_count), 0)
  INTO   v_prev_milestone_vc
  FROM   public.milestone_settings ms
  WHERE  ms.visit_count < v_visit_count
    AND  ms.is_active   = TRUE;

  -- Find the bill that completed the previous milestone (if any)
  -- We need the date of the (prev_milestone_vc)-th bill for this customer
  SELECT created_at INTO v_prev_bill_date
  FROM   public.bills
  WHERE  customer_id = NEW.customer_id
  ORDER  BY created_at ASC
  OFFSET v_prev_milestone_vc
  LIMIT  1;

  -- Sum net_amount for all bills after the previous milestone bill date
  SELECT COALESCE(SUM(net_amount), 0)
  INTO   v_spend_window
  FROM   public.bills
  WHERE  customer_id = NEW.customer_id
    AND  created_at  > COALESCE(v_prev_bill_date, '1970-01-01'::TIMESTAMPTZ);

  -- 5. Find the best eligible spend range for this window spend
  SELECT * INTO v_eligible_range
  FROM   public.spend_ranges
  WHERE  is_active  = TRUE
    AND  min_spend  <= v_spend_window
    AND  max_spend  >= v_spend_window
  LIMIT  1;

  -- 6. Insert gift_claim row (status = 'eligible')
  --    range_id is NULL if spend doesn't match any range (admin sees this)
  INSERT INTO public.gift_claims (
    customer_id,
    milestone_id,
    range_id,
    spend_in_window,
    status,
    bill_id
  )
  VALUES (
    NEW.customer_id,
    v_milestone.id,
    v_eligible_range.id,      -- NULL if no matching range
    v_spend_window,
    'eligible',
    NEW.id
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Never block a bill save due to gift logic failing
    RAISE WARNING '[trg_check_milestone_on_bill] customer=% milestone=% err=%',
      NEW.customer_id, v_milestone.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fire AFTER trg_bill_sync_profile (which increments visit_count)
-- Use a later alphabetic name so Postgres fires it second.
DROP TRIGGER IF EXISTS trg_milestone_gift_check ON public.bills;
CREATE TRIGGER trg_milestone_gift_check
  AFTER INSERT ON public.bills
  FOR EACH ROW EXECUTE FUNCTION trg_check_milestone_on_bill();

-- ─── 6. updated_at auto-refresh ──────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.spend_ranges;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.spend_ranges FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.range_gifts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.range_gifts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.milestone_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.milestone_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.gift_claims;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gift_claims FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 7. Row Level Security ───────────────────────────────────────────

ALTER TABLE public.spend_ranges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.range_gifts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_claims      ENABLE ROW LEVEL SECURITY;

-- Public can read active ranges and gifts (for gift catalog display)
CREATE POLICY "public_read_active_ranges"
  ON public.spend_ranges FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "public_read_active_gifts"
  ON public.range_gifts FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "public_read_milestones"
  ON public.milestone_settings FOR SELECT
  USING (is_active = TRUE);

-- Customers read their own claims
CREATE POLICY "customer_read_own_claims"
  ON public.gift_claims FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can update their own claim to 'selected' (gift picker)
CREATE POLICY "customer_select_gift"
  ON public.gift_claims FOR UPDATE
  USING  (customer_id = auth.uid() AND status = 'eligible')
  WITH CHECK (status = 'selected');

-- Service role (admin) has full access — bypasses RLS already
-- But explicit admin policies for anon Supabase dashboard access:
CREATE POLICY "admin_full_spend_ranges"
  ON public.spend_ranges FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

CREATE POLICY "admin_full_range_gifts"
  ON public.range_gifts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

CREATE POLICY "admin_full_milestones"
  ON public.milestone_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

CREATE POLICY "admin_full_claims"
  ON public.gift_claims FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- ─── 8. Indexes ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gift_claims_customer ON public.gift_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_gift_claims_status   ON public.gift_claims(status);
CREATE INDEX IF NOT EXISTS idx_range_gifts_range    ON public.range_gifts(range_id);
CREATE INDEX IF NOT EXISTS idx_milestone_visit      ON public.milestone_settings(visit_count);

-- ─── Verify ───────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('spend_ranges','range_gifts','milestone_settings','gift_claims');
