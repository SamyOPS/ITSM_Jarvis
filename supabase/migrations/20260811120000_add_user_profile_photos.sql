alter table public.users
  add column if not exists profile_photo_url text;

create table if not exists public.user_profile_photos (
  user_id uuid primary key references public.users(id) on delete cascade,
  bucket_id text not null default 'profile-photos',
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_profile_photos_storage_path_key
  on public.user_profile_photos(storage_path);

create or replace function public.set_user_profile_photos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profile_photos_set_updated_at on public.user_profile_photos;

create trigger user_profile_photos_set_updated_at
before update on public.user_profile_photos
for each row
execute function public.set_user_profile_photos_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.user_profile_photos enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profile_photos'
      and policyname = 'Users can read their profile photo metadata'
  ) then
    create policy "Users can read their profile photo metadata"
    on public.user_profile_photos
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profile_photos'
      and policyname = 'Users can insert their profile photo metadata'
  ) then
    create policy "Users can insert their profile photo metadata"
    on public.user_profile_photos
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profile_photos'
      and policyname = 'Users can update their profile photo metadata'
  ) then
    create policy "Users can update their profile photo metadata"
    on public.user_profile_photos
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profile_photos'
      and policyname = 'Users can delete their profile photo metadata'
  ) then
    create policy "Users can delete their profile photo metadata"
    on public.user_profile_photos
    for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Profile photos are publicly readable'
  ) then
    create policy "Profile photos are publicly readable"
    on storage.objects
    for select
    to public
    using (bucket_id = 'profile-photos');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their profile photo'
  ) then
    create policy "Users can upload their profile photo"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their profile photo'
  ) then
    create policy "Users can update their profile photo"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their profile photo'
  ) then
    create policy "Users can delete their profile photo"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'profile-photos'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;
