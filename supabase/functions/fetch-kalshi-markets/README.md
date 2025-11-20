# Fetch Kalshi Markets Edge Function

This Supabase Edge Function fetches live market data from Kalshi and syncs it to your Supabase database.

## Prerequisites

1. **Kalshi Account**: You need a Kalshi account to get API keys.
2. **RSA Keys**: You need to generate an RSA-4096 key pair.
   - Register the public key in your Kalshi account settings.
   - Keep the private key safe.

## Deployment Instructions

1. **Login to Supabase CLI**:
   ```bash
   supabase login
   ```

2. **Set Secrets**:
   You need to set the `KALSHI_KEY_ID` (the Key ID from Kalshi dashboard) and `KALSHI_PRIVATE_KEY` (the contents of your private key file).
   
   ```bash
   # Example
   supabase secrets set KALSHI_KEY_ID="your-key-id"
   supabase secrets set KALSHI_PRIVATE_KEY="$(cat path/to/private-key.pem)"
   ```

3. **Deploy Function**:
   ```bash
   supabase functions deploy fetch-kalshi-markets
   ```

## Invocation

You can invoke this function manually via curl or set up a database cron job to run it periodically.

```bash
curl -L -X POST 'https://<project-ref>.supabase.co/functions/v1/fetch-kalshi-markets' -H 'Authorization: Bearer <anon-key>'
```

## Security Note

This function handles your private Kalshi keys. By running it as an Edge Function, your keys are stored securely in Supabase Secrets and never exposed to the client (frontend).

