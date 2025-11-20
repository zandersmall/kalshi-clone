-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 10000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create markets table
CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  resolve_date TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Markets are viewable by everyone"
  ON public.markets FOR SELECT
  USING (true);

-- Create market options table (Yes/No outcomes)
CREATE TABLE public.market_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  current_probability DECIMAL(5, 2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.market_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market options are viewable by everyone"
  ON public.market_options FOR SELECT
  USING (true);

-- Create positions table (user's trades)
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.market_options(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_share DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own positions"
  ON public.positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create positions"
  ON public.positions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_markets_updated_at
  BEFORE UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_options_updated_at
  BEFORE UPDATE ON public.market_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample markets
INSERT INTO public.markets (title, description, category, icon, resolve_date) VALUES
('Next US Presidential Election Winner?', 'Which party will win the 2028 US Presidential Election?', 'Politics', '🏛️', '2028-11-08'),
('Will Bitcoin reach $150k in 2025?', 'Will Bitcoin (BTC) reach $150,000 USD by end of 2025?', 'Crypto', '₿', '2025-12-31'),
('Will AI exceed human performance on all benchmarks by 2026?', 'Will artificial intelligence systems exceed human-level performance on all major cognitive benchmarks?', 'Tech & Science', '🤖', '2026-12-31'),
('Will Taylor Swift win Album of the Year at 2026 Grammys?', 'Will Taylor Swift win the Grammy for Album of the Year in 2026?', 'Culture', '🎵', '2026-02-08'),
('Will global temperatures rise above 1.5°C in 2025?', 'Will global average temperatures exceed 1.5°C above pre-industrial levels?', 'Climate', '🌡️', '2025-12-31');

-- Insert market options (Yes/No for each market)
INSERT INTO public.market_options (market_id, title, current_probability)
SELECT id, 'Yes', 45.00 FROM public.markets WHERE title LIKE '%Presidential%'
UNION ALL
SELECT id, 'No', 55.00 FROM public.markets WHERE title LIKE '%Presidential%'
UNION ALL
SELECT id, 'Yes', 32.00 FROM public.markets WHERE title LIKE '%Bitcoin%'
UNION ALL
SELECT id, 'No', 68.00 FROM public.markets WHERE title LIKE '%Bitcoin%'
UNION ALL
SELECT id, 'Yes', 23.00 FROM public.markets WHERE title LIKE '%AI exceed%'
UNION ALL
SELECT id, 'No', 77.00 FROM public.markets WHERE title LIKE '%AI exceed%'
UNION ALL
SELECT id, 'Yes', 41.00 FROM public.markets WHERE title LIKE '%Taylor Swift%'
UNION ALL
SELECT id, 'No', 59.00 FROM public.markets WHERE title LIKE '%Taylor Swift%'
UNION ALL
SELECT id, 'Yes', 67.00 FROM public.markets WHERE title LIKE '%temperatures%'
UNION ALL
SELECT id, 'No', 33.00 FROM public.markets WHERE title LIKE '%temperatures%';

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    10000.00
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();