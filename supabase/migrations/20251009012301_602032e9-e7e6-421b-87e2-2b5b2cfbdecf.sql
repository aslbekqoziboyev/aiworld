-- Drop the existing overly permissive SELECT policy on likes
DROP POLICY IF EXISTS "Likes ni hamma ko'rishi mumkin" ON public.likes;

-- Create a more secure SELECT policy that requires authentication
-- Only authenticated users can see likes data
CREATE POLICY "Authenticated users can view likes"
ON public.likes
FOR SELECT
TO authenticated
USING (true);