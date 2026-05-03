CREATE OR REPLACE FUNCTION public.handle_first_purchase_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_id UUID;
    v_reward_amount NUMERIC(15,2);
    v_pending_tx_id UUID;
BEGIN
    -- 1. Check if this is the user's first purchase
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = NEW.customer_id 
        AND is_first_purchase_done = FALSE
    ) THEN
        
        -- 2. Find the Referrer and the Pending Transaction
        SELECT referred_by INTO v_referrer_id 
        FROM public.profiles WHERE id = NEW.customer_id;

        IF v_referrer_id IS NOT NULL THEN
            -- Get the pending amount from the transactions table
            SELECT id, amount INTO v_pending_tx_id, v_reward_amount
            FROM public.wallet_transactions
            WHERE profile_id = v_referrer_id 
            AND type = 'referral_pending'
            AND description LIKE '%' || (SELECT email FROM profiles WHERE id = NEW.customer_id) || '%'
            LIMIT 1;

            IF v_pending_tx_id IS NOT NULL THEN
                -- 3. Update the transaction from 'pending' to 'referral'
                UPDATE public.wallet_transactions
                SET 
                    type = 'referral',
                    description = 'Referral reward confirmed (First purchase complete)',
                    created_at = NOW()
                WHERE id = v_pending_tx_id;

                -- 4. Add the money to the Referrer's actual balance
                UPDATE public.profiles
                SET 
                    referral_balance = referral_balance + v_reward_amount,
                    wallet_balance = wallet_balance + v_reward_amount,
                    updated_at = NOW()
                WHERE id = v_referrer_id;
            END IF;
        END IF;

        -- 5. Mark the new user's first purchase as DONE so this doesn't run again
        UPDATE public.profiles
        SET is_first_purchase_done = TRUE
        WHERE id = NEW.customer_id;

    END IF;
    RETURN NEW;
END;
$$;

-- Attach the trigger to the bills table
DROP TRIGGER IF EXISTS on_bill_created_reward ON public.bills;
CREATE TRIGGER on_bill_created_reward
    AFTER INSERT ON public.bills
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_first_purchase_reward();