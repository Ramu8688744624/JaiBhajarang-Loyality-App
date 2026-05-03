drop extension if exists "pg_net";


  create table "public"."bills" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "billed_by" uuid not null,
    "gross_amount" numeric(15,2) not null,
    "redemption_pct" numeric(5,2) not null default 0.00,
    "redemption_amount" numeric(15,2) not null default 0.00,
    "net_amount" numeric(15,2) not null,
    "cashback_pct" numeric(5,2) not null default 0.00,
    "cashback_earned" numeric(15,2) not null default 0.00,
    "payment_method" text default 'cash'::text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "wallet_source" text not null default 'cashback'::text
      );


alter table "public"."bills" enable row level security;


  create table "public"."gift_inventory" (
    "id" uuid not null default gen_random_uuid(),
    "tier_id" uuid not null,
    "name" text not null,
    "description" text,
    "image_url" text,
    "stock" integer not null default 0,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."gift_inventory" enable row level security;


  create table "public"."gift_tiers" (
    "id" uuid not null default gen_random_uuid(),
    "label" text not null,
    "min_spend" numeric(12,2) not null,
    "max_spend" numeric(12,2),
    "tier_color" text default '#C0C0C0'::text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."gift_tiers" enable row level security;


  create table "public"."milestones" (
    "id" uuid not null default gen_random_uuid(),
    "visit_count" integer not null,
    "reward_type" text not null,
    "reward_value" numeric(10,2),
    "label" text not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."milestones" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text not null,
    "full_name" text,
    "phone" text,
    "email" text not null,
    "role" text not null default 'customer'::text,
    "wallet_balance" numeric(15,2) not null default 0.00,
    "total_spent" numeric(15,2) not null default 0.00,
    "visit_count" integer not null default 0,
    "joining_bonus_credited" boolean not null default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "referral_code" text,
    "referred_by" uuid,
    "referral_bonus_pending" boolean not null default false,
    "is_first_purchase_done" boolean not null default false,
    "total_referrals" integer not null default 0,
    "cashback_balance" numeric(15,2) not null default 0.00,
    "referral_balance" numeric(15,2) not null default 0.00,
    "wallet_expires_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone default now(),
    "referral_usage_count" integer default 0
      );


alter table "public"."profiles" enable row level security;


  create table "public"."referrals" (
    "id" uuid not null default gen_random_uuid(),
    "referrer_id" uuid not null,
    "referee_id" uuid not null,
    "bonus_paid" boolean not null default false,
    "bonus_amount" numeric(10,2),
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "promised_amount" numeric(15,2),
    "status" text default 'pending'::text
      );


alter table "public"."referrals" enable row level security;


  create table "public"."shop_settings" (
    "id" uuid not null default gen_random_uuid(),
    "shop_name" text not null default 'My Shop'::text,
    "shop_logo_url" text,
    "joining_bonus" numeric(15,2) not null default 500.00,
    "default_redemption_pct" numeric(5,2) not null default 5.00,
    "default_cashback_pct" numeric(5,2) not null default 3.00,
    "currency_symbol" text not null default '₹'::text,
    "updated_at" timestamp with time zone default now(),
    "referral_bonus" numeric(15,2) not null default 200.00,
    "wallet_expiry_days" integer not null default 365,
    "referral_per_visit_limit" numeric(10,2),
    "allow_cashback_and_referral" boolean not null default false,
    "referral_usage_limit_per_bill" numeric(15,2) default 100.00,
    "referral_usage_count_limit" integer default 2,
    "min_bill_for_referral" numeric(15,2) default 500.00
      );


alter table "public"."shop_settings" enable row level security;


  create table "public"."user_milestones" (
    "id" uuid not null default gen_random_uuid(),
    "profile_id" uuid not null,
    "milestone_id" uuid not null,
    "redeemed" boolean not null default false,
    "redeemed_at" timestamp with time zone,
    "gift_item_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_milestones" enable row level security;


  create table "public"."wallet_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "profile_id" uuid not null,
    "bill_id" uuid,
    "type" text not null,
    "amount" numeric(15,2) not null,
    "balance_after" numeric(15,2) not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "wallet_source" text not null default 'cashback'::text
      );


alter table "public"."wallet_transactions" enable row level security;

CREATE UNIQUE INDEX bills_pkey ON public.bills USING btree (id);

CREATE UNIQUE INDEX gift_inventory_pkey ON public.gift_inventory USING btree (id);

CREATE UNIQUE INDEX gift_tiers_pkey ON public.gift_tiers USING btree (id);

CREATE INDEX idx_profiles_wallet_expires ON public.profiles USING btree (wallet_expires_at) WHERE (wallet_expires_at IS NOT NULL);

CREATE INDEX idx_wallet_tx_source ON public.wallet_transactions USING btree (wallet_source);

CREATE UNIQUE INDEX milestones_pkey ON public.milestones USING btree (id);

CREATE UNIQUE INDEX milestones_visit_count_key ON public.milestones USING btree (visit_count);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_phone_key ON public.profiles USING btree (phone);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_referral_code_key ON public.profiles USING btree (referral_code);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id);

CREATE UNIQUE INDEX referrals_referee_id_key ON public.referrals USING btree (referee_id);

CREATE UNIQUE INDEX shop_settings_pkey ON public.shop_settings USING btree (id);

CREATE UNIQUE INDEX unique_referral ON public.referrals USING btree (referrer_id, referee_id);

CREATE UNIQUE INDEX user_milestones_pkey ON public.user_milestones USING btree (id);

CREATE UNIQUE INDEX user_milestones_profile_id_milestone_id_key ON public.user_milestones USING btree (profile_id, milestone_id);

CREATE UNIQUE INDEX wallet_transactions_pkey ON public.wallet_transactions USING btree (id);

alter table "public"."bills" add constraint "bills_pkey" PRIMARY KEY using index "bills_pkey";

alter table "public"."gift_inventory" add constraint "gift_inventory_pkey" PRIMARY KEY using index "gift_inventory_pkey";

alter table "public"."gift_tiers" add constraint "gift_tiers_pkey" PRIMARY KEY using index "gift_tiers_pkey";

alter table "public"."milestones" add constraint "milestones_pkey" PRIMARY KEY using index "milestones_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."referrals" add constraint "referrals_pkey" PRIMARY KEY using index "referrals_pkey";

alter table "public"."shop_settings" add constraint "shop_settings_pkey" PRIMARY KEY using index "shop_settings_pkey";

alter table "public"."user_milestones" add constraint "user_milestones_pkey" PRIMARY KEY using index "user_milestones_pkey";

alter table "public"."wallet_transactions" add constraint "wallet_transactions_pkey" PRIMARY KEY using index "wallet_transactions_pkey";

alter table "public"."bills" add constraint "bills_billed_by_fkey" FOREIGN KEY (billed_by) REFERENCES public.profiles(id) not valid;

alter table "public"."bills" validate constraint "bills_billed_by_fkey";

alter table "public"."bills" add constraint "bills_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.profiles(id) not valid;

alter table "public"."bills" validate constraint "bills_customer_id_fkey";

alter table "public"."bills" add constraint "bills_payment_method_check" CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'upi'::text, 'mixed'::text]))) not valid;

