# Tutorial 3: Storage (Image Uploads)

If we want to store any user data that isn't fit for a database (e.g. images, files, large documents, etc) we need to have a storage system. We'll now implement that using Supabase storage buckets.

### Objectives

- **Image Uploads**: Users can upload an image attachment
- **Upload Constraints**: Limit uploads to 1MB file size, and only to images.
- **Image Preview**: Users can see a preview of their image on the task page.
- **Automated Clean Up**: Deleting a task should also automatically remove any attached image.

## Apply Storage SQL Migrations

We don't need to do anything in our Supabase dashboard/project to enable Storage. We can just run a migration to create the resources for us directly. Refer to `supabase/migrations/3_init_storage_schema.sql`.

We will create a [storage](https://supabase.com/docs/guides/storage) bucket named `task-attachments`. This will also set a limit for the file size (1MB) and file types (images only).

```sql
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
```

**Important Note**: For the purposes of this tutorial I've made it a public bucket so that images are easy to display. However for production use cases, I recommend making it private/secure, and using pre-signed URLs to access storage items.

Further in the `3_init_storage_schema` file, you'll find SQL statements to apply:

- Security policy: Public can view attachments
- Security policy: Users can upload their own attachments
- Security policy: Users can delete their own attachments
- Trigger: Delete attachment when a task is deleted

## Apply Storage SQL Migrations

If you run this, it should apply the migration on top of any previous migrations.

```sh
supabase db push
```

Or nuke the project and apply it from zero.

```sh
supabase db reset --linked
```

Normally, our previous command won't work anymore because the storage bucket isn't actually covered in the scope of the reset. This will make the storage bucket creation fail, because the bucket already exists.

So we have to first explicitly delete the bucket, _then_ reset. We do that in the SQL file itself.

```sql
delete from storage.buckets where id = 'task-attachments';
```

But in case you don't have to have that statement (to prevent accident storage wipeout), you can also remove the storage via CLI.

```sh
# Manually delete the `task-attachments` bucket.
supabase storage rm ss:///task-attachments -r --experimental

# Then run the DB reset command.
supabase db reset --linked
```

In production, you probably want to be careful with any kind of delete/removal operation (and likely avoid them altogether).

## Implement Storage Hooks

Now back in `hooks/useTaskManager.ts`, we can implement the logic for the image upload:

```js
// Already enforced in the backend, so this is second layer.
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// Implement these hooks.
const uploadImage = async (file: File) => { ... }
const removeImage = async () => { ... }
```

Here is how we use the Supabase client to upload the image directly.

```tsx
await supabase.storage.from("task-attachments").upload(fileName, file, {
  upsert: true,
  contentType: file.type,
  duplex: "half",
  headers: {
    "content-length": file.size.toString(),
  },
});
```

We use the user's ID and the task ID as part of the image path naming convention. This also lets us enforce security on the images.

```sql
with check (
  bucket_id = 'task-attachments'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

Finally, for our Next.JS app to be able to display the images, we need to update `images.remotePatterns` in our `next.config.mjs` file.

```js
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // This becomes "[your-project-id].supabase.co"
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
        pathname: "**",
      },
    ],
  },
};
```

Now, on your development server, you should be able to upload, view and remove images. You should also verify that images are deleted when its parent task is deleted.

## Testing

In our integration test `tests/integration/3_storage.test.ts`, we are explicitly testing two cases:

- A user can upload an image to a task they created. And if they delete that task, the image is deleted too.
- A user cannot upload an image to someone else's task.

```sh
npm test tests/integration/3_storage.test.ts
```
