-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run every 12 hours
-- This will call the keep-alive function to maintain database activity
SELECT cron.schedule(
  'keep-alive-every-12-hours',
  '0 */12 * * *', -- At minute 0 past every 12th hour
  $$
  SELECT
    net.http_post(
        url:='https://utefgvyfugfahguzwhob.supabase.co/functions/v1/keep-alive',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZWZndnlmdWdmYWhndXp3aG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDA4MjAsImV4cCI6MjA3NTQxNjgyMH0.68qxbqPK9gztYH4NEv0HYfD4sMWkQ9HwqLdDbHyB_-k"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);