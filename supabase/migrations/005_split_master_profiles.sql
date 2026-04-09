-- =============================================================================
-- Migration 005: Split master-specific fields into master_profiles table
-- =============================================================================

-- 1. Create master_profiles table
CREATE TABLE public.master_profiles (
  user_id           uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio               text,
  age               integer,
  citizenship       text,
  work_experience   text,
  profile_completed boolean NOT NULL DEFAULT false,
  avg_rating        numeric(2,1),
  review_count      integer NOT NULL DEFAULT 0,
  last_active_at    timestamptz
);

CREATE INDEX idx_master_profiles_activity ON public.master_profiles(
  last_active_at DESC NULLS LAST, avg_rating DESC NULLS LAST
);

-- 2. Migrate existing data from profiles to master_profiles
INSERT INTO public.master_profiles (user_id, bio, age, citizenship, work_experience, profile_completed, avg_rating, review_count, last_active_at)
SELECT id, bio, age, citizenship, work_experience, profile_completed, avg_rating, review_count, last_active_at
FROM public.profiles
WHERE role = 'master';

-- 3. Drop master-specific columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN bio,
  DROP COLUMN age,
  DROP COLUMN citizenship,
  DROP COLUMN work_experience,
  DROP COLUMN profile_completed,
  DROP COLUMN avg_rating,
  DROP COLUMN review_count,
  DROP COLUMN last_active_at;

DROP INDEX IF EXISTS idx_profiles_master_activity;

-- 4. Trigger: auto-create master_profiles row when role is set to 'master'
CREATE OR REPLACE FUNCTION public.handle_master_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'master' AND (OLD.role IS NULL OR OLD.role <> 'master') THEN
    INSERT INTO public.master_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_master
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_master_role();

-- 5. Update handle_new_review to write to master_profiles instead of profiles
CREATE OR REPLACE FUNCTION public.handle_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.master_profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
    )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

-- 6. RLS for master_profiles
ALTER TABLE public.master_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_profiles_select" ON public.master_profiles
  FOR SELECT USING (true);

CREATE POLICY "master_profiles_update" ON public.master_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "master_profiles_insert" ON public.master_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Add master_profiles to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_profiles;
