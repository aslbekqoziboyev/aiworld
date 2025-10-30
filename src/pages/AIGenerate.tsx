import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Download, Wand2, ArrowRight, Zap, Palette, ImagePlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AIGenerate() {
  const [showIntro, setShowIntro] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: "Xatolik",
        description: "Iltimos, avval tizimga kiring",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Xatolik",
        description: "Iltimos, prompt kiriting",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      console.log('Calling generate-ai-image function...');
      const { data, error } = await supabase.functions.invoke('generate-ai-image', {
        body: { prompt }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast({
          title: "Tayyor!",
          description: "Rasm muvaffaqiyatli yaratildi",
        });
      } else {
        throw new Error('Rasm yaratilmadi');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast({
        title: "Xatolik",
        description: error.message || "Rasm yaratishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `ai-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Yuklab olish",
        description: "Rasm yuklab olinmoqda...",
      });
    }
  };

  const handlePublish = async () => {
    if (!generatedImage || !user) return;

    try {
      // Convert base64 to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      
      // Upload to storage
      const fileName = `${user.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          title: prompt.slice(0, 100),
          description: prompt,
          image_url: publicUrl,
          storage_path: fileName,
        });

      if (dbError) throw dbError;

      toast({
        title: "Muvaffaqiyatli!",
        description: "Rasm galereyaga joylashtirildi",
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Error publishing image:', error);
      toast({
        title: "Xatolik",
        description: "Rasmni joylashtishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  // Introduction page view
  if (showIntro) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6 py-12">
            <div className="mx-auto w-fit rounded-2xl gradient-primary p-4 shadow-glow">
              <Sparkles className="h-16 w-16 text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('ai.intro.title')}
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('ai.intro.subtitle')}
              </p>
            </div>
            <Button 
              size="lg" 
              className="gradient-primary text-lg px-8 py-6 shadow-hover transition-smooth"
              onClick={() => {
                if (!user) {
                  toast({
                    title: "Xatolik",
                    description: t('ai.intro.loginRequired'),
                    variant: "destructive",
                  });
                  navigate('/auth');
                  return;
                }
                setShowIntro(false);
              }}
            >
              {t('ai.intro.start')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            {!user && (
              <p className="text-sm text-muted-foreground">
                {t('ai.intro.loginRequired')}
              </p>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="gradient-card shadow-card border-primary/20">
              <CardHeader>
                <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{t('ai.intro.feature1')}</CardTitle>
                <CardDescription className="text-base">
                  {t('ai.intro.feature1desc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card shadow-card border-primary/20">
              <CardHeader>
                <div className="mb-4 w-fit rounded-lg bg-accent/10 p-3">
                  <Palette className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-xl">{t('ai.intro.feature2')}</CardTitle>
                <CardDescription className="text-base">
                  {t('ai.intro.feature2desc')}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="gradient-card shadow-card border-primary/20">
              <CardHeader>
                <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3">
                  <ImagePlus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{t('ai.intro.feature3')}</CardTitle>
                <CardDescription className="text-base">
                  {t('ai.intro.feature3desc')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* How it Works */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">{t('ai.intro.howWorks')}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center space-y-3">
                <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-lg font-semibold">{t('ai.intro.step1')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('ai.intro.step1desc')}
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="mx-auto w-fit rounded-full bg-accent/10 p-4">
                  <span className="text-2xl font-bold text-accent">2</span>
                </div>
                <h3 className="text-lg font-semibold">{t('ai.intro.step2')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('ai.intro.step2desc')}
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-lg font-semibold">{t('ai.intro.step3')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('ai.intro.step3desc')}
                </p>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-center">{t('ai.intro.examples')}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="gradient-card shadow-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground italic">
                    "{t('ai.intro.example1')}"
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card shadow-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground italic">
                    "{t('ai.intro.example2')}"
                  </p>
                </CardContent>
              </Card>

              <Card className="gradient-card shadow-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground italic">
                    "{t('ai.intro.example3')}"
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI Generation tool view
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg gradient-primary p-2">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                AI Rasm Generatori
              </h1>
              <p className="text-muted-foreground">
                Sun'iy intellekt yordamida rasm yarating
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Prompt kiriting</CardTitle>
              <CardDescription>
                Yaratmoqchi bo'lgan rasmingizni batafsil tasvirlab bering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Sizning tasavvuringiz</Label>
                <Textarea
                  id="prompt"
                  placeholder="Masalan: Oltin osmon ostida qadimiy shahar, kecha vaqti, yulduzlar porlayotgan..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[200px] resize-none transition-smooth"
                />
              </div>

              <Button
                size="lg"
                className="w-full gradient-primary transition-smooth hover:shadow-hover"
                onClick={handleGenerate}
                disabled={isGenerating || !user}
              >
                {isGenerating ? (
                  <>
                    <Wand2 className="mr-2 h-5 w-5 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Rasm yaratish
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-sm text-center text-muted-foreground">
                  AI rasm yaratish uchun <a href="/auth" className="text-primary hover:underline">tizimga kiring</a>
                </p>
              )}

              <div className="space-y-2 rounded-lg bg-muted p-4">
                <h3 className="text-sm font-medium">Maslahatlar:</h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Rang va yorug'likni ta'riflang</li>
                  <li>• Obyektlarning joylashuvini ko'rsating</li>
                  <li>• Arzimas tafsilotlarni qo'shing</li>
                  <li>• Kayfiyat va atmosferani ifodalang</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Natija</CardTitle>
              <CardDescription>
                Yaratilgan rasm bu yerda ko'rinadi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedImage ? (
                <>
                  <div className="overflow-hidden rounded-lg">
                    <img
                      src={generatedImage}
                      alt="AI generated"
                      className="h-auto w-full object-cover"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="w-full transition-smooth"
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Yuklab olish
                    </Button>
                    <Button
                      className="w-full gradient-primary transition-smooth"
                      onClick={handlePublish}
                      disabled={!user}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Galereyaga joylash
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed">
                  <div className="text-center space-y-3">
                    <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium">
                      Rasm hali yaratilmagan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prompt yozib, "Rasm yaratish" tugmasini bosing
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
