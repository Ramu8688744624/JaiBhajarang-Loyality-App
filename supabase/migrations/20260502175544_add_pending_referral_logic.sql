-- 1. DATABASE CHANGE: Add the pending balance column
-- This keeps the table structure in sync across environments
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_referral_balance NUMERIC DEFAULT 0;

-- 2. REGISTRATION LOGIC: The "Hook"
-- Adds to pending balance based on CURRENT shop settings at time of signup
CREATE OR REPLACE FUNCTION handle_new_user_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_current_setting_bonus NUMERIC;
BEGIN
    -- Get the bonus rate active RIGHT NOW
    SELECT referral_bonus INTO v_current_setting_bonus FROM shop_settings LIMIT 1;
    v_current_setting_bonus := COALESCE(v_current_setting_bonus, 200);

    -- Get the person who referred this new user
    v_referrer_id := NEW.referred_by;

    IF v_referrer_id IS NOT NULL THEN
        -- Add the current rate to PENDING
        UPDATE public.profiles
        SET pending_referral_balance = pending_referral_balance + v_current_setting_bonus
        WHERE id = v_referrer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger for new user bonus is active on the profiles table
DROP TRIGGER IF EXISTS on_auth_user_created_bonus ON public.profiles;
CREATE TRIGGER on_auth_user_created_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_bonus();

-- 3. BILLING LOGIC: The "Unlock"
-- Moves the reward from Pending to Available based on the rate active at the time of purchase
CREATE OR REPLACE FUNCTION update_customer_stats_on_bill()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_unlock_amt NUMERIC;
BEGIN
    -- Update the Customer's Profile (Standard visit stats)
    UPDATE public.profiles
    SET 
        total_spent = total_spent + NEW.net_amount,
        visit_count = visit_count + 1,
        is_first_purchase_done = true
    WHERE id = NEW.customer_id;

    -- Find the referrer
    SELECT referred_by INTO v_referrer_id
    FROM public.profiles 
    WHERE id = NEW.customer_id;

    -- Get the bonus amount active at this moment
    SELECT referral_bonus INTO v_unlock_amt FROM shop_settings LIMIT 1;
    v_unlock_amt := COALESCE(v_unlock_amt, 200);

    -- Reward the referrer ONLY on the very first visit
    IF v_referrer_id IS NOT NULL AND 
       (SELECT visit_count FROM public.profiles WHERE id = NEW.customer_id) = 1 THEN
        
        UPDATE public.profiles
        SET 
            -- Subtract exactly the current amount from Pending and add to Available
            -- GREATEST ensures we don't go below 0 if settings changed drastically
            pending_referral_balance = GREATEST(pending_referral_balance - v_unlock_amt, 0),
            referral_balance = referral_balance + v_unlock_amt,
            total_referrals = total_referrals + 1
        WHERE id = v_referrer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach the billing trigger to the bills table
DROP TRIGGER IF EXISTS on_bill_inserted ON public.bills;
CREATE TRIGGER on_bill_inserted
AFTER INSERT ON public.bills
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats_on_bill();