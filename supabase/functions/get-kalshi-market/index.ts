import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const KALSHI_PUBLIC_API_URL = 'https://api.elections.kalshi.com/trade-api/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      throw new Error("URL is required");
    }

    // Extract ticker from URL
    // Example: https://kalshi.com/markets/KXHIGHNY/will-nyc-reach-96-degrees
    // Ticker: KXHIGHNY
    const match = url.match(/markets\/([A-Z0-9-]+)/);
    if (!match) {
      throw new Error("Invalid Kalshi URL format. Expected https://kalshi.com/markets/TICKER/...");
    }
    const seriesTicker = match[1];

    console.log(`Fetching details for series: ${seriesTicker}`);

    // Fetch Market Details
    const response = await fetch(`${KALSHI_PUBLIC_API_URL}/markets?series_ticker=${seriesTicker}`);
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kalshi API Error: ${response.status} ${text}`);
    }

    const data = await response.json();
    const markets = data.markets || [];

    if (markets.length === 0) {
      throw new Error("No markets found for this ticker");
    }

    // Fetch History (Candlesticks) for the series or the first market
    // We'll try to get history for the first market in the series to show a chart
    // Public API for history might be /series/{ticker}/candlesticks or similar?
    // Checking docs... usually it's /series/{ticker}/candlesticks is authenticated?
    // Let's try /markets/{ticker}/candlesticks (often requires auth).
    // However, we can try to fetch the series info.
    
    // Structure the response for preview
    const marketGroup = {
      series_ticker: seriesTicker,
      title: markets[0].title, // Or derive from series
      category: markets[0].category,
      markets: markets.map((m: any) => ({
        ticker: m.ticker,
        title: m.title,
        subtitle: m.subtitle,
        yes_price: m.yes_ask || m.last_price || 50,
        no_price: 100 - (m.yes_ask || m.last_price || 50),
        status: m.status
      }))
    };

    return new Response(JSON.stringify(marketGroup), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

