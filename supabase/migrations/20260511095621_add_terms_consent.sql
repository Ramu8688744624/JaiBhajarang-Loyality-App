-- Adds legal consent tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.accepted_terms IS 'True if the user agreed to T&C during signup.';

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;