-- Update the RLS policy to require authentication for viewing profiles
-- This prevents anonymous users from scraping user data while still allowing
-- authenticated users to see other users' profiles (needed for social features)

DROP POLICY IF EXISTS "Profillarni hamma ko'rishi mumkin" ON public.profiles;

CREATE POLICY "Autentifikatsiya qilingan foydalanuvchilar profillarni ko'rishi mumkin"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);