
-- Community recordings: separate from private voice-training samples.
create extension if not exists pgcrypto;

create table if not exists public.community_sentences (
  id uuid primary key default gen_random_uuid(),
  text_content text not null,
  language_code text not null default 'am',
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.community_recordings (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid not null references public.community_sentences(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_path text not null unique,
  duration_seconds integer not null check (duration_seconds between 1 and 600),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_recording_reviews (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.community_recordings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (recording_id)
);

create table if not exists public.community_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recording_id uuid not null unique references public.community_recordings(id) on delete cascade,
  points integer not null check (points = 10),
  reason text not null default 'Community recording approved',
  created_at timestamptz not null default now()
);

alter table public.community_sentences enable row level security;
alter table public.community_recordings enable row level security;
alter table public.community_recording_reviews enable row level security;
alter table public.community_points_ledger enable row level security;

drop policy if exists community_sentences_read
on public.community_sentences;
create policy community_sentences_read
on public.community_sentences for select
to authenticated
using (active = true);

drop policy if exists community_recordings_insert_own
on public.community_recordings;
create policy community_recordings_insert_own
on public.community_recordings for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists community_recordings_read_own_or_pending
on public.community_recordings;
create policy community_recordings_read_own_or_pending
on public.community_recordings for select
to authenticated
using (
  user_id = (select auth.uid())
  or status = 'pending'
);

drop policy if exists community_reviews_read_own
on public.community_recording_reviews;
create policy community_reviews_read_own
on public.community_recording_reviews for select
to authenticated
using (reviewer_id = (select auth.uid()));

drop policy if exists community_points_read_own
on public.community_points_ledger;
create policy community_points_read_own
on public.community_points_ledger for select
to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete
on public.community_recording_reviews,
   public.community_points_ledger
from anon, authenticated;

revoke update, delete
on public.community_recordings
from anon, authenticated;

-- Private audio bucket for community recordings.
insert into storage.buckets (id, name, public)
values ('community-recordings', 'community-recordings', false)
on conflict (id) do nothing;

drop policy if exists community_audio_upload_own
on storage.objects;
create policy community_audio_upload_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'community-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists community_audio_read_pending
on storage.objects;
create policy community_audio_read_pending
on storage.objects for select
to authenticated
using (
  bucket_id = 'community-recordings'
  and exists (
    select 1
    from public.community_recordings r
    where r.audio_path = name
      and r.status = 'pending'
      and r.user_id <> (select auth.uid())
  )
);

drop policy if exists community_audio_read_own
on storage.objects;
create policy community_audio_read_own
on storage.objects for select
to authenticated
using (
  bucket_id = 'community-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists community_audio_delete_own
on storage.objects;
create policy community_audio_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'community-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- One review per recording. A user cannot review their own recording.
-- Approval and the one-time 10-point reward happen in one transaction.
create or replace function public.review_community_recording(
  p_recording_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := auth.uid();
  v_owner uuid;
  v_status text;
begin
  if v_reviewer is null then
    raise exception 'Login required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  select user_id, status
    into v_owner, v_status
  from public.community_recordings
  where id = p_recording_id
  for update;

  if not found then
    raise exception 'Recording not found';
  end if;

  if v_owner = v_reviewer then
    raise exception 'You cannot review your own recording';
  end if;

  if v_status <> 'pending' then
    raise exception 'Recording has already been reviewed';
  end if;

  insert into public.community_recording_reviews
    (recording_id, reviewer_id, decision)
  values
    (p_recording_id, v_reviewer, p_decision);

  update public.community_recordings
  set status = p_decision
  where id = p_recording_id;

  if p_decision = 'approved' then
    insert into public.community_points_ledger
      (user_id, recording_id, points)
    values
      (v_owner, p_recording_id, 10);
  end if;

  return jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'points_awarded',
      case when p_decision = 'approved' then 10 else 0 end
  );
end;
$$;

revoke all on function public.review_community_recording(uuid, text)
from public, anon;
grant execute on function public.review_community_recording(uuid, text)
to authenticated;

-- A few initial Amharic sentences for testing.
insert into public.community_sentences (text_content, category)
select v.text_content, v.category
from (values
  ('ሰላም እንደምን አደርክ?', 'ዕለታዊ ንግግር'),
  ('ዛሬ የአየር ሁኔታው ጥሩ ነው።', 'ዕለታዊ ንግግር'),
  ('እባክዎ ይህን አረፍተ ነገር በግልጽ ያንብቡ።', 'ንባብ')
) as v(text_content, category)
where not exists (
  select 1
  from public.community_sentences s
  where s.text_content = v.text_content
);
