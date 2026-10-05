-- Enable RLS on daily_activity table
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow system access (since this is automated)
CREATE POLICY "Allow system access to daily_activity" 
ON public.daily_activity 
FOR ALL 
USING (true);

-- Move extensions from public schema to extensions schema
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the scheduled job with proper schema references
SELECT extensions.cron.schedule(
  'daily-activity-check',
  '0 12 * * *', -- Every day at 12:00 PM
  $$
  SELECT
    extensions.net.http_post(
        url:='https://bfbjpismsvqmihwisezv.supabase.co/functions/v1/daily-activity',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmYmpwaXNtc3ZxbWlod2lzZXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDg1NjQsImV4cCI6MjA3MDkyNDU2NH0.CGo5d65BW28VS48Fp7qz5WJaselSC1NqQrF99z3Xyzw"}'::jsonb,
        body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);