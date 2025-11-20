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

    console.log('Starting sync for SAVED markets...');

    // 1. Get all active markets from DB
    const { data: savedMarkets, error: dbError } = await supabase
      .from('markets')
      .select('kalshi_id')
      .eq('status', 'active');

    if (dbError) throw dbError;

    if (!savedMarkets || savedMarkets.length === 0) {
      return new Response(JSON.stringify({ message: "No active markets to sync" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates = [];
    const historyRecords = [];

    // 2. Iterate and update
    for (const saved of savedMarkets) {
      const seriesTicker = saved.kalshi_id;
      
      // Fetch fresh data
      const response = await fetch(`${KALSHI_PUBLIC_API_URL}/markets?series_ticker=${seriesTicker}`);
      if (!response.ok) {
        console.error(`Failed to fetch ${seriesTicker}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const markets = data.markets || [];

      if (markets.length === 0) continue;

      // Update logic (similar to before but scoped)
      // We assume the Market (Series) exists, we update its options
      
      for (const m of markets) {
         let price = m.last_price;
         if (!price && m.yes_bid && m.yes_ask) {
           price = Math.round((m.yes_bid + m.yes_ask) / 2);
         }
         if (!price) price = 1; // Default to low not 50 to avoid confusion if inactive

         // Determine Option Title
         // If only 1 market in response, it's binary Yes/No
         // If multiple, it's multi-outcome
         const isMulti = markets.length > 1;
         
         if (isMulti) {
            const title = m.subtitle || m.ticker;
            await updateOption(supabase, saved.kalshi_id, title, price, historyRecords);
         } else {
            // Binary
            await updateOption(supabase, saved.kalshi_id, 'Yes', price, historyRecords);
            await updateOption(supabase, saved.kalshi_id, 'No', 100 - price, historyRecords);
         }
      }
      updates.push(seriesTicker);
    }

    // Batch insert history
    if (historyRecords.length > 0) {
      await supabase.from('probability_history').insert(historyRecords);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      markets_updated: updates.length, 
      history_records: historyRecords.length 
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

async function updateOption(supabase: any, seriesTicker: string, title: string, price: number, historyRecords: any[]) {
  // Get market_id from seriesTicker
  const { data: market } = await supabase
    .from('markets')
    .select('id')
    .eq('kalshi_id', seriesTicker)
    .single();
    
  if (!market) return;

  // Upsert Option
  // We use a join or just try to select first
  const { data: option } = await supabase
    .from('market_options')
    .select('id, current_probability')
    .eq('market_id', market.id)
    .eq('title', title)
    .maybeSingle();

  if (option) {
    if (option.current_probability !== price) {
      await supabase
        .from('market_options')
        .update({ current_probability: price, updated_at: new Date().toISOString() })
        .eq('id', option.id);
      
      historyRecords.push({
        market_id: market.id,
        option_id: option.id,
        probability: price
      });
    }
  } else {
      // Option doesn't exist? Create it.
      const { data: newOpt } = await supabase
        .from('market_options')
        .insert({
            market_id: market.id,
            title: title,
            current_probability: price
        })
        .select()
        .single();
        
       if (newOpt) {
         historyRecords.push({
            market_id: market.id,
            option_id: newOpt.id,
            probability: price
         });
       }
  }
}
