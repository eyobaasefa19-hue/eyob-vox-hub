
-- 003_community_review_threshold.sql
-- Require agreement from at least two independent reviewers.
-- Award exactly 10 points once, only when approved.

alter table public.community_recording_reviews
  drop constraint if exists community_recording_reviews_recording_id_key;

alter table public.community_recording_reviews
  add constraint community_recording_reviews_recording_reviewer_key
  unique (recording_id, reviewer_id);

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
  v_approved integer;
  v_rejected integer;
  v_total integer;
  v_final_status text;
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
    raise exception 'Recording is no longer pending';
  end if;

  insert into public.community_recording_reviews
    (recording_id, reviewer_id, decision)
  values
    (p_recording_id, v_reviewer, p_decision);

  select
    count(*) filter (where decision = 'approved'),
    count(*) filter (where decision = 'rejected'),
    count(*)
  into v_approved, v_rejected, v_total
  from public.community_recording_reviews
  where recording_id = p_recording_id;

  v_final_status := null;

  if v_approved >= 2 then
    v_final_status := 'approved';
  elsif v_rejected >= 2 then
    v_final_status := 'rejected';
  elsif v_total >= 3 then
    if v_approved > v_rejected then
      v_final_status := 'approved';
    else
      v_final_status := 'rejected';
    end if;
  end if;

  if v_final_status is not null then
    update public.community_recordings
    set status = v_final_status
    where id = p_recording_id;

    if v_final_status = 'approved' then
      insert into public.community_points_ledger
        (user_id, recording_id, points)
      values
        (v_owner, p_recording_id, 10)
      on conflict (recording_id) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'review_count', v_total,
    'approvals', v_approved,
    'rejections', v_rejected,
    'status', coalesce(v_final_status, 'pending'),
    'points_awarded',
      case when v_final_status = 'approved' then 10 else 0 end
  );
end;
$$;

revoke all on function public.review_community_recording(uuid, text)
from public, anon;

grant execute on function public.review_community_recording(uuid, text)
to authenticated;
