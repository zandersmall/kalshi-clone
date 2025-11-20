import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Note: To use node-forge in Deno for RSA-PSS signing, we import it from esm.sh
// If this fails in your environment, you might need to use a specific version or a different library like 'jsrasign'
import forge from 'https://esm.sh/node-forge@1.3.1'

const KALSHI_API_URL = 'https://api.kalshi.com/trade-api/v2';

serve(async (req) => {
  try {
    // 1. Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Get Kalshi Credentials from Env Vars
    // You must set these using: supabase secrets set KALSHI_KEY_ID=... KALSHI_PRIVATE_KEY=...
    const keyId = Deno.env.get('KALSHI_KEY_ID');
    const privateKeyPem = Deno.env.get('KALSHI_PRIVATE_KEY');

    if (!keyId || !privateKeyPem) {
      console.error("Missing Kalshi credentials");
      return new Response(JSON.stringify({ error: "Missing Kalshi credentials" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Prepare Request to Kalshi
    const timestamp = Date.now().toString();
    const method = "GET";
    const path = "/markets";
    const body = ""; 

    // 4. Sign Request (RSA-SHA256)
    // Kalshi requires RSA-PSS signature. ensuring node-forge handles this correctly is key.
    // If this implementation is complex, consider using a simpler proxy or Kalshi's official SDKs in a Node environment.
    // Here is a simplified signing flow using node-forge:
    
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(timestamp + method + path + body);
    
    // PSS options need to match Kalshi's requirements
    const pss = forge.pss.create({
      md: forge.md.sha256.create(),
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 32 // Standard for SHA256 usually, check Kalshi docs if they use max salt
    });

    const signature = forge.util.encode64(privateKey.sign(md, pss));

    // 5. Fetch Data
    const response = await fetch(`${KALSHI_API_URL}${path}`, {
      headers: {
        'KALSHI-ACCESS-KEY': keyId,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kalshi API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const markets = data.markets || [];

    // 6. Upsert into Supabase
    // This maps the external data to our internal schema
    // We only take the first 50 to avoid timeouts in this demo
    const updates = markets.slice(0, 50).map((m: any) => ({
      kalshi_id: m.ticker, // Using ticker as unique ID usually safe, or m.id
      ticker: m.ticker,
      title: m.title,
      category: m.category,
      description: m.subtitle || m.title, // Kalshi structure varies
      status: m.status,
      // Default icon for now
      icon: "📊" 
    }));

    // Upsert markets
    const { error: marketError } = await supabase
      .from('markets')
      .upsert(updates, { onConflict: 'kalshi_id' })
      .select();

    if (marketError) throw marketError;

    // Upsert options (simplified: just Yes/No for now, Kalshi has yes/no markets usually)
    // We need to fetch market IDs from our DB to link options correctly?
    // Or we rely on the upsert returning IDs.
    
    // For this demo, we'll just return success count.
    // A full implementation would loop through markets and upsert their options.

    return new Response(JSON.stringify({ 
      success: true, 
      markets_synced: updates.length,
      message: "Markets synced successfully. Note: Options sync requires additional logic."
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
})

