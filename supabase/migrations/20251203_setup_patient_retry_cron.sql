-- =====================================================
-- SETUP CRON JOB FOR PATIENT CALL RETRIES
-- =====================================================
-- This migration sets up a scheduled job to process
-- pending patient call retries every 5 minutes.
-- The Edge Function itself checks calling hours (7am-9:30pm AEST).
--
-- IMPORTANT: Before running this, you need to store the service role key
-- in Vault by running this in the SQL Editor:
--
--   SELECT vault.create_secret('your-service-role-key', 'service_role_key');
--
-- You can find your service role key at:
-- https://supabase.com/dashboard/project/_/settings/api
-- =====================================================

-- =====================================================
-- 1. Enable Required Extensions
-- =====================================================
-- pg_cron: Allows scheduling of database jobs (usually pre-enabled)
-- pg_net: Allows making HTTP requests from the database

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =====================================================
-- 2. Store Project URL in Vault (if not already done)
-- =====================================================
-- This creates the secret only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret('https://rkzcybthcszeusrohbtc.supabase.co', 'project_url');
  END IF;
END $$;

-- =====================================================
-- 3. Create the Cron Job
-- =====================================================
-- Unschedule if exists (to allow re-running this migration)
SELECT cron.unschedule('process-patient-retries')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-patient-retries');

-- Schedule the job to run every 5 minutes
-- The Edge Function checks calling hours internally, so we run 24/7
SELECT cron.schedule(
  'process-patient-retries',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') 
           || '/functions/v1/process-patient-retries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- =====================================================
-- 4. Verification Queries (run these manually to check)
-- =====================================================
-- Check the job is created:
-- SELECT * FROM cron.job WHERE jobname = 'process-patient-retries';

-- View recent job runs:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-patient-retries') 
-- ORDER BY start_time DESC LIMIT 10;

-- Check HTTP responses from the Edge Function:
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;

-- =====================================================
-- DONE
-- =====================================================

