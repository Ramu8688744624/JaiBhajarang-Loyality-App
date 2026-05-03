-- Update the allowed types for wallet transactions to include pending referrals
ALTER TABLE wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE wallet_transactions 
ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('cashback', 'referral', 'joining_bonus', 'referral_pending', 'manual_adjustment'));


-- 1. Create or Update the registration logic function
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joining_bonus     NUMERIC(15,2);
  v_referral_reward    NUMERIC(15,2);
  v_referrer_uuid     UUID;
  v_referral_code     TEXT;
  v_referred_by_code  TEXT;
  v_final_username    TEXT;
BEGIN
  -- 1. Get current bonuses from shop_settings
  SELECT 
    COALESCE(joining_bonus, 0), 
    COALESCE(referral_bonus, 0) 
  INTO v_joining_bonus, v_referral_reward 
  FROM shop_settings LIMIT 1;

  -- 2. Extract referral code from the 'NEW' record (auth.users metadata)
  -- The error "record new has no field raw_user_meta_data" happens if this is on the wrong table.
  v_referred_by_code := UPPER(TRIM(NEW.raw_user_meta_data->>'referred_by_code'));
  
  IF v_referred_by_code IS NOT NULL AND v_referred_by_code <> '' THEN
    SELECT id INTO v_referrer_uuid FROM profiles WHERE referral_code = v_referred_by_code LIMIT 1;
  END IF;

  -- 3. Generate internal data for the new user
  v_referral_code := generate_referral_code();
  v_final_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));

  -- 4. Insert the record into public.profiles
  INSERT INTO public.profiles (
    id, email, full_name, phone, username, role,
    cashback_balance, referral_balance, wallet_balance,
    joining_bonus_credited, referral_code, referred_by, 
    is_first_purchase_done, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    v_final_username, 'customer',
    COALESCE(v_joining_bonus, 0), 0, COALESCE(v_joining_bonus, 0),
    (v_joining_bonus > 0), v_referral_code, v_referrer_uuid, 
    FALSE, NOW(), NOW()
  );

  -- 5. Log Referral Reward for the Referrer (if applicable)
  IF v_referrer_uuid IS NOT NULL AND v_referral_reward > 0 THEN
    INSERT INTO wallet_transactions (
      profile_id, type, amount, balance_after, 
      description, wallet_source, created_at
    )
    SELECT 
      v_referrer_uuid, 'referral_pending', v_referral_reward,
      referral_balance, -- Does not affect main balance yet
      'Referral reward for ' || NEW.email, 'referral', NOW()
    FROM profiles WHERE id = v_referrer_uuid;
  END IF;

  -- 6. Log Joining Bonus for the New User
  IF v_joining_bonus > 0 THEN
    INSERT INTO wallet_transactions (
      profile_id, type, amount, balance_after, 
      description, wallet_source, created_at
    )
    VALUES (
      NEW.id, 'joining_bonus', v_joining_bonus, v_joining_bonus,
      'Signup Bonus', 'cashback', NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2. REMOVE the trigger from the WRONG table (where it caused the error)
DROP TRIGGER IF EXISTS on_auth_user_created ON public.profiles;

-- 3. APPLY the trigger to the CORRECT table (auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_registration();