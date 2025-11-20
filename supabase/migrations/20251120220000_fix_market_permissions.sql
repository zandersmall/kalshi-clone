-- Drop restrictive policies
DROP POLICY IF EXISTS "No one can insert markets" ON public.markets;
DROP POLICY IF EXISTS "No one can update markets" ON public.markets;
DROP POLICY IF EXISTS "No one can insert market options" ON public.market_options;
DROP POLICY IF EXISTS "No one can update market options" ON public.market_options;

-- Allow authenticated users to insert/update markets
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

-- Allow authenticated users to insert/update market options
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

-- Add unique constraint to market_options.kalshi_id to support UPSERT
-- First clean up any duplicates if they exist (unlikely given recent truncation)
-- DELETE FROM public.market_options a USING public.market_options b WHERE a.id < b.id AND a.kalshi_id = b.kalshi_id;

ALTER TABLE public.market_options ADD CONSTRAINT market_options_kalshi_id_key UNIQUE (kalshi_id);

