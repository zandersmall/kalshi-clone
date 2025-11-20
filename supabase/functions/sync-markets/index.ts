import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Kalshi market sync via public API...');

    // 1. Fetch Markets (Public Endpoint)
    // Using the elections endpoint as it often exposes public data easier, or try the main one if limits allow.
    // Docs suggest /markets is public.
    const response = await fetch(`${KALSHI_PUBLIC_API_URL}/markets?limit=100&status=open`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kalshi API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const markets = data.markets || [];
    console.log(`Fetched ${markets.length} markets from Kalshi`);

    const updates = [];
    const historyRecords = [];

    // Process markets
    for (const m of markets) {
      const category = m.category || 'Other';
      
      // Upsert Market
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .upsert({
          kalshi_id: m.ticker,
          ticker: m.ticker,
          title: m.title,
          category: category,
          description: m.subtitle || m.title,
          status: m.status,
          icon: getCategoryIcon(category),
          updated_at: new Date().toISOString()
        }, { onConflict: 'kalshi_id' })
        .select()
        .single();

      if (marketError) {
        console.error(`Error upserting market ${m.ticker}:`, marketError);
        continue;
      }

      updates.push(m.ticker);

      // Kalshi public API typically returns 'yes_bid', 'yes_ask', 'last_price'
      let yesPrice = m.last_price;
      if (!yesPrice && m.yes_bid && m.yes_ask) {
        yesPrice = Math.round((m.yes_bid + m.yes_ask) / 2);
      }
      // If absolutely no price data, skip updating options to avoid bad data
      if (yesPrice === undefined || yesPrice === null) continue;

      const noPrice = 100 - yesPrice;

      const outcomes = [
        { title: 'Yes', price: yesPrice },
        { title: 'No', price: noPrice }
      ];

      for (const outcome of outcomes) {
        // Check existing to see if price changed
        const { data: existing } = await supabase
          .from('market_options')
          .select('id, current_probability')
          .eq('market_id', marketData.id)
          .eq('title', outcome.title)
          .maybeSingle();

        if (existing) {
          // Only update if changed
          if (existing.current_probability !== outcome.price) {
            await supabase
              .from('market_options')
              .update({ 
                current_probability: outcome.price,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            historyRecords.push({
              market_id: marketData.id,
              option_id: existing.id,
              probability: outcome.price
            });
          }
        } else {
          // Insert new
          const { data: newOpt } = await supabase
            .from('market_options')
            .insert({
              market_id: marketData.id,
              title: outcome.title,
              current_probability: outcome.price
            })
            .select()
            .single();
            
          if (newOpt) {
            historyRecords.push({
              market_id: marketData.id,
              option_id: newOpt.id,
              probability: outcome.price
            });
          }
        }
      }
    }


    // Batch insert history
    if (historyRecords.length > 0) {
      const { error: historyError } = await supabase
        .from('probability_history')
        .insert(historyRecords);
      
      if (historyError) console.error('History insert error:', historyError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      markets_synced: updates.length,
      history_records: historyRecords.length,
      message: "Kalshi markets synced successfully"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})

function getCategoryIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('politic') || c.includes('gov')) return '🏛️';
  if (c.includes('crypto') || c.includes('bitcoin')) return '₿';
  if (c.includes('sport')) return '⚽';
  if (c.includes('tech') || c.includes('sci')) return '🤖';
  if (c.includes('econ') || c.includes('fin')) return '📈';
  if (c.includes('climat') || c.includes('weather')) return '🌡️';
  return '📊';
}