alter table "public"."bills" validate constraint "bills_payment_method_check";

alter table "public"."bills" add constraint "bills_wallet_source_check" CHECK ((wallet_source = ANY (ARRAY['cashback'::text, 'referral'::text, 'none'::text]))) not valid;

alter table "public"."bills" validate constraint "bills_wallet_source_check";

alter table "public"."gift_inventory" add constraint "gift_inventory_tier_id_fkey" FOREIGN KEY (tier_id) REFERENCES public.gift_tiers(id) not valid;

alter table "public"."gift_inventory" validate constraint "gift_inventory_tier_id_fkey";

alter table "public"."milestones" add constraint "milestones_reward_type_check" CHECK ((reward_type = ANY (ARRAY['wallet_credit'::text, 'gift_choice'::text, 'discount_voucher'::text]))) not valid;

alter table "public"."milestones" validate constraint "milestones_reward_type_check";

alter table "public"."milestones" add constraint "milestones_visit_count_key" UNIQUE using index "milestones_visit_count_key";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_phone_key" UNIQUE using index "profiles_phone_key";

alter table "public"."profiles" add constraint "profiles_referral_code_key" UNIQUE using index "profiles_referral_code_key";

alter table "public"."profiles" add constraint "profiles_referred_by_fkey" FOREIGN KEY (referred_by) REFERENCES public.profiles(id) not valid;

