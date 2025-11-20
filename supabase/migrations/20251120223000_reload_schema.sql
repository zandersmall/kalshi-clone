-- Force schema cache reload
NOTIFY pgrst, 'reload config';

-- Ensure columns exist (idempotent)
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS ticker text;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS kalshi_id text UNIQUE;

-- Grant permissions again to be sure
GRANT ALL ON public.markets TO authenticated;
GRANT ALL ON public.market_options TO authenticated;

