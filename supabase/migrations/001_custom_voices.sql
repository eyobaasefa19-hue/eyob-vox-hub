
-- =====================================================
-- AMHARIC VOICE CORPUS HUB
-- Custom Voice Profiles and Training Samples
-- Secure Supabase Database Setup
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. VOICE PROFILES
-- One personal voice profile per account
-- =====================================================

create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null unique
    references auth.users(id) on delete cascade,

  display_name text not null,

  consent_to_voice_cloning boolean not null default false,
  consent_at timestamptz,

  allow_public_use boolean not null default false,

  status text not null default 'collecting'
    check (
      status in (
        'collecting',
        'ready',
        'training',
        'available',
        'rejected'
      )
    ),

  created_at timestamptz not null default now(),

  constraint voice_consent_required
    check (
      consent_to_voice_cloning = false
      or consent_at is not null
    )
);

-- =====================================================
-- 2. VOICE TRAINING SAMPLES
-- Each audio sample must have its exact transcript
-- =====================================================

create table if not exists public.voice_training_samples (
  id uuid primary key default gen_random_uuid(),

  voice_profile_id uuid not null
    references public.voice_profiles(id) on delete cascade,

  user_id uuid not null
    references auth.users(id) on delete cascade,

  transcript text not null,

  audio_path text not null unique,

  duration_seconds integer,

  status text not null default 'pending'
    check (
      status in ('pending', 'approved', 'rejected')
    ),

  created_at timestamptz not null default now(),

  constraint transcript_not_empty
    check (length(trim(transcript)) > 0),

  constraint valid_duration
    check (
      duration_seconds is null
      or duration_seconds between 1 and 600
    )
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

create index if not exists voice_samples_profile_idx
  on public.voice_training_samples(voice_profile_id);

create index if not exists voice_samples_status_idx
  on public.voice_training_samples(status);

create index if not exists voice_profiles_status_idx
  on public.voice_profiles(status);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

alter table public.voice_profiles
  enable row level security;

alter table public.voice_training_samples
  enable row level security;

-- =====================================================
-- 5. REMOVE OLD POLICIES BEFORE RECREATING
-- =====================================================

drop policy if exists
  "Users can view their own voice profile"
  on public.voice_profiles;

drop policy if exists
  "Users can create their own voice profile"
  on public.voice_profiles;

drop policy if exists
  "Users can update their own voice profile"
  on public.voice_profiles;

drop policy if exists
  "Users can view their own samples"
  on public.voice_training_samples;

drop policy if exists
  "Users can add their own samples"
  on public.voice_training_samples;

drop policy if exists
  "Users can delete their own pending samples"
  on public.voice_training_samples;

-- =====================================================
-- 6. VOICE PROFILE POLICIES
-- =====================================================

-- Owners can see their own profile.
-- Public users can see only available voices
-- whose owners explicitly allowed public use.

create policy "Users can view their own voice profile"
on public.voice_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    status = 'available'
    and allow_public_use = true
  )
);

-- Users can create only their own profile.
-- A new profile must start in collecting status.

create policy "Users can create their own voice profile"
on public.voice_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'collecting'
);

-- Users can update their own profile.
-- Column permissions below prevent them from changing status.

create policy "Users can update their own voice profile"
on public.voice_profiles
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

-- =====================================================
-- 7. RESTRICT PROFILE UPDATE PERMISSIONS
-- Users cannot change training status themselves.
-- =====================================================

revoke update on public.voice_profiles
from authenticated;

grant update (
  display_name,
  consent_to_voice_cloning,
  consent_at,
  allow_public_use
)
on public.voice_profiles
to authenticated;

-- =====================================================
-- 8. TRAINING SAMPLE POLICIES
-- =====================================================

create policy "Users can view their own samples"
on public.voice_training_samples
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy "Users can add their own samples"
on public.voice_training_samples
for insert
to authenticated
with check (
  user_id = auth.uid()

  and (storage.foldername(audio_path))[1] = auth.uid()::text

  and exists (
    select 1
    from public.voice_profiles
    where voice_profiles.id =
      voice_training_samples.voice_profile_id

      and voice_profiles.user_id = auth.uid()

      and voice_profiles.consent_to_voice_cloning = true
  )
);

create policy "Users can delete their own pending samples"
on public.voice_training_samples
for delete
to authenticated
using (
  user_id = auth.uid()
  and status = 'pending'
);

-- =====================================================
-- 9. PRIVATE STORAGE BUCKET
-- =====================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'voice-training-samples',
  'voice-training-samples',
  false
)
on conflict (id) do nothing;

-- =====================================================
-- 10. STORAGE POLICIES
-- =====================================================

drop policy if exists
  "Users can upload their own training audio"
  on storage.objects;

drop policy if exists
  "Users can read their own training audio"
  on storage.objects;

drop policy if exists
  "Users can delete their own training audio"
  on storage.objects;

-- Users can upload only inside their own user-id folder.

create policy "Users can upload their own training audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'voice-training-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read only their own private training audio.

create policy "Users can read their own training audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'voice-training-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete only their own training audio.

create policy "Users can delete their own training audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'voice-training-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
