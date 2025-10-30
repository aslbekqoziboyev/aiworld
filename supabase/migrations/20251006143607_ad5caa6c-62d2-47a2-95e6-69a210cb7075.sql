-- Foydalanuvchi profillari jadvali
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- RLS yoqish
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies - hamma o'z profilini ko'rishi va tahrirlashi mumkin
CREATE POLICY "Profillarni hamma ko'rishi mumkin"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Foydalanuvchi o'z profilini yaratishi mumkin"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Foydalanuvchi o'z profilini yangilashi mumkin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Yangi foydalanuvchi ro'yxatdan o'tganda avtomatik profil yaratish
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Rasmlar jadvali
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rasmlarni hamma ko'rishi mumkin"
  ON public.images FOR SELECT
  USING (true);

CREATE POLICY "Foydalanuvchi o'z rasmini yuklashi mumkin"
  ON public.images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchi o'z rasmini yangilashi mumkin"
  ON public.images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchi o'z rasmini o'chirishi mumkin"
  ON public.images FOR DELETE
  USING (auth.uid() = user_id);

-- Teglar jadvali
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teglarni hamma ko'rishi mumkin"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Teglarni hamma yaratishi mumkin"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Rasmlar va teglar orasidagi bog'lanish
CREATE TABLE public.image_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(image_id, tag_id)
);

ALTER TABLE public.image_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Image_tags ni hamma ko'rishi mumkin"
  ON public.image_tags FOR SELECT
  USING (true);

CREATE POLICY "Rasm egasi teg qo'shishi mumkin"
  ON public.image_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.images
      WHERE images.id = image_id AND images.user_id = auth.uid()
    )
  );

CREATE POLICY "Rasm egasi tegni o'chirishi mumkin"
  ON public.image_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.images
      WHERE images.id = image_id AND images.user_id = auth.uid()
    )
  );

-- Sharhlar jadvali
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sharhlarni hamma ko'rishi mumkin"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Foydalanuvchi sharh yozishi mumkin"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchi o'z sharhini o'chirishi mumkin"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- Likes jadvali
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(image_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes ni hamma ko'rishi mumkin"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Foydalanuvchi like qo'shishi mumkin"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchi o'z like'ini o'chirishi mumkin"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- Like count ni avtomatik yangilash uchun trigger
CREATE OR REPLACE FUNCTION update_image_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.images SET likes_count = likes_count + 1 WHERE id = NEW.image_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.images SET likes_count = likes_count - 1 WHERE id = OLD.image_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_likes_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_image_likes_count();

-- Storage bucket yaratish rasmlar uchun
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Storage RLS policies
CREATE POLICY "Rasmlarni hamma ko'rishi mumkin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Foydalanuvchi rasm yuklashi mumkin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Foydalanuvchi o'z rasmini o'chirishi mumkin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Timestamp update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index'lar qo'shish
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_comments_image_id ON public.comments(image_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_image_tags_image_id ON public.image_tags(image_id);
CREATE INDEX idx_image_tags_tag_id ON public.image_tags(tag_id);
CREATE INDEX idx_likes_image_id ON public.likes(image_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);