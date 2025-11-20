-- Add CHECK constraint to prevent negative balances
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_balance_positive CHECK (balance >= 0);

-- Drop the existing update policy that allows balance manipulation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a separate table for user settings (username, preferences)
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Migrate existing usernames to user_settings
INSERT INTO public.user_settings (user_id, username)
SELECT id, username FROM public.profiles;

-- Allow users to update their own settings (but not balance)
CREATE POLICY "Users can update their own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add trigger for user_settings updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Lock down markets table - no one can modify
CREATE POLICY "No one can insert markets"
ON public.markets
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No one can update markets"
ON public.markets
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete markets"
ON public.markets
FOR DELETE
USING (false);

-- Lock down market_options table - no one can modify
CREATE POLICY "No one can insert market options"
ON public.market_options
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No one can update market options"
ON public.market_options
FOR UPDATE
USING (false);

CREATE POLICY "No one can delete market options"
ON public.market_options
FOR DELETE
USING (false);

-- Create secure atomic trade execution function
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_user_id uuid,
  p_market_id uuid,
  p_option_id uuid,
  p_outcome text,
  p_quantity integer,
  p_price_per_share numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cost numeric;
  v_current_balance numeric;
  v_position_id uuid;
BEGIN
  -- Validate inputs
  IF p_quantity <= 0 OR p_quantity > 10000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 10,000';
  END IF;
  
  IF p_price_per_share <= 0 OR p_price_per_share > 1 THEN
    RAISE EXCEPTION 'Invalid price per share';
  END IF;
  
  -- Calculate total cost
  v_total_cost := p_quantity * p_price_per_share;
  
  -- Lock the user's profile row and get current balance
  SELECT balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user has sufficient balance
  IF v_current_balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_total_cost, v_current_balance;
  END IF;
  
  -- Create the position
  INSERT INTO public.positions (
    user_id,
    market_id,
    option_id,
    outcome,
    quantity,
    price_per_share,
    total_cost
  ) VALUES (
    p_user_id,
    p_market_id,
    p_option_id,
    p_outcome,
    p_quantity,
    p_price_per_share,
    v_total_cost
  )
  RETURNING id INTO v_position_id;
  
  -- Deduct from balance
  UPDATE public.profiles
  SET balance = balance - v_total_cost
  WHERE id = p_user_id;
  
  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'position_id', v_position_id,
    'new_balance', v_current_balance - v_total_cost,
    'total_cost', v_total_cost
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_trade TO authenticated;