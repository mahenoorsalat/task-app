-- First, we need to remove the existing bucket if it exists.
-- This lets us reset the DB without having to manually delete the bucket.
do $$
begin
  if exists (
    select 1 from storage.buckets where id = 'task-attachments'
  ) then
    -- Delete all objects in bucket first
    delete from storage.objects where bucket_id = 'task-attachments';
    -- Then delete bucket
    delete from storage.buckets where id = 'task-attachments';
  end if;
end $$;

-- Create storage bucket with size and MIME type restrictions
insert into storage.buckets (
  id, 
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'task-attachments',
  'task-attachments',
  true,
  1000000, -- 1MB in bytes
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
);

-- Security policy: Public can view attachments
create policy "Public can view attachments"
on storage.objects for select
using (bucket_id = 'task-attachments');

-- Security policy: Users can upload their own attachments
create policy "Users can upload their own attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'task-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Security policy: Users can delete their own attachments
create policy "Users can delete their own attachments"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'task-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to delete task storage object
create or replace function delete_task_storage_object()
returns trigger
security definer
set search_path = public
as $$
begin
  -- Only attempt to delete if there was an image
  if old.image_url is not null then
    -- Delete directly from storage.objects table
    delete from storage.objects
    where bucket_id = 'task-attachments'
    and name = old.image_url;
  end if;
  
  return old;
end;
$$ language plpgsql;

-- Trigger to cleanup storage when task is deleted
create trigger cleanup_storage_on_task_delete
  before delete on public.tasks
  for each row
  execute function delete_task_storage_object();

-- Grant necessary permissions
grant delete on storage.objects to authenticated;
