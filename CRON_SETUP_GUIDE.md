# Vercel Cron Setup Guide — Management Report Delivery

## Problem
Reports are stuck in `pending` status because the cron endpoint `/api/cron/management-delivery` returns **401 Unauthorized**. The root cause: `CRON_SECRET` environment variable is not configured in Vercel.

## Solution Overview

The system uses Vercel Cron Jobs to automatically send reports based on **management_report_schedules** table configuration:

- **Cadence Options**: monthly, quarterly, yearly
- **Day of Month**: 1–28 (when to send each cycle)
- **Report Types**: executive, office, partner, monthly, cumulative
- **Channels**: email (via Resend), download, manual

## Step-by-Step Setup

### 1. Generate CRON_SECRET
Generate a strong random secret for securing the cron endpoint:

```bash
openssl rand -hex 32
```

Example output:
```
a7f3e2b1c9d8e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8
```

### 2. Configure in Vercel

**Via Vercel Dashboard:**
1. Go to your project: `n3uralia-intelligence-platform`
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
   - **Name**: `CRON_SECRET`
   - **Value**: (paste the secret from step 1)
   - **Environment**: Select **Production**
4. Click **Save**
5. Navigate to **Deployments** and click **Redeploy** on the latest main branch deployment

**Via Vercel CLI (alternative):**
```bash
vercel env add CRON_SECRET --scope team_OZTpx87yFUvdvneuoNbJeYS1
# Paste the secret when prompted
# Then redeploy:
vercel redeploy --scope team_OZTpx87yFUvdvneuoNbJeYS1 --prod
```

### 3. Verify Configuration

After redeploy completes:

1. Go to **Cron Jobs** in the Vercel dashboard
2. Find `/api/cron/management-delivery`
3. Click **Test** or **Run** to manually trigger
4. Expected response:
   ```json
   {
     "configured": true,
     "provider": "resend",
     "claimed": N,
     "sent": N,
     "failed": 0,
     "terminal": 0
   }
   ```
5. Check Supabase: The pending distribution record should now have:
   - `status: 'sent'`
   - `sent_at: <timestamp>`
   - `external_reference: <resend-email-id>`

## How Report Scheduling Works

### Report Schedule Record
When a schedule is created (e.g., "Send executive report on the 5th of each month"):

```sql
INSERT INTO management_report_schedules (
  name,
  report_type,        -- 'executive', 'office', 'partner', 'monthly', 'cumulative'
  cadence,            -- 'monthly', 'quarterly', 'yearly'
  day_of_month,       -- 1-28 (when to send in each cycle)
  active,
  recipients,         -- JSON array of subscriber emails
  next_run_at         -- Calculated: next occurrence of (day_of_month, cadence)
);
```

### Automatic Flow

1. **Cron triggers** at the scheduled `next_run_at` time
2. **runManagementReportDelivery()** queries schedules where:
   - `active = true`
   - `next_run_at <= NOW()`
3. For each matching schedule:
   - Generates the report (if not already generated)
   - Creates a `management_report_run` record
   - Creates `management_report_distribution` rows for each recipient
   - Sets `status = 'pending'`
4. **Resend integration** claims pending distributions:
   - Sends via `Business Intelligence Property Partners <info@ppartnersgroup.app>`
   - Updates `status = 'sent'` and `external_reference` with Resend email ID
   - Logs to `report_subscription_events`
5. **Schedule updates**:
   - Sets `last_run_at = NOW()`
   - Calculates next `next_run_at` based on cadence

### Supported Cadences

| Cadence | Frequency | Example |
|---------|-----------|---------|
| `monthly` | Once per month on `day_of_month` | 5th of every month |
| `quarterly` | Once per quarter on `day_of_month` | 5th of Jan, Apr, Jul, Oct |
| `yearly` | Once per year on `day_of_month` | 5th of January |

## Environment Variables Required

- `CRON_SECRET` — The secret configured above (must match what you set in Vercel)
- `RESEND_API_KEY` — Already configured; enables email sending
- `NEXT_PUBLIC_SUPABASE_URL` — Database connection
- `SUPABASE_SERVICE_ROLE_KEY` — For reading schedules and updating distributions

All are already in the project except `CRON_SECRET`.

## Troubleshooting

### Still seeing 401?

1. **Verify secret is set:**
   ```bash
   vercel env list --prod
   ```
   Look for `CRON_SECRET` in the output.

2. **Redeploy was successful?**
   Check **Deployments** — latest should say "Ready".

3. **Clear browser cache** and try **Run** again in Cron Jobs.

### Reports sent but not received?

1. Check `management_report_distributions`:
   ```sql
   SELECT status, external_reference, error_message 
   FROM management_report_distributions 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

2. If `status = 'failed'`, read `error_message` — usually indicates invalid email or Resend quota.

3. Check Resend dashboard: `https://dashboard.resend.com/emails` to verify email was queued.

### Schedule not running?

1. Verify schedule exists and is active:
   ```sql
   SELECT id, name, active, next_run_at, last_run_at 
   FROM management_report_schedules 
   WHERE active = true;
   ```

2. Check `next_run_at` is in the past (or very soon):
   ```sql
   SELECT CURRENT_TIMESTAMP, next_run_at, 
          next_run_at <= CURRENT_TIMESTAMP as should_run
   FROM management_report_schedules 
   WHERE active = true;
   ```

3. If `next_run_at` is far in the future, manually update (for testing):
   ```sql
   UPDATE management_report_schedules 
   SET next_run_at = CURRENT_TIMESTAMP 
   WHERE id = '<schedule-id>';
   ```

## Important Notes

1. **Do NOT open the cron endpoint without authentication.** The `CRON_SECRET` validation prevents unauthorized third parties from triggering expensive report generation and email sends.

2. **Vercel sends auth as Bearer token** in the `Authorization` header. The cron route extracts it and compares:
   ```
   Authorization: Bearer <CRON_SECRET>
   ```

3. **One pending distribution, one email.** If a report has 50 subscribers, it creates 50 distribution rows. Each row becomes one email send via Resend.

4. **Resend tracks each email.** The `external_reference` field stores Resend's email ID for tracking opens, clicks, bounces via Resend dashboard.

5. **Event audit trail.** Every send is logged to `report_subscription_events` with:
   - `event_type`: 'sent', 'failed', 'acknowledged', 'unsubscribed'
   - `metadata`: Error details, Resend response, etc.
   - `timestamp`: Exact moment of event

## Next Steps

1. Generate a strong `CRON_SECRET` with `openssl rand -hex 32`
2. Add it to Vercel Environment Variables (Production)
3. Redeploy
4. Test via **Cron Jobs** → **Run**
5. Verify email arrives in subscriber inbox
6. Check Supabase distribution record is marked `sent`

Done! Reports will now send automatically on the configured schedule.
