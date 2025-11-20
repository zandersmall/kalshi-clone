-- Create sell_position function to handle selling shares
CREATE OR REPLACE FUNCTION public.sell_position(
  p_user_id UUID,
  p_market_id UUID,
  p_outcome TEXT,
  p_quantity INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_owned INTEGER;
  v_payout NUMERIC;
  v_market_option RECORD;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 OR p_quantity > 10000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 10,000';
  END IF;

  -- Get user's total position for this outcome
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_owned
  FROM positions
  WHERE user_id = p_user_id 
    AND market_id = p_market_id 
    AND outcome = p_outcome;

  -- Check if user has enough shares
  IF v_total_owned < p_quantity THEN
    RAISE EXCEPTION 'Insufficient shares to sell';
  END IF;

  -- Get current market option price
  SELECT * INTO v_market_option
  FROM market_options
  WHERE market_id = p_market_id AND title = p_outcome;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market option not found';
  END IF;

  -- Calculate payout (current probability as price per share)
  v_payout := p_quantity * (v_market_option.current_probability / 100);

  -- Insert negative position (represents sell)
  INSERT INTO positions (user_id, market_id, option_id, outcome, quantity, price_per_share, total_cost)
  VALUES (
    p_user_id,
    p_market_id,
    v_market_option.id,
    p_outcome,
    -p_quantity,
    v_market_option.current_probability / 100,
    -v_payout
  );

  -- Add payout to user's balance
  UPDATE profiles
  SET balance = balance + v_payout
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'payout', v_payout,
    'new_balance', (SELECT balance FROM profiles WHERE id = p_user_id)
  );
END;
$$;