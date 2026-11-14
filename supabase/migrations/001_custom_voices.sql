
-- Voice profiles: one personal voice profile per account.
create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  consent_to_voice_cloning boolean not null default false,
  consent_at timestamptz,
  allow_public_use boolean not null default false,
  status text not null default 'collecting'
    check (status in ('collecting', 'ready', 'training', 'available', 'rejected')),
  created_at timestamptz not null default now(),

  constraint voice_consent_required
    check (
      consent_to_voice_cloning = false
      or consent_at is not null
    )
);

-- Every sample must be paired with the exact text that was spoken.
create table if not exists public.voice_training_samples (
  id uuid primary key default gen_random_uuid(),
  voice_profile_id uuid not null
    references public.voice_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript text not null,
  audio_path text not null unique,
  duration_seconds integer,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),

  constraint transcript_not_empty check (length(trim(transcript)) > 0),
  constraint valid_duration check (
    duration_seconds is null or duration_seconds between 1 and 600
  )
);

create index if not exists voice_samples_profile_idx
  on public.voice_training_samples(voice_profile_id);

create index if not exists voice_samples_status_idx
  on public.voice_training_samples(status);

alter table public.voice_profiles enable row level security;
alter table public.voice_training_samples enable row level security;

-- A user can create and manage only their own voice profile.
create policy "Users can view their own voice profile"
on public.voice_profiles for select
to authenticated
using (user_id = auth.uid() or status = 'available');

create policy "Users can create their own voice profile"
on public.voice_profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own voice profile"
on public.voice_profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Users can manage only their own training samples.
create policy "Users can view their own samples"
on public.voice_training_samples for select
to authenticated
using (user_id = auth.uid());

create policy "Users can add their own samples"
on public.voice_training_samples for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.voice_profiles
    where id = voice_profile_id
      and user_id = auth.uid()
      and consent_to_voice_cloning = true
  )
);

create policy "Users can delete their own pending samples"
on public.voice_training_samples for delete
to authenticated
using (user_id = auth.uid() and status = 'pending');

-- Private storage bucket for training audio.
insert into storage.buckets (id, name, public)
values ('voice-training-samples', 'voice-training-samples', false)
on conflict (id) do nothing;

create policy "Users can upload their own training audio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'voice-training-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read their own training audio"
on storage.objects for select
to authenticated
using (
  bucket_id = 'voice-training-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own training audio"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'voice-training-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);