alter table "public"."profiles" validate constraint "profiles_referred_by_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."referrals" add constraint "referrals_referee_id_fkey" FOREIGN KEY (referee_id) REFERENCES public.profiles(id) not valid;

alter table "public"."referrals" validate constraint "referrals_referee_id_fkey";

alter table "public"."referrals" add constraint "referrals_referee_id_key" UNIQUE using index "referrals_referee_id_key";

alter table "public"."referrals" add constraint "referrals_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) not valid;

alter table "public"."referrals" validate constraint "referrals_referrer_id_fkey";

alter table "public"."referrals" add constraint "unique_referral" UNIQUE using index "unique_referral";

alter table "public"."user_milestones" add constraint "fk_gift_item" FOREIGN KEY (gift_item_id) REFERENCES public.gift_inventory(id) not valid;

alter table "public"."user_milestones" validate constraint "fk_gift_item";

alter table "public"."user_milestones" add constraint "user_milestones_milestone_id_fkey" FOREIGN KEY (milestone_id) REFERENCES public.milestones(id) not valid;

alter table "public"."user_milestones" validate constraint "user_milestones_milestone_id_fkey";

alter table "public"."user_milestones" add constraint "user_milestones_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) not valid;

alter table "public"."user_milestones" validate constraint "user_milestones_profile_id_fkey";

alter table "public"."user_milestones" add constraint "user_milestones_profile_id_milestone_id_key" UNIQUE using index "user_milestones_profile_id_milestone_id_key";

alter table "public"."wallet_transactions" add constraint "wallet_transactions_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES public.bills(id) not valid;

alter table "public"."wallet_transactions" validate constraint "wallet_transactions_bill_id_fkey";

alter table "public"."wallet_transactions" add constraint "wallet_transactions_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) not valid;

alter table "public"."wallet_transactions" validate constraint "wallet_transactions_profile_id_fkey";

alter table "public"."wallet_transactions" add constraint "wallet_transactions_type_check" CHECK ((type = ANY (ARRAY['joining_bonus'::text, 'cashback'::text, 'redemption'::text, 'manual_credit'::text, 'manual_debit'::text]))) not valid;

alter table "public"."wallet_transactions" validate constraint "wallet_transactions_type_check";

alter table "public"."wallet_transactions" add constraint "wallet_transactions_wallet_source_check" CHECK ((wallet_source = ANY (ARRAY['cashback'::text, 'referral'::text]))) not valid;

alter table "public"."wallet_transactions" validate constraint "wallet_transactions_wallet_source_check";

set check_function_bodies = off;

create or replace view "public"."analytics_summary" as  SELECT (COALESCE(sum(gross_amount), (0)::numeric))::numeric(15,2) AS total_revenue,
    count(*) AS total_bills,
    (COALESCE(avg(gross_amount), (0)::numeric))::numeric(15,2) AS avg_bill_value
   FROM public.bills;


