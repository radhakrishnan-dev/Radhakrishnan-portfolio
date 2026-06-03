import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, Trash2, Clock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const MessagesInbox = () => {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-messages"] }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("contact_messages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      setSelectedMessage(null);
      toast.success("Message deleted");
    },
  });

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const handleSelect = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.is_read) markAsRead.mutate(msg.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Messages Inbox</h1>
        <p className="text-muted-foreground mt-1">
          {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Message List */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {messages.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((msg) => (
              <Card
                key={msg.id}
                className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                  selectedMessage?.id === msg.id ? "border-primary" : ""
                } ${!msg.is_read ? "border-l-4 border-l-primary" : ""}`}
                onClick={() => handleSelect(msg)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium truncate ${!msg.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {msg.name}
                        </p>
                        {!msg.is_read && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{msg.email}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{msg.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(msg.created_at), "MMM d")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3">
          {selectedMessage ? (
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedMessage.name}</CardTitle>
                    <a href={`mailto:${selectedMessage.email}`} className="text-primary text-sm hover:underline">
                      {selectedMessage.email}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMessage.mutate(selectedMessage.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3" />
                  {format(new Date(selectedMessage.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.message}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardContent className="py-20 text-center text-muted-foreground">
                <MailOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Select a message to read</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesInbox;
