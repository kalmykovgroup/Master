CREATE TABLE public.app_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform    text NOT NULL CHECK (platform IN ('android', 'ios')),
  version     text NOT NULL,
  min_version text NOT NULL,
  store_url   text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (platform)
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_versions_select" ON public.app_versions
  FOR SELECT USING (true);

INSERT INTO public.app_versions (platform, version, min_version, store_url) VALUES
  ('android', '1.0.0', '1.0.0', 'https://play.google.com/store/apps/details?id=com.master'),
  ('ios',     '1.0.0', '1.0.0', 'https://apps.apple.com/app/master/id000000000');
