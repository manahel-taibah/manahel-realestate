-- Run in Supabase SQL Editor. Review before executing.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  property_type text not null,
  city text not null,
  district text,
  price numeric(15,2) check(price>=0),
  area numeric(15,2) check(area>=0),
  description text,
  ad_license text,
  map_url text,
  image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.property_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check(char_length(full_name) between 1 and 120),
  phone text not null check(char_length(phone) between 8 and 20),
  property_type text not null,
  city text not null,
  district text,
  budget numeric(15,2) check(budget>=0),
  notes text check(char_length(notes)<=2000),
  status text not null default 'جديد' check(status in ('جديد','قيد المتابعة','مكتمل')),
  created_at timestamptz not null default now()
);
create index if not exists idx_properties_public on public.properties(is_published,created_at desc);
create index if not exists idx_requests_created on public.property_requests(created_at desc);
alter table public.admin_users enable row level security;
alter table public.properties enable row level security;
alter table public.property_requests enable row level security;
create policy "Admins can check their own membership" on public.admin_users for select to authenticated using (user_id=auth.uid());
create policy "Visitors see published properties" on public.properties for select to anon,authenticated using (is_published=true or exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "Admins add properties" on public.properties for insert to authenticated with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "Admins edit properties" on public.properties for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "Admins delete properties" on public.properties for delete to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "Visitors submit requests" on public.property_requests for insert to anon,authenticated with check(status='جديد');
create policy "Admins read requests" on public.property_requests for select to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "Admins update requests" on public.property_requests for update to authenticated using (exists(select 1 from public.admin_users a where a.user_id=auth.uid())) with check (exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('property-images','property-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy "Public view property images" on storage.objects for select to anon,authenticated using(bucket_id='property-images');
create policy "Admins upload property images" on storage.objects for insert to authenticated with check(bucket_id='property-images' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
create policy "Admins delete property images" on storage.objects for delete to authenticated using(bucket_id='property-images' and exists(select 1 from public.admin_users a where a.user_id=auth.uid()));
-- IMPORTANT: After creating a user in Authentication > Users, run separately:
-- insert into public.admin_users(user_id) values ('REPLACE-WITH-ACTUAL-USER-UUID');
-- Do not create any INSERT/UPDATE/DELETE policy on admin_users for visitors.
