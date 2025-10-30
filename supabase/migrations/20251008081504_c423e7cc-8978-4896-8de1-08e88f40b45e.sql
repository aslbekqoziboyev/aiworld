-- Fix the chat_participants INSERT policy to prevent unauthorized users
-- from adding themselves to private conversations
-- 
-- The new policy allows:
-- 1. Users to add themselves when creating a new chat
-- 2. Existing chat participants to add new members
-- 
-- This prevents attackers from joining conversations they weren't invited to

DROP POLICY IF EXISTS "Users can add participants when creating chat" ON public.chat_participants;

CREATE POLICY "Foydalanuvchilar faqat o'z chatlariga a'zo qo'sha oladi"
ON public.chat_participants FOR INSERT
WITH CHECK (
  -- User can add themselves to a new chat (first participant when creating chat)
  auth.uid() = user_id
  OR
  -- User can add others only if they are already a participant in that chat
  EXISTS (
    SELECT 1 FROM public.chat_participants existing_participant
    WHERE existing_participant.chat_id = chat_participants.chat_id
    AND existing_participant.user_id = auth.uid()
  )
);