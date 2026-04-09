-- =============================================================================
-- Migration 006: Dual accounts — every user is both client + master
-- =============================================================================

-- 1. Update handle_new_user: create profiles (role='client') + master_profiles for ALL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, role)
  VALUES (NEW.id, COALESCE(NEW.phone, ''), 'client');
  INSERT INTO public.master_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- 2. Drop handle_master_role trigger (no longer needed)
DROP TRIGGER IF EXISTS on_profile_role_master ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_master_role();

-- 3. Backfill: master_profiles for all existing users who don't have one
INSERT INTO master_profiles (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM master_profiles);

-- 4. Backfill: role='client' for users without a role
UPDATE profiles SET role = 'client' WHERE role IS NULL;
