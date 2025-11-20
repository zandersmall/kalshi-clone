-- Verify constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'market_options_kalshi_id_key'
    ) THEN
        RAISE NOTICE 'Missing unique constraint on market_options.kalshi_id';
    END IF;
END $$;

-- Check RLS
SELECT * FROM pg_policies WHERE tablename = 'market_options';

