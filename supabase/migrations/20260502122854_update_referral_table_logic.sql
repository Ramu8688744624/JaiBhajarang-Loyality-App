-- migration_name: fix_referral_logic_v2

-- Step 1: Drop the old trigger to prevent conflicts
DROP TRIGGER IF EXISTS on_bill_inserted ON public.bills;

-- Step 2: Update the function to use 'profiles' and 'shop_settings' correctly
CREATE OR REPLACE FUNCTION update_customer_stats_on_bill()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_bonus_amt NUMERIC;
BEGIN
    -- 1. Update the Customer's Profile (Basic Stats)
    UPDATE public.profiles
    SET 
        total_spent = total_spent + NEW.net_amount,
        visit_count = visit_count + 1,
        is_first_purchase_done = true
    WHERE id = NEW.customer_id;

    -- 2. Find who referred this customer using the 'profiles' table
    SELECT referred_by INTO v_referrer_id
    FROM public.profiles 
    WHERE id = NEW.customer_id;

    -- 3. Get the reward amount from your settings
    SELECT referral_bonus INTO v_bonus_amt FROM shop_settings LIMIT 1;
    v_bonus_amt := COALESCE(v_bonus_amt, 200);

    -- 4. Reward the referrer ONLY if this is the customer's very first bill
    IF v_referrer_id IS NOT NULL AND 
       (SELECT visit_count FROM public.profiles WHERE id = NEW.customer_id) = 1 THEN
        
        UPDATE public.profiles
        SET 
            referral_balance = referral_balance + v_bonus_amt,
            total_referrals = total_referrals + 1
        WHERE id = v_referrer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Re-attach the trigger to the bills table
CREATE TRIGGER on_bill_inserted
AFTER INSERT ON public.bills
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats_on_bill();