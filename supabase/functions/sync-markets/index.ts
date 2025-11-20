import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    console.log('Starting market sync...');

    // Fetch from Polymarket API (public, no auth needed)
    const polyResponse = await fetch('https://gamma-api.polymarket.com/markets?limit=50&active=true');
    
    if (!polyResponse.ok) {
      throw new Error(`Polymarket API Error: ${polyResponse.status}`);
    }

    const polyMarkets = await polyResponse.json();
    console.log(`Fetched ${polyMarkets.length} markets from Polymarket`);

    const updates = [];
    const optionUpdates = [];
    const historyRecords = [];

    for (const market of polyMarkets) {
      // Map Polymarket categories to our categories
      const categoryMap: Record<string, string> = {
        'politics': 'Politics',
        'crypto': 'Crypto',
        'sports': 'Sports',
        'pop-culture': 'Culture',
        'science': 'Tech & Science',
        'climate': 'Climate'
      };

      const category = categoryMap[market.groupItemTitle?.toLowerCase()] || 
                      categoryMap[market.category?.toLowerCase()] || 
                      'Other';

      // Determine market type
      const isBinary = market.outcomes?.length === 2;
      const marketType = isBinary ? 'binary' : 'multiple_choice';

      // Insert/update market
      const marketData = {
        polymarket_id: market.id || market.condition_id,
        title: market.question || market.title,
        description: market.description || market.question,
        category: category,
        icon: getCategoryIcon(category),
        status: market.closed ? 'closed' : 'active',
        market_type: marketType,
        external_url: `https://polymarket.com/event/${market.slug || market.id}`
      };

      const { data: existingMarket, error: selectError } = await supabase
        .from('markets')
        .select('id')
        .eq('polymarket_id', marketData.polymarket_id)
        .single();

      let marketId;

      if (existingMarket) {
        // Update existing market
        const { error: updateError } = await supabase
          .from('markets')
          .update(marketData)
          .eq('id', existingMarket.id);
        
        if (updateError) {
          console.error('Error updating market:', updateError);
          continue;
        }
        marketId = existingMarket.id;
      } else {
        // Insert new market
        const { data: newMarket, error: insertError } = await supabase
          .from('markets')
          .insert(marketData)
          .select('id')
          .single();
        
        if (insertError) {
          console.error('Error inserting market:', insertError);
          continue;
        }
        marketId = newMarket.id;
      }

      // Sync market options
      if (market.outcomes && market.outcomePrices) {
        for (let i = 0; i < market.outcomes.length; i++) {
          const outcome = market.outcomes[i];
          const price = parseFloat(market.outcomePrices[i]) * 100; // Convert to percentage

          const { data: existingOption } = await supabase
            .from('market_options')
            .select('id, current_probability')
            .eq('market_id', marketId)
            .eq('title', outcome)
            .single();

          if (existingOption) {
            // Update existing option
            await supabase
              .from('market_options')
              .update({ current_probability: price })
              .eq('id', existingOption.id);

            // Record probability change if different
            if (Math.abs(existingOption.current_probability - price) > 0.01) {
              historyRecords.push({
                market_id: marketId,
                option_id: existingOption.id,
                probability: price
              });
            }
          } else {
            // Insert new option
            const { data: newOption } = await supabase
              .from('market_options')
              .insert({
                market_id: marketId,
                title: outcome,
                current_probability: price
              })
              .select('id')
              .single();

            if (newOption) {
              historyRecords.push({
                market_id: marketId,
                option_id: newOption.id,
                probability: price
              });
            }
          }
        }
      }

      updates.push(marketData);
    }

    // Batch insert history records
    if (historyRecords.length > 0) {
      await supabase.from('probability_history').insert(historyRecords);
      console.log(`Recorded ${historyRecords.length} probability updates`);
    }

    console.log(`Successfully synced ${updates.length} markets`);

    return new Response(JSON.stringify({ 
      success: true, 
      markets_synced: updates.length,
      probability_records: historyRecords.length,
      message: "Markets synced successfully from Polymarket"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Politics': '🏛️',
    'Crypto': '₿',
    'Sports': '⚽',
    'Culture': '🎵',
    'Tech & Science': '🤖',
    'Climate': '🌡️',
    'Other': '📊'
  };
  return icons[category] || '📊';
}
