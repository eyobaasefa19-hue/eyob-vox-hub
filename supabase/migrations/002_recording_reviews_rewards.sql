-- Reviews and one-time reward ledger for community voice recordings.

create table if not exists public.recording_reviews (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.voice_recordings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint recording_reviews_one_per_reviewer
    unique (recording_id, reviewer_id)
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recording_id uuid not null references public.voice_recordings(id) on delete cascade,
  points integer not null check (points > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  constraint points_ledger_one_reward_per_recording
    unique (recording_id)
);

alter table public.recording_reviews enable row level security;
alter table public.points_ledger enable row level security;

drop policy if exists recording_reviews_read_own
  on public.recording_reviews;
create policy recording_reviews_read_own
  on public.recording_reviews for select
  to authenticated
  using (reviewer_id = (select auth.uid()));

drop policy if exists points_ledger_read_own
  on public.points_ledger;
create policy points_ledger_read_own
  on public.points_ledger for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Do not allow clients to insert reviews or rewards directly.
revoke insert, update, delete on public.recording_reviews from anon, authenticated;
revoke insert, update, delete on public.points_ledger from anon, authenticated;

create or replace function public.review_voice_recording(
  p_recording_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_status text;
begin
  if v_user is null then
    raise exception 'Login required';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select user_id, status
    into v_owner, v_status
  from public.voice_recordings
  where id = p_recording_id
  for update;

  if not found then
    raise exception 'Recording not found';
  end if;

  if v_owner = v_user then
    raise exception 'You cannot review your own recording';
  end if;

  if v_status <> 'pending' then
    raise exception 'This recording has already been reviewed';
  end if;

  insert into public.recording_reviews
    (recording_id, reviewer_id, decision)
  values
    (p_recording_id, v_user, p_decision);

  update public.voice_recordings
  set status = p_decision
  where id = p_recording_id;

  if p_decision = 'approved' then
    insert into public.points_ledger
      (user_id, recording_id, points, reason)
    values
      (v_owner, p_recording_id, 10, 'Community recording approved')
    on conflict (recording_id) do nothing;
  end if;

  return jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'points_awarded', case when p_decision = 'approved' then 10 else 0 end
  );
end;
$$;

revoke all on function public.review_voice_recording(uuid, text)
  from public, anon;
grant execute on function public.review_voice_recording(uuid, text)
  to authenticated;

-- Reviewers may read pending recording metadata.
drop policy if exists recordings_read_pending_for_review
  on public.voice_recordings;
create policy recordings_read_pending_for_review
  on public.voice_recordings for select
  to authenticated
  using (status = 'pending' and user_id <> (select auth.uid()));
