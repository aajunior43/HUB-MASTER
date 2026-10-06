-- Drop the previous cron job if it exists
SELECT cron.unschedule('daily-activity-check');

-- Recreate the scheduled job without schema prefix
SELECT cron.schedule(
  'daily-activity-check',
  '0 12 * * *', -- Every day at 12:00 PM
  $$
  SELECT
    net.http_post(
        url:='https://bfbjpismsvqmihwisezv.supabase.co/functions/v1/daily-activity',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmYmpwaXNtc3ZxbWlod2lzZXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDg1NjQsImV4cCI6MjA3MDkyNDU2NH0.CGo5d65BW28VS48Fp7qz5WJaselSC1NqQrF99z3Xyzw"}'::jsonb,
        body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);