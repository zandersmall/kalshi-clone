# Sync Kalshi Markets Edge Function

This function syncs live market data from Kalshi's **public** API to your Supabase database.

**No API keys are required** for this version.

## Scheduling (Every 10 Minutes)

To keep your market data fresh, you should schedule this function to run every 10 minutes.

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard.
2. Navigate to **Integrations** -> **Edge Functions**.
3. (If available) Enable "Scheduled Functions".
4. Or go to **Database** -> **Extensions** and enable `pg_cron`.
5. Run the following SQL in the **SQL Editor**:

```sql
select cron.schedule(
  'sync-markets-every-10-mins',
  '*/10 * * * *', -- Every 10 minutes
  $$
    select
      net.http_post(
          url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/sync-markets',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb
      ) as request_id;
  $$
);
```
*Replace `<YOUR_PROJECT_REF>` and `<YOUR_ANON_KEY>` with your actual values.*

### Option 2: GitHub Actions or Cron Job
You can also use an external cron service (like GitHub Actions or cron-job.org) to `curl` your function URL periodically.

```bash
curl -X POST 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/sync-markets' \
  -H 'Authorization: Bearer <YOUR_ANON_KEY>'
```
