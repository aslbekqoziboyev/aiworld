-- Drop the existing overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Foydalanuvchilar kontekstli profillarni ko'rishi mumkin" ON public.profiles;

-- Create a more secure SELECT policy that requires authentication
-- Users can only view:
-- 1. Their own profile
-- 2. Profiles of users they share a chat with
-- 3. Profiles of users who have posted images (but only when authenticated)
CREATE POLICY "Authenticated users can view contextual profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User can always see their own profile
  auth.uid() = id 
  OR 
  -- User can see profiles of people they share a chat with
  EXISTS (
    SELECT 1
    FROM chat_participants cp1
    JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid() 
      AND cp2.user_id = profiles.id
  )
  OR
  -- User can see profiles of people who have posted images (requires auth)
  EXISTS (
    SELECT 1
    FROM images
    WHERE images.user_id = profiles.id
  )
);

-- Fix the function search_path warning
-- Drop the trigger first, then recreate the function, then recreate the trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();