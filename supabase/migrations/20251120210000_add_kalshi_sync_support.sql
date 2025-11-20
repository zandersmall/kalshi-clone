-- Add kalshi_id to markets and market_options
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS kalshi_id text UNIQUE;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS ticker text;

ALTER TABLE public.market_options ADD COLUMN IF NOT EXISTS kalshi_id text;

-- Create sell_position function (FIFO logic)
CREATE OR REPLACE FUNCTION public.sell_position(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome text,
  p_quantity integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_to_sell integer := p_quantity;
  v_position record;
  v_current_price numeric;
  v_payout numeric := 0;
  v_total_sold integer := 0;
  v_option_id uuid;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity to sell';
  END IF;

  -- Get option_id and current price
  SELECT id, current_probability INTO v_option_id, v_current_price
  FROM public.market_options
  WHERE market_id = p_market_id AND title = p_outcome;

  IF v_option_id IS NULL THEN
    RAISE EXCEPTION 'Market option not found';
  END IF;

  -- Price is percentage (0-100), so divide by 100 to get dollar value per share
  v_current_price := v_current_price / 100.0;

  -- Loop through positions (FIFO order)
  FOR v_position IN 
    SELECT * FROM public.positions 
    WHERE user_id = p_user_id 
      AND market_id = p_market_id 
      AND outcome = p_outcome
      AND quantity > 0
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    IF v_remaining_to_sell <= 0 THEN
      EXIT;
    END IF;

    IF v_position.quantity <= v_remaining_to_sell THEN
      -- Sell entire position
      v_payout := v_payout + (v_position.quantity * v_current_price);
      v_remaining_to_sell := v_remaining_to_sell - v_position.quantity;
      DELETE FROM public.positions WHERE id = v_position.id;
    ELSE
      -- Partial sell
      v_payout := v_payout + (v_remaining_to_sell * v_current_price);
      UPDATE public.positions 
      SET quantity = quantity - v_remaining_to_sell 
      WHERE id = v_position.id;
      v_remaining_to_sell := 0;
    END IF;
  END LOOP;

  IF v_remaining_to_sell > 0 THEN
    RAISE EXCEPTION 'Insufficient shares to sell. You tried to sell %, but only owned %.', p_quantity, p_quantity - v_remaining_to_sell;
  END IF;

  -- Update balance
  UPDATE public.profiles
  SET balance = balance + v_payout
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'payout', v_payout,
    'quantity_sold', p_quantity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sell_position TO authenticated;
