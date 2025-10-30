import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, MessageCircle, Heart, User, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ImageCardProps {
  id: string;
  imageUrl: string;
  author: string;
  authorId: string;
  title: string;
  description: string | null;
  likesCount: number;
  storagePath?: string | null;
  onDelete?: () => void;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
  } | null;
}

interface Tag {
  id: string;
  tags: {
    name: string;
  } | null;
}

export function ImageCard({ id, imageUrl, author, authorId, title, description, likesCount, storagePath, onDelete }: ImageCardProps) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likesCount);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkIfLiked();
    fetchTags();
    
    // Real-time subscription for comments
    const commentsChannel = supabase
      .channel(`comments-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `image_id=eq.${id}`
        },
        () => {
          if (showComments) {
            fetchComments();
          }
        }
      )
      .subscribe();

    // Real-time subscription for likes
    const likesChannel = supabase
      .channel(`likes-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `image_id=eq.${id}`
        },
        () => {
          checkIfLiked();
          fetchLikeCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [id, showComments]);

  const checkIfLiked = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('image_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setLiked(!!data);
  };

  const fetchLikeCount = async () => {
    const { data } = await supabase
      .from('images')
      .select('likes_count')
      .eq('id', id)
      .single();
    
    if (data) {
      setLikeCount(data.likes_count);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          username
        )
      `)
      .eq('image_id', id)
      .order('created_at', { ascending: false });
    
    setComments(data || []);
  };

  const fetchTags = async () => {
    const { data } = await supabase
      .from('image_tags')
      .select(`
        id,
        tags (
          name
        )
      `)
      .eq('image_id', id);
    
    if (data) {
      setTags(data.map((t: Tag) => t.tags?.name || '').filter(Boolean));
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Kirish talab qilinadi",
        description: "Like qo'yish uchun tizimga kiring",
        variant: "destructive",
      });
      return;
    }

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('image_id', id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            image_id: id,
            user_id: user.id,
          });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Xatolik",
        description: "Like qo'yishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${title}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleComment = async () => {
    if (!user) {
      toast({
        title: "Kirish talab qilinadi",
        description: "Sharh yozish uchun tizimga kiring",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          image_id: id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      
      toast({
        title: "Muvaffaqiyatli",
        description: "Sharh qo'shildi",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Xatolik",
        description: "Sharh qo'shishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      fetchComments();
      
      toast({
        title: "Muvaffaqiyatli",
        description: "Sharh o'chirildi",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Xatolik",
        description: "Sharh o'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== authorId) {
      toast({
        title: "Xatolik",
        description: "Siz bu rasmni o'chira olmaysiz",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm("Rostdan ham bu rasmni o'chirmoqchimisiz?");
    if (!confirmed) return;

    setLoading(true);
    try {
      // Delete from storage if storage path exists
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('images')
          .remove([storagePath]);

        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database (will cascade delete likes, comments, image_tags)
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Muvaffaqiyatli",
        description: "Rasm o'chirildi",
      });

      // Call onDelete callback if provided
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Xatolik",
        description: "Rasmni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  return (
    <Card className="group overflow-hidden transition-smooth hover:shadow-hover gradient-card">
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="gradient-primary text-white text-xs">
                {author.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => {
                if (user && user.id !== authorId) {
                  navigate('/chats', { state: { startChatWith: authorId } });
                }
              }}
              className={`text-sm font-medium transition-smooth ${
                user && user.id !== authorId ? 'hover:text-primary cursor-pointer' : ''
              }`}
            >
              {author}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className="transition-smooth"
            >
              <Heart
                className={`h-4 w-4 ${liked ? "fill-destructive text-destructive" : ""}`}
              />
              <span className="ml-1 text-xs">{likeCount}</span>
            </Button>
            {user && user.id === authorId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="transition-smooth"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={imageUrl}
            alt="AI generated art"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="transition-smooth hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              #{tag}
            </Badge>
          ))}
        </div>

        <div className="flex w-full items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1 transition-smooth"
          >
            <Download className="mr-2 h-4 w-4" />
            Yuklab olish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 transition-smooth"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Sharhlar ({comments.length})
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-3">
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg bg-muted p-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {comment.profiles?.username || 'Unknown'}
                        </span>
                      </div>
                      {user && comment.user_id === user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Hali sharhlar yo'q</p>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                placeholder="Sharh yozing..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none transition-smooth"
              />
              <Button 
                onClick={handleComment} 
                size="sm" 
                className="gradient-primary"
                disabled={loading || !user}
              >
                Yuborish
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
