-- Add fields to support external market integrations and probability history
ALTER TABLE markets ADD COLUMN IF NOT EXISTS kalshi_id TEXT UNIQUE;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS polymarket_id TEXT UNIQUE;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS market_type TEXT DEFAULT 'binary' CHECK (market_type IN ('binary', 'multiple_choice'));
ALTER TABLE markets ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Create probability history table for charts
CREATE TABLE IF NOT EXISTS probability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES market_options(id) ON DELETE CASCADE,
  probability NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT probability_range CHECK (probability >= 0 AND probability <= 100)
);

-- Enable RLS on probability_history
ALTER TABLE probability_history ENABLE ROW LEVEL SECURITY;

-- Everyone can view probability history
CREATE POLICY "Probability history is viewable by everyone"
  ON probability_history FOR SELECT
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_probability_history_market_option 
  ON probability_history(market_id, option_id, recorded_at DESC);

-- Enable realtime for markets and options tables
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
ALTER PUBLICATION supabase_realtime ADD TABLE market_options;
ALTER PUBLICATION supabase_realtime ADD TABLE probability_history;