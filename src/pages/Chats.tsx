import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, ArrowLeft, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Chat {
  id: string;
  created_at: string;
  updated_at: string;
  other_participant: {
    id: string;
    username: string;
    full_name: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
  } | null;
}

export default function Chats() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if we need to start a chat with a specific user
  useEffect(() => {
    if (location.state?.startChatWith && user) {
      startNewChat(location.state.startChatWith);
    }
  }, [location.state, user]);

  const startNewChat = async (otherUserId: string) => {
    try {
      // Check if chat already exists
      const { data: existingChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user!.id);

      if (existingChats) {
        for (const chat of existingChats) {
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.chat_id)
            .eq('user_id', otherUserId)
            .maybeSingle();

          if (otherParticipant) {
            setSelectedChat(chat.chat_id);
            fetchMessages(chat.chat_id);
            return;
          }
        }
      }

      // Create new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: user!.id },
          { chat_id: newChat.id, user_id: otherUserId }
        ]);

      if (participantsError) throw participantsError;

      setSelectedChat(newChat.id);
      fetchChats();
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Xatolik",
        description: "Chat ochishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);

      // Real-time subscription for messages
      const channel = supabase
        .channel(`chat-${selectedChat}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${selectedChat}`
          },
          () => {
            fetchMessages(selectedChat);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      const { data: participantData } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user!.id);

      if (!participantData) {
        setLoading(false);
        return;
      }

      const chatIds = participantData.map(p => p.chat_id);
      const chatsData: Chat[] = [];

      for (const chatId of chatIds) {
        // Get other participant's info
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chatId)
          .neq('user_id', user!.id);

        if (participants && participants.length > 0) {
          const otherUserId = participants[0].user_id;
          
          // Get profile info
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', otherUserId)
            .single();

          if (profileData) {
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('chat_id', chatId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            chatsData.push({
              id: chatId,
              created_at: '',
              updated_at: '',
              other_participant: {
                id: otherUserId,
                username: profileData.username || 'Unknown',
                full_name: profileData.full_name || null
              },
              last_message: lastMessage || undefined
            });
          }
        }
      }

      setChats(chatsData);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        // Fetch profile for each message
        const messagesWithProfiles = await Promise.all(
          messagesData.map(async (msg) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', msg.user_id)
              .single();

            return {
              ...msg,
              profiles: profile || { username: 'Unknown' }
            };
          })
        );
        setMessages(messagesWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat,
          user_id: user!.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Xatolik",
        description: "Xabar yuborishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const selectedChatData = chats.find(c => c.id === selectedChat);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat =>
    chat.other_participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Chat uchun tizimga kiring</p>
            <Button onClick={() => navigate('/auth')} className="mt-4">
              Kirish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">Chatlar</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Chat list */}
          <Card className="md:col-span-1">
            <CardContent className="p-4">
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Foydalanuvchi qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-muted-foreground">Yuklanmoqda...</p>
                  ) : filteredChats.length === 0 ? (
                    <p className="text-muted-foreground">
                      {searchQuery ? "Foydalanuvchi topilmadi" : "Chatlar yo'q"}
                    </p>
                  ) : (
                    filteredChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChat(chat.id)}
                        className={`w-full p-3 rounded-lg text-left transition-smooth ${
                          selectedChat === chat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {chat.other_participant.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {chat.other_participant.username}
                            </p>
                            {chat.last_message && (
                              <p className="text-sm truncate opacity-80">
                                {chat.last_message.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat messages */}
          <Card className="md:col-span-2">
            <CardContent className="p-4 flex flex-col h-full">
              {selectedChat ? (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedChatData?.other_participant.username.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedChatData?.other_participant.username}
                      </p>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 mb-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.user_id === user.id
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.user_id === user.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.created_at).toLocaleTimeString('uz-UZ', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Xabar yozing..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={sendMessage}
                      size="icon"
                      className="h-full aspect-square"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Chatni tanlang</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}