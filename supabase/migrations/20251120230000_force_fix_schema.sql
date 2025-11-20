-- 1. Ensure columns definitely exist
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS ticker text;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS kalshi_id text UNIQUE;

-- 2. Force PostgREST schema cache reload
-- This is the standard way to notify PostgREST to reload
NOTIFY pgrst, 'reload config';

-- 3. Alternative: Comment on the table (sometimes triggers refresh)
COMMENT ON TABLE public.markets IS 'Markets available for paper trading';

-- 4. verify permissions
GRANT ALL ON public.markets TO authenticated;
GRANT ALL ON public.markets TO service_role;

