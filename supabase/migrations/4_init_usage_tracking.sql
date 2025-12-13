-- Usage tracking
create table public.usage_tracking (
  user_id uuid references public.profiles on delete cascade,
  year_month text,
  tasks_created integer default 0,
  primary key (user_id, year_month)
);

-- Function to increment task count
create or replace function increment_task_count() 
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.usage_tracking (user_id, year_month, tasks_created)
  values (NEW.user_id, to_char(NOW(), 'YYYY-MM'), 1)
  on conflict (user_id, year_month)
  do update set tasks_created = usage_tracking.tasks_created + 1;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to increment task count after task creation
create trigger increment_task_count_after_insert
  after insert on public.tasks
  for each row
  execute function increment_task_count();

-- Security policy: Users can read their own usage tracking
create policy "Users can read own usage tracking"
on public.usage_tracking for select
using (auth.uid() = user_id);

-- Enable RLS
alter table public.usage_tracking enable row level security;