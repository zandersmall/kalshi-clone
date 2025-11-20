-- Create probability_history table for charts
CREATE TABLE IF NOT EXISTS public.probability_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid REFERENCES public.markets(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES public.market_options(id) ON DELETE CASCADE NOT NULL,
  probability numeric NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index for faster chart queries
CREATE INDEX IF NOT EXISTS probability_history_market_recorded_idx ON public.probability_history(market_id, recorded_at);

-- Enable RLS
ALTER TABLE public.probability_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Everyone can read probability history"
ON public.probability_history
FOR SELECT
USING (true);

-- Allow insert only by service role (for edge functions)
CREATE POLICY "Service role can insert probability history"
ON public.probability_history
FOR INSERT
WITH CHECK (true);

