-- Function to check task limits against profile
CREATE OR REPLACE FUNCTION check_task_limit()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month text;
  monthly_count integer;
  user_limit integer;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := to_char(NOW(), 'YYYY-MM');
  
  -- Get user's task limit from profile
  SELECT tasks_limit INTO user_limit 
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Get current month's task count
  SELECT tasks_created INTO monthly_count
  FROM public.usage_tracking
  WHERE user_id = NEW.user_id 
  AND year_month = current_month;

  -- Check if limit would be exceeded
  IF monthly_count >= user_limit THEN
      RAISE EXCEPTION 'Monthly task limit of % reached', user_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to check limit before task insertion
CREATE TRIGGER enforce_task_limit
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION check_task_limit();