-- ============================================================
-- Instagram Mini — lược đồ cơ sở dữ liệu (Supabase / Postgres)
-- Chạy lại được nhiều lần (idempotent).
-- ============================================================

-- ---------- Bảng ----------

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null check (char_length(username) between 3 and 30),
  full_name  text default '',
  bio        text default '',
  avatar_url text default '',
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  image_url  text not null,
  caption    text default '' check (char_length(caption) <= 2200),
  location   text default '' check (char_length(location) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on posts (created_at desc);
create index if not exists posts_user_idx    on posts (user_id);

create table if not exists likes (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments (post_id, created_at);

create table if not exists saves (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ---------- Tự tạo hồ sơ khi đăng ký ----------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 4)
    ),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Row Level Security ----------

alter table profiles enable row level security;
alter table posts    enable row level security;
alter table likes    enable row level security;
alter table comments enable row level security;
alter table saves    enable row level security;
alter table follows  enable row level security;

-- profiles: ai cũng xem được, chỉ tự sửa hồ sơ của mình
drop policy if exists profiles_read   on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
create policy profiles_read   on profiles for select using (true);
create policy profiles_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- posts: ai cũng xem được, chỉ chủ bài viết được tạo/sửa/xoá
drop policy if exists posts_read   on posts;
drop policy if exists posts_insert on posts;
drop policy if exists posts_update on posts;
drop policy if exists posts_delete on posts;
create policy posts_read   on posts for select using (true);
create policy posts_insert on posts for insert with check (auth.uid() = user_id);
create policy posts_update on posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy posts_delete on posts for delete using (auth.uid() = user_id);

-- likes / saves / comments / follows: chỉ thao tác dưới danh nghĩa chính mình
drop policy if exists likes_read   on likes;
drop policy if exists likes_insert on likes;
drop policy if exists likes_delete on likes;
create policy likes_read   on likes for select using (true);
create policy likes_insert on likes for insert with check (auth.uid() = user_id);
create policy likes_delete on likes for delete using (auth.uid() = user_id);

drop policy if exists saves_read   on saves;
drop policy if exists saves_insert on saves;
drop policy if exists saves_delete on saves;
create policy saves_read   on saves for select using (auth.uid() = user_id);
create policy saves_insert on saves for insert with check (auth.uid() = user_id);
create policy saves_delete on saves for delete using (auth.uid() = user_id);

drop policy if exists comments_read   on comments;
drop policy if exists comments_insert on comments;
drop policy if exists comments_delete on comments;
create policy comments_read   on comments for select using (true);
create policy comments_insert on comments for insert with check (auth.uid() = user_id);
create policy comments_delete on comments for delete using (auth.uid() = user_id);

drop policy if exists follows_read   on follows;
drop policy if exists follows_insert on follows;
drop policy if exists follows_delete on follows;
create policy follows_read   on follows for select using (true);
create policy follows_insert on follows for insert with check (auth.uid() = follower_id);
create policy follows_delete on follows for delete using (auth.uid() = follower_id);

-- ---------- View: bài viết kèm số liệu ----------
-- security_invoker = RLS của người gọi vẫn được áp dụng khi đọc view.

create or replace view post_feed
with (security_invoker = on) as
select
  p.id, p.user_id, p.image_url, p.caption, p.location, p.created_at,
  pr.username, pr.full_name, pr.avatar_url,
  (select count(*) from likes    l where l.post_id = p.id) as like_count,
  (select count(*) from comments c where c.post_id = p.id) as comment_count
from posts p
join profiles pr on pr.id = p.user_id;

-- ---------- Storage: bucket ảnh ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- Ai cũng xem được ảnh; người đăng nhập chỉ ghi/xoá trong thư mục mang uid của mình.
drop policy if exists post_images_read   on storage.objects;
drop policy if exists post_images_insert on storage.objects;
drop policy if exists post_images_delete on storage.objects;

create policy post_images_read on storage.objects
  for select using (bucket_id = 'post-images');

create policy post_images_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy post_images_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
