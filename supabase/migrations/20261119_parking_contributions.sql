create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create table if not exists public.parking_contributions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  entrance_lon double precision not null check (entrance_lon between -180 and 180),
  entrance_lat double precision not null check (entrance_lat between -90 and 90),
  address text check (char_length(address) <= 300),
  price text check (char_length(price) <= 160),
  hours text check (char_length(hours) <= 160),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  ward_code text,
  ward_name text
);

create index if not exists parking_contributions_pending_idx
  on public.parking_contributions (created_at) where status = 'pending';

create table if not exists public.parkings (
  id uuid primary key references public.parking_contributions (id),
  name text not null,
  entrance_lon double precision not null,
  entrance_lat double precision not null,
  entrance extensions.geography(Point, 4326) generated always as (
    extensions.ST_SetSRID(extensions.ST_MakePoint(entrance_lon, entrance_lat), 4326)::extensions.geography
  ) stored,
  ward_code text not null,
  ward_name text not null,
  address text,
  price text,
  hours text,
  approved_at timestamptz not null default now()
);

create index if not exists parkings_entrance_idx on public.parkings using gist (entrance);

create table if not exists public.parking_submission_limits (
  visitor_hash text not null,
  day date not null,
  count integer not null,
  primary key (visitor_hash, day)
);

alter table public.parking_contributions enable row level security;
alter table public.parkings enable row level security;
alter table public.parking_submission_limits enable row level security;
revoke all on public.parking_contributions, public.parkings, public.parking_submission_limits from anon, authenticated;
grant all on public.parking_contributions, public.parkings, public.parking_submission_limits to service_role;

create or replace function public.submit_parking_contribution(
  p_name text,
  p_entrance_lon double precision,
  p_entrance_lat double precision,
  p_address text,
  p_price text,
  p_hours text,
  p_visitor_hash text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_count integer;
  v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 160
    or p_entrance_lon is null or p_entrance_lon not between -180 and 180
    or p_entrance_lat is null or p_entrance_lat not between -90 and 90
    or char_length(coalesce(p_address, '')) > 300
    or char_length(coalesce(p_price, '')) > 160
    or char_length(coalesce(p_hours, '')) > 160
    or char_length(coalesce(p_visitor_hash, '')) != 64 then
    raise exception 'Dữ liệu bãi xe không hợp lệ';
  end if;

  insert into public.parking_submission_limits (visitor_hash, day, count)
  values (p_visitor_hash, current_date, 1)
  on conflict (visitor_hash, day) do update set count = parking_submission_limits.count + 1
  returning count into v_count;

  if v_count > 10 then
    raise exception 'Đã đạt giới hạn gửi bãi trong ngày';
  end if;

  insert into public.parking_contributions
    (name, entrance_lon, entrance_lat, address, price, hours, visitor_hash)
  values
    (trim(p_name), p_entrance_lon, p_entrance_lat, nullif(trim(p_address), ''),
     nullif(trim(p_price), ''), nullif(trim(p_hours), ''), p_visitor_hash)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.review_parking_contribution(
  p_id uuid,
  p_action text,
  p_ward_code text default null,
  p_ward_name text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_contribution public.parking_contributions%rowtype;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'Quyết định không hợp lệ';
  end if;

  select * into v_contribution from public.parking_contributions where id = p_id for update;
  if not found then raise exception 'Không tìm thấy đề xuất'; end if;
  if v_contribution.status = 'approved' and p_action = 'approve' then return p_id; end if;
  if v_contribution.status = 'rejected' and p_action = 'reject' then return p_id; end if;
  if v_contribution.status != 'pending' then raise exception 'Đề xuất đã được xử lý'; end if;

  if p_action = 'approve' then
    if char_length(trim(coalesce(p_ward_code, ''))) not between 1 and 80
      or char_length(trim(coalesce(p_ward_name, ''))) not between 1 and 120 then
      raise exception 'Cần xác nhận phường trước khi duyệt';
    end if;
    insert into public.parkings
      (id, name, entrance_lon, entrance_lat, ward_code, ward_name, address, price, hours)
    values
      (v_contribution.id, v_contribution.name, v_contribution.entrance_lon,
       v_contribution.entrance_lat, trim(p_ward_code), trim(p_ward_name),
       v_contribution.address, v_contribution.price, v_contribution.hours);
    update public.parking_contributions set status = 'approved', reviewed_at = now(),
      ward_code = trim(p_ward_code), ward_name = trim(p_ward_name) where id = p_id;
  else
    update public.parking_contributions set status = 'rejected', reviewed_at = now()
      where id = p_id;
  end if;
  return p_id;
end;
$$;

revoke all on function public.submit_parking_contribution(text, double precision, double precision, text, text, text, text) from public, anon, authenticated;
revoke all on function public.review_parking_contribution(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_parking_contribution(text, double precision, double precision, text, text, text, text) to service_role;
grant execute on function public.review_parking_contribution(uuid, text, text, text) to service_role;
