-- 1. CLEANUP: Remove the 'new' trigger that caused the double payment
DROP TRIGGER IF EXISTS on_bill_inserted ON public.bills;

-- 2. MERGE LOGIC: Update the 'old' function to handle EVERYTHING
CREATE OR REPLACE FUNCTION handle_first_purchase_reward()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_reward_amount NUMERIC(15,2);
    v_pending_tx_id UUID;
    v_customer_email TEXT;
BEGIN
    -- 1. Check if this is the user's first purchase
    -- We use visit_count = 0 or is_first_purchase_done = FALSE
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = NEW.customer_id 
        AND is_first_purchase_done = FALSE
    ) THEN
        
        -- 2. Find the Referrer
        SELECT referred_by, email INTO v_referrer_id, v_customer_email
        FROM public.profiles WHERE id = NEW.customer_id;

        IF v_referrer_id IS NOT NULL THEN
            -- 3. Find the 'Pending' transaction (This keeps your UI happy)
            SELECT id, amount INTO v_pending_tx_id, v_reward_amount
            FROM public.wallet_transactions
            WHERE profile_id = v_referrer_id 
            AND type = 'referral_pending'
            AND description LIKE '%' || v_customer_email || '%'
            LIMIT 1;

            -- If we found a pending transaction, unlock it
            IF v_pending_tx_id IS NOT NULL THEN
                -- A. Update the transaction record (UI moves it from 'Locked' to 'Earned')
                UPDATE public.wallet_transactions
                SET 
                    type = 'referral',
                    description = 'Referral reward confirmed (First purchase complete)',
                    created_at = NOW()
                WHERE id = v_pending_tx_id;

                -- B. Update the Referrer's Profile
                UPDATE public.profiles
                SET 
                    -- Subtract from our new pending column
                    pending_referral_balance = GREATEST(pending_referral_balance - v_reward_amount, 0),
                    -- Add to actual balances
                    referral_balance = referral_balance + v_reward_amount,
                    wallet_balance = wallet_balance + v_reward_amount,
                    total_referrals = total_referrals + 1,
                    updated_at = NOW()
                WHERE id = v_referrer_id;
            END IF;
        END IF;

        -- 4. Standard Stats Update for the customer who just bought something
        UPDATE public.profiles
        SET 
            is_first_purchase_done = TRUE,
            total_spent = total_spent + NEW.net_amount,
            visit_count = visit_count + 1
        WHERE id = NEW.customer_id;

    ELSE
        -- If NOT the first purchase, just update the spending/visit stats
        UPDATE public.profiles
        SET 
            total_spent = total_spent + NEW.net_amount,
            visit_count = visit_count + 1
        WHERE id = NEW.customer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;