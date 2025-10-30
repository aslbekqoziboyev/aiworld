-- Fix infinite recursion in chat_participants RLS policy
-- Create security definer function to check chat membership
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE chat_id = _chat_id
      AND user_id = _user_id
  )
$$;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view participants of their chats" ON public.chat_participants;

-- Create new SELECT policy using the security definer function
CREATE POLICY "Users can view participants of their chats"
ON public.chat_participants
FOR SELECT
USING (public.is_chat_participant(auth.uid(), chat_id));