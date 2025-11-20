# Sync Markets Edge Function

This function syncs prediction markets from Polymarket's public API into your Supabase database.

## Features

- ✅ Fetches live markets from Polymarket
- ✅ Supports both binary (Yes/No) and multiple-choice markets
- ✅ Records probability history for charting
- ✅ Real-time updates via Supabase subscriptions
- ✅ No authentication required (public API)

## Manual Sync

Click the "Sync Markets" button on the homepage to manually trigger a sync.

## Automatic Syncing

To set up automatic syncing every 5 minutes, you can use:

### Option 1: Supabase Cron (Recommended)

Add to your `supabase/config.toml`:

```toml
[functions.sync-markets.schedule]
cron = "*/5 * * * *"  # Every 5 minutes
```

### Option 2: External Cron Service

Use a service like cron-job.org or GitHub Actions to call:

```bash
curl -X POST https://ziihwvmenujirdaptbcx.supabase.co/functions/v1/sync-markets
```

## API Response

```json
{
  "success": true,
  "markets_synced": 50,
  "probability_records": 100,
  "message": "Markets synced successfully from Polymarket"
}
```

## Markets Supported

The function fetches the top 50 active markets from Polymarket, including:
- US Politics (Presidential elections, legislation, etc.)
- Crypto (Bitcoin, Ethereum prices)
- Sports (game outcomes, championships)
- Pop Culture (awards, entertainment)
- Science & Technology

## Database Tables Used

- `markets` - Market metadata and status
- `market_options` - Individual outcomes (Yes/No or multiple choices)
- `probability_history` - Historical probability data for charts
