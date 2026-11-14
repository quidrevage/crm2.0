-- LegalDesk UA — private document storage.
-- One private bucket. Files are reachable only by signed-in active users, via short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (select private.is_active_user()));

create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select private.is_active_user()));

-- No update policy: a stored file is never overwritten; a new version is a new object.
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select private.is_admin()));
