-- Create daily_activity table for automated tracking
CREATE TABLE public.daily_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL
);

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the daily activity function to run every day at 12:00 PM (noon)
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