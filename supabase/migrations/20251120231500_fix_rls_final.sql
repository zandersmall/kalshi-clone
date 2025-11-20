-- Drop existing policies to start clean
DROP POLICY IF EXISTS "Authenticated users can insert markets" ON public.markets;
DROP POLICY IF EXISTS "Authenticated users can update markets" ON public.markets;

-- Enable RLS
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
-- 1. Allow everyone (anon + authenticated) to READ markets
CREATE POLICY "Everyone can read markets"
ON public.markets
FOR SELECT
USING (true);

-- 2. Allow authenticated users to INSERT markets
CREATE POLICY "Authenticated users can insert markets"
ON public.markets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow authenticated users to UPDATE markets
CREATE POLICY "Authenticated users can update markets"
ON public.markets
FOR UPDATE
TO authenticated
USING (true);

-- 4. Verify permissions for market_options as well
DROP POLICY IF EXISTS "Authenticated users can insert market options" ON public.market_options;
DROP POLICY IF EXISTS "Authenticated users can update market options" ON public.market_options;

CREATE POLICY "Authenticated users can insert market options"
ON public.market_options
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update market options"
ON public.market_options
FOR UPDATE
TO authenticated
USING (true);

