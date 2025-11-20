-- Fix RLS policy for markets table to properly check authentication
-- The existing policy checks 'true' but we need to ensure the user is authenticated

DROP POLICY IF EXISTS "Authenticated users can insert markets" ON public.markets;
DROP POLICY IF EXISTS "Authenticated users can update markets" ON public.markets;

CREATE POLICY "Authenticated users can insert markets" 
ON public.markets 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update markets" 
ON public.markets 
FOR UPDATE 
TO authenticated
USING (true);

-- Also need to fix market_options RLS to allow authenticated users to insert/update
DROP POLICY IF EXISTS "No one can insert market options" ON public.market_options;
DROP POLICY IF EXISTS "No one can update market options" ON public.market_options;

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