-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule ping at 12:00 (noon) every day
SELECT cron.schedule(
  'database-ping-noon',
  '0 12 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://qywjbutxdklmhihscahy.supabase.co/functions/v1/database-ping',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2pidXR4ZGtsbWhpaHNjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NTI3MjAsImV4cCI6MjA2NTUyODcyMH0.8GZhRVy0HdTO9Wzrh2lg1DE-yPGRnIvna_6OXPjf8HA"}'::jsonb,
      body:='{"ping": true}'::jsonb
    ) AS request_id;
  $$
);

-- Schedule ping at 00:00 (midnight) every day
SELECT cron.schedule(
  'database-ping-midnight',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://qywjbutxdklmhihscahy.supabase.co/functions/v1/database-ping',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2pidXR4ZGtsbWhpaHNjYWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NTI3MjAsImV4cCI6MjA2NTUyODcyMH0.8GZhRVy0HdTO9Wzrh2lg1DE-yPGRnIvna_6OXPjf8HA"}'::jsonb,
      body:='{"ping": true}'::jsonb
    ) AS request_id;
  $$
);