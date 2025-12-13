-- Function to update task limit on plan change
CREATE OR REPLACE FUNCTION update_task_limit_on_plan_change()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If subscription plan changed to premium
  IF NEW.subscription_plan = 'premium' AND 
     (OLD.subscription_plan IS NULL OR OLD.subscription_plan = 'free') THEN
    NEW.tasks_limit := 10000;
  -- If downgraded to free
  ELSIF NEW.subscription_plan = 'free' AND OLD.subscription_plan = 'premium' THEN
    NEW.tasks_limit := 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update task limit on plan change
CREATE TRIGGER update_task_limit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_task_limit_on_plan_change();