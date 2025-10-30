-- Update RLS policy to allow viewing profiles only in specific contexts:
-- 1. Users can always see their own profile
-- 2. Users can see profiles of people they have chats with
-- 3. Users can see profiles of image authors (for gallery display)
-- This prevents mass scraping while maintaining social features

DROP POLICY IF EXISTS "Autentifikatsiya qilingan foydalanuvchilar profillarni ko'rishi mumkin" ON public.profiles;

CREATE POLICY "Foydalanuvchilar kontekstli profillarni ko'rishi mumkin"
ON public.profiles FOR SELECT
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- User can see profiles of people they chat with
  EXISTS (
    SELECT 1 FROM public.chat_participants cp1
    INNER JOIN public.chat_participants cp2 ON cp1.chat_id = cp2.chat_id
    WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = profiles.id
  )
  OR
  -- User can see profiles of image authors
  EXISTS (
    SELECT 1 FROM public.images
    WHERE images.user_id = profiles.id
  )
);