CREATE OR REPLACE FUNCTION public.check_visit_milestones(p_customer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_visits INTEGER;
  m RECORD;
BEGIN
  SELECT visit_count INTO v_visits FROM public.profiles WHERE id = p_customer_id;

  FOR m IN
    SELECT * FROM public.milestones
    WHERE visit_count <= v_visits AND is_active = TRUE
  LOOP
    INSERT INTO public.user_milestones (profile_id, milestone_id)
    VALUES (p_customer_id, m.id)
    ON CONFLICT (profile_id, milestone_id) DO NOTHING;
  END LOOP;
END;
$function$
;

create or replace view "public"."customer_stats" as  SELECT p.id,
    p.full_name,
    p.username,
    p.email,
    p.phone,
    p.cashback_balance,
    p.referral_balance,
    COALESCE(sum(b.net_amount), (0)::numeric) AS total_spent,
    count(b.id) AS visit_count,
    p.total_referrals,
    p.referral_code
   FROM (public.profiles p
     LEFT JOIN public.bills b ON ((p.id = b.customer_id)))
  GROUP BY p.id;


CREATE OR REPLACE FUNCTION public.expire_wallets()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  jb_count INTEGER;
BEGIN
  UPDATE public.profiles
     SET cashback_balance = 0.00,
         referral_balance = 0.00,
         wallet_balance   = 0.00,
         updated_at       = NOW()
   WHERE wallet_expires_at IS NOT NULL
     AND wallet_expires_at < NOW()
     AND (cashback_balance > 0 OR referral_balance > 0);

  GET DIAGNOSTICS jb_count = ROW_COUNT;
  RETURN jb_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Format: JB-AB12  (2 alpha + 2 digit, all caps)
    code := 'JB-'
      || CHR(65 + FLOOR(RANDOM() * 26)::INT)
      || CHR(65 + FLOOR(RANDOM() * 26)::INT)
      || LPAD(FLOOR(RANDOM() * 100)::TEXT, 2, '0');

    SELECT EXISTS (
      SELECT 1 FROM profiles WHERE referral_code = code
    ) INTO exists;

    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_referral()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- We grab the current bonus from settings and "lock" it for this specific referral
  INSERT INTO public.referrals (referrer_id, referee_id, promised_amount, status)
  VALUES (
    NEW.referred_by, 
    NEW.id, 
    (SELECT referral_bonus FROM shop_settings LIMIT 1), 
    'pending'
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New Customer'), 
    new.email, 
    new.phone, -- This syncs the phone number from Auth to Profiles
    'customer'
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_bonus()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_joining_bonus NUMERIC(15,2);
BEGIN
  -- Get the bonus amount from your settings (Jai Bajrang Mobiles uses shop_settings)
  SELECT COALESCE(joining_bonus, 0) INTO v_joining_bonus FROM shop_settings LIMIT 1;

  -- Only try to update if there is a bonus to give
  IF v_joining_bonus > 0 THEN
    -- We update the profile directly. 
    -- We use 'cashback_balance' as confirmed in your audit earlier.
    UPDATE public.profiles
    SET 
      cashback_balance = v_joining_bonus,
      wallet_balance = v_joining_bonus,
      joining_bonus_credited = TRUE
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_joining_bonus    NUMERIC(15,2);
  v_referral_code    TEXT;
BEGIN
  -- 1. Get the joining bonus from your settings
  SELECT COALESCE(joining_bonus, 0) INTO v_joining_bonus FROM shop_settings LIMIT 1;

  -- 2. Generate the JB-XXXX code
  v_referral_code := generate_referral_code();

  -- 3. Insert the Profile (Using basic fields to ensure it works)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    username,
    role,
    cashback_balance,
    wallet_balance,
    joining_bonus_credited,
    referral_code,
    is_first_purchase_done,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    'customer',
    COALESCE(v_joining_bonus, 0),
    COALESCE(v_joining_bonus, 0),
    (v_joining_bonus > 0),
    v_referral_code,
    FALSE,
    NOW(),
    NOW()
  );

  -- 4. Log transaction (WITHOUT the "notes" column to avoid errors)
  IF v_joining_bonus > 0 THEN
    INSERT INTO wallet_transactions (
      profile_id,
      type,
      amount,
      balance_after,
      created_at
      -- Removed "notes" column because it doesn't exist in your table
    )
    VALUES (
      NEW.id,
      'joining_bonus',
      v_joining_bonus,
      v_joining_bonus,
      NOW()
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- This will log the EXACT error to your Postgres Logs if it fails again
  RAISE WARNING 'Registration Error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_referral_usage(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles 
  SET referral_usage_count = referral_usage_count + 1 
  WHERE id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_bill(p_customer_id uuid, p_billed_by uuid, p_gross_amount numeric, p_redemption_pct numeric, p_cashback_pct numeric, p_payment_method text, p_wallet_source text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_redemption_amount NUMERIC;
  v_net_amount NUMERIC;
  v_cashback_earned NUMERIC;
  v_bill_id UUID;
BEGIN
  -- 1. Calculate Redemption (Discount)
  IF p_wallet_source = 'referral' THEN
    -- Use the value directly as a Rupee amount
    v_redemption_amount := p_redemption_pct; 
  ELSE
    -- Use the value as a percentage for standard cashback
    v_redemption_amount := ROUND((p_gross_amount * p_redemption_pct / 100), 2);
  END IF;
  
  -- Safety: Discount cannot be more than the bill
  v_redemption_amount := LEAST(v_redemption_amount, p_gross_amount);

  -- 2. Calculate Net Amount
  v_net_amount := p_gross_amount - v_redemption_amount;
  
  -- 3. Calculate New Cashback (on the amount they actually paid)
  v_cashback_earned := ROUND((v_net_amount * p_cashback_pct / 100), 2);

  -- 4. Deduct from the correct Wallet
  IF p_wallet_source = 'referral' THEN
    UPDATE public.profiles 
    SET 
        referral_balance = referral_balance - v_redemption_amount,
        referral_usage_count = COALESCE(referral_usage_count, 0) + 1
    WHERE id = p_customer_id;
  ELSE
    UPDATE public.profiles 
    SET cashback_balance = cashback_balance - v_redemption_amount
    WHERE id = p_customer_id;
  END IF;

  -- 5. Add new Cashback earned
  UPDATE public.profiles SET cashback_balance = cashback_balance + v_cashback_earned WHERE id = p_customer_id;

  -- 6. Record the Bill
  INSERT INTO public.bills (
    customer_id, billed_by, gross_amount, 
    redemption_amount, net_amount, cashback_earned, 
    payment_method, wallet_source
  )
  VALUES (
    p_customer_id, p_billed_by, p_gross_amount, 
    v_redemption_amount, v_net_amount, v_cashback_earned, 
    p_payment_method, p_wallet_source
  )
  RETURNING id INTO v_bill_id;

  RETURN jsonb_build_object(
    'bill_id', v_bill_id,
    'redemption_amount', v_redemption_amount,
    'net_amount', v_net_amount
  );
END;
$function$
;

create or replace view "public"."revenue_by_day" as  SELECT date(created_at) AS day,
    (COALESCE(sum(gross_amount), (0)::numeric))::numeric(15,2) AS daily_revenue
   FROM public.bills
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;


CREATE OR REPLACE FUNCTION public.update_customer_stats_on_bill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_referrer_id UUID;
    v_promised_amt NUMERIC;
BEGIN
    -- 1. Update the Customer's Profile (Basic Stats)
    UPDATE public.profiles
    SET 
        total_spent = total_spent + NEW.net_amount,
        visit_count = visit_count + 1,
        is_first_purchase_done = true
    WHERE id = NEW.customer_id;

    -- 2. Check if this customer (the referee) was referred by someone
    -- We look for a record where bonus_paid is false
    SELECT referrer_id, promised_amount 
    INTO v_referrer_id, v_promised_amt
    FROM public.referrals 
    WHERE referee_id = NEW.customer_id 
    AND bonus_paid = false
    LIMIT 1;

    -- 3. If a referrer is found, credit them and update the referral record
    IF v_referrer_id IS NOT NULL THEN
        -- Credit the referrer's wallet and increment their referral count
        UPDATE public.profiles
        SET 
            referral_balance = referral_balance + COALESCE(v_promised_amt, 200),
            total_referrals = total_referrals + 1
        WHERE id = v_referrer_id;

        -- Mark the referral as paid so they don't get credited again on next bill
        UPDATE public.referrals
        SET 
            bonus_paid = true,
            bonus_amount = COALESCE(v_promised_amt, 200),
            paid_at = NOW()
        WHERE referee_id = NEW.customer_id AND referrer_id = v_referrer_id;
    END IF;

    RETURN NEW;
END;
$function$
;

grant delete on table "public"."bills" to "anon";

grant insert on table "public"."bills" to "anon";

grant references on table "public"."bills" to "anon";

grant select on table "public"."bills" to "anon";

grant trigger on table "public"."bills" to "anon";

grant truncate on table "public"."bills" to "anon";

grant update on table "public"."bills" to "anon";

grant delete on table "public"."bills" to "authenticated";

grant insert on table "public"."bills" to "authenticated";

grant references on table "public"."bills" to "authenticated";

grant select on table "public"."bills" to "authenticated";

grant trigger on table "public"."bills" to "authenticated";

grant truncate on table "public"."bills" to "authenticated";

grant update on table "public"."bills" to "authenticated";

grant delete on table "public"."bills" to "service_role";

grant insert on table "public"."bills" to "service_role";

grant references on table "public"."bills" to "service_role";

grant select on table "public"."bills" to "service_role";

grant trigger on table "public"."bills" to "service_role";

grant truncate on table "public"."bills" to "service_role";

grant update on table "public"."bills" to "service_role";

grant delete on table "public"."gift_inventory" to "anon";

grant insert on table "public"."gift_inventory" to "anon";

grant references on table "public"."gift_inventory" to "anon";

grant select on table "public"."gift_inventory" to "anon";

grant trigger on table "public"."gift_inventory" to "anon";

grant truncate on table "public"."gift_inventory" to "anon";

grant update on table "public"."gift_inventory" to "anon";

grant delete on table "public"."gift_inventory" to "authenticated";

grant insert on table "public"."gift_inventory" to "authenticated";

grant references on table "public"."gift_inventory" to "authenticated";

grant select on table "public"."gift_inventory" to "authenticated";

grant trigger on table "public"."gift_inventory" to "authenticated";

grant truncate on table "public"."gift_inventory" to "authenticated";

grant update on table "public"."gift_inventory" to "authenticated";

grant delete on table "public"."gift_inventory" to "service_role";

grant insert on table "public"."gift_inventory" to "service_role";

grant references on table "public"."gift_inventory" to "service_role";

grant select on table "public"."gift_inventory" to "service_role";

grant trigger on table "public"."gift_inventory" to "service_role";

grant truncate on table "public"."gift_inventory" to "service_role";

grant update on table "public"."gift_inventory" to "service_role";

grant delete on table "public"."gift_tiers" to "anon";

grant insert on table "public"."gift_tiers" to "anon";

grant references on table "public"."gift_tiers" to "anon";

grant select on table "public"."gift_tiers" to "anon";

grant trigger on table "public"."gift_tiers" to "anon";

grant truncate on table "public"."gift_tiers" to "anon";

grant update on table "public"."gift_tiers" to "anon";

grant delete on table "public"."gift_tiers" to "authenticated";

grant insert on table "public"."gift_tiers" to "authenticated";

grant references on table "public"."gift_tiers" to "authenticated";

grant select on table "public"."gift_tiers" to "authenticated";

grant trigger on table "public"."gift_tiers" to "authenticated";

grant truncate on table "public"."gift_tiers" to "authenticated";

grant update on table "public"."gift_tiers" to "authenticated";

grant delete on table "public"."gift_tiers" to "service_role";

grant insert on table "public"."gift_tiers" to "service_role";

grant references on table "public"."gift_tiers" to "service_role";

grant select on table "public"."gift_tiers" to "service_role";

grant trigger on table "public"."gift_tiers" to "service_role";

grant truncate on table "public"."gift_tiers" to "service_role";

grant update on table "public"."gift_tiers" to "service_role";

grant delete on table "public"."milestones" to "anon";

grant insert on table "public"."milestones" to "anon";

grant references on table "public"."milestones" to "anon";

grant select on table "public"."milestones" to "anon";

grant trigger on table "public"."milestones" to "anon";

grant truncate on table "public"."milestones" to "anon";

grant update on table "public"."milestones" to "anon";

grant delete on table "public"."milestones" to "authenticated";

grant insert on table "public"."milestones" to "authenticated";

grant references on table "public"."milestones" to "authenticated";

grant select on table "public"."milestones" to "authenticated";

grant trigger on table "public"."milestones" to "authenticated";

grant truncate on table "public"."milestones" to "authenticated";

grant update on table "public"."milestones" to "authenticated";

grant delete on table "public"."milestones" to "service_role";

grant insert on table "public"."milestones" to "service_role";

grant references on table "public"."milestones" to "service_role";

grant select on table "public"."milestones" to "service_role";

grant trigger on table "public"."milestones" to "service_role";

grant truncate on table "public"."milestones" to "service_role";

grant update on table "public"."milestones" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."referrals" to "anon";

grant insert on table "public"."referrals" to "anon";

grant references on table "public"."referrals" to "anon";

grant select on table "public"."referrals" to "anon";

grant trigger on table "public"."referrals" to "anon";

grant truncate on table "public"."referrals" to "anon";

grant update on table "public"."referrals" to "anon";

grant delete on table "public"."referrals" to "authenticated";

grant insert on table "public"."referrals" to "authenticated";

grant references on table "public"."referrals" to "authenticated";

grant select on table "public"."referrals" to "authenticated";

grant trigger on table "public"."referrals" to "authenticated";

grant truncate on table "public"."referrals" to "authenticated";

grant update on table "public"."referrals" to "authenticated";

grant delete on table "public"."referrals" to "service_role";

grant insert on table "public"."referrals" to "service_role";

grant references on table "public"."referrals" to "service_role";

grant select on table "public"."referrals" to "service_role";

grant trigger on table "public"."referrals" to "service_role";

grant truncate on table "public"."referrals" to "service_role";

grant update on table "public"."referrals" to "service_role";

grant delete on table "public"."shop_settings" to "anon";

grant insert on table "public"."shop_settings" to "anon";

grant references on table "public"."shop_settings" to "anon";

grant select on table "public"."shop_settings" to "anon";

grant trigger on table "public"."shop_settings" to "anon";

grant truncate on table "public"."shop_settings" to "anon";

grant update on table "public"."shop_settings" to "anon";

grant delete on table "public"."shop_settings" to "authenticated";

grant insert on table "public"."shop_settings" to "authenticated";

grant references on table "public"."shop_settings" to "authenticated";

grant select on table "public"."shop_settings" to "authenticated";

grant trigger on table "public"."shop_settings" to "authenticated";

grant truncate on table "public"."shop_settings" to "authenticated";

grant update on table "public"."shop_settings" to "authenticated";

grant delete on table "public"."shop_settings" to "service_role";

grant insert on table "public"."shop_settings" to "service_role";

grant references on table "public"."shop_settings" to "service_role";

grant select on table "public"."shop_settings" to "service_role";

grant trigger on table "public"."shop_settings" to "service_role";

grant truncate on table "public"."shop_settings" to "service_role";

grant update on table "public"."shop_settings" to "service_role";

grant delete on table "public"."user_milestones" to "anon";

grant insert on table "public"."user_milestones" to "anon";

grant references on table "public"."user_milestones" to "anon";

grant select on table "public"."user_milestones" to "anon";

grant trigger on table "public"."user_milestones" to "anon";

grant truncate on table "public"."user_milestones" to "anon";

grant update on table "public"."user_milestones" to "anon";

grant delete on table "public"."user_milestones" to "authenticated";

grant insert on table "public"."user_milestones" to "authenticated";

grant references on table "public"."user_milestones" to "authenticated";

grant select on table "public"."user_milestones" to "authenticated";

grant trigger on table "public"."user_milestones" to "authenticated";

grant truncate on table "public"."user_milestones" to "authenticated";

grant update on table "public"."user_milestones" to "authenticated";

grant delete on table "public"."user_milestones" to "service_role";

grant insert on table "public"."user_milestones" to "service_role";

grant references on table "public"."user_milestones" to "service_role";

grant select on table "public"."user_milestones" to "service_role";

grant trigger on table "public"."user_milestones" to "service_role";

grant truncate on table "public"."user_milestones" to "service_role";

grant update on table "public"."user_milestones" to "service_role";

grant delete on table "public"."wallet_transactions" to "anon";

grant insert on table "public"."wallet_transactions" to "anon";

grant references on table "public"."wallet_transactions" to "anon";

grant select on table "public"."wallet_transactions" to "anon";

grant trigger on table "public"."wallet_transactions" to "anon";

grant truncate on table "public"."wallet_transactions" to "anon";

grant update on table "public"."wallet_transactions" to "anon";

grant delete on table "public"."wallet_transactions" to "authenticated";

grant insert on table "public"."wallet_transactions" to "authenticated";

grant references on table "public"."wallet_transactions" to "authenticated";

grant select on table "public"."wallet_transactions" to "authenticated";

grant trigger on table "public"."wallet_transactions" to "authenticated";

grant truncate on table "public"."wallet_transactions" to "authenticated";

grant update on table "public"."wallet_transactions" to "authenticated";

grant delete on table "public"."wallet_transactions" to "service_role";

grant insert on table "public"."wallet_transactions" to "service_role";

grant references on table "public"."wallet_transactions" to "service_role";

grant select on table "public"."wallet_transactions" to "service_role";

grant trigger on table "public"."wallet_transactions" to "service_role";

grant truncate on table "public"."wallet_transactions" to "service_role";

grant update on table "public"."wallet_transactions" to "service_role";


  create policy "Admins insert bills"
  on "public"."bills"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Admins see all bills"
  on "public"."bills"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Customers see own bills"
  on "public"."bills"
  as permissive
  for select
  to public
using ((auth.uid() = customer_id));



  create policy "Admins manage gift_inventory"
  on "public"."gift_inventory"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Public read gift_inventory"
  on "public"."gift_inventory"
  as permissive
  for select
  to public
using (true);



  create policy "Admins manage gift_tiers"
  on "public"."gift_tiers"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Public read gift_tiers"
  on "public"."gift_tiers"
  as permissive
  for select
  to public
using (true);



  create policy "Admins manage milestones"
  on "public"."milestones"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Public read milestones"
  on "public"."milestones"
  as permissive
  for select
  to public
using (true);



  create policy "Admins can read all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Admins can update profiles"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Users can read own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Admins can update settings"
  on "public"."shop_settings"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Anyone authenticated can read settings"
  on "public"."shop_settings"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Users read own milestones"
  on "public"."user_milestones"
  as permissive
  for select
  to public
using ((auth.uid() = profile_id));



  create policy "Admins see all transactions"
  on "public"."wallet_transactions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



  create policy "Customers see own transactions"
  on "public"."wallet_transactions"
  as permissive
  for select
  to public
using ((auth.uid() = profile_id));


CREATE TRIGGER on_bill_inserted AFTER INSERT ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats_on_bill();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

CREATE TRIGGER on_auth_user_created_bonus AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bonus();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();


