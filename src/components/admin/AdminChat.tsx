import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Message = { role: "user" | "assistant"; content: string };
type PendingAction = { action: string; [k: string]: any };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-chat`;

const KNOWN_ACTIONS = ["create_project", "create_client", "create_client_project", "create_invoice"];

function extractAction(text: string): PendingAction | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (KNOWN_ACTIONS.includes(parsed.action)) return parsed;
  } catch {}
  return null;
}

const AdminChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && !isLoading) {
      const a = extractAction(last.content);
      if (a) setPending(a);
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");
    setMessages((p) => [...p, userMsg]);
    setIsLoading(true);
    setPending(null);

    let acc = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Chat failed");
      }
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
                }
                return [...prev, { role: "assistant", content: acc }];
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setMessages((p) => [...p, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const findClientId = async (name: string | null | undefined): Promise<string | null> => {
    if (!name) return null;
    const { data } = await (supabase as any).from("clients").select("id, name").ilike("name", `%${name}%`).limit(1);
    return data?.[0]?.id || null;
  };

  const confirm = async () => {
    if (!pending) return;
    setCreating(true);
    try {
      let label = "";
      if (pending.action === "create_project") {
        const { data: existing } = await supabase.from("projects").select("display_order").order("display_order", { ascending: false }).limit(1);
        const next = (existing?.[0]?.display_order ?? -1) + 1;
        const { error } = await supabase.from("projects").insert({
          title: pending.title, description: pending.description,
          tech_stack: pending.tech_stack || [], live_url: pending.live_url || null,
          github_url: pending.github_url || null, display_order: next, is_active: true,
        });
        if (error) throw error;
        label = `Portfolio project "${pending.title}"`;
        queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
        queryClient.invalidateQueries({ queryKey: ["public-projects"] });
      } else if (pending.action === "create_client") {
        const { error } = await (supabase as any).from("clients").insert({
          name: pending.name, email: pending.email, phone: pending.phone,
          company: pending.company, status: pending.status || "active", notes: pending.notes,
        });
        if (error) throw error;
        label = `Client "${pending.name}"`;
        queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      } else if (pending.action === "create_client_project") {
        const client_id = await findClientId(pending.client_name);
        const { error } = await (supabase as any).from("client_projects").insert({
          title: pending.title, description: pending.description, status: pending.status || "in_progress",
          progress: pending.progress || 0, deadline: pending.deadline, budget: pending.budget,
          currency: pending.currency || "USD", client_id,
        });
        if (error) throw error;
        label = `Project "${pending.title}"`;
        queryClient.invalidateQueries({ queryKey: ["admin-client-projects"] });
      } else if (pending.action === "create_invoice") {
        const client_id = await findClientId(pending.client_name);
        const { error } = await (supabase as any).from("invoices").insert({
          invoice_number: pending.invoice_number, amount: pending.amount, currency: pending.currency || "USD",
          status: pending.status || "unpaid", issue_date: pending.issue_date || new Date().toISOString().slice(0, 10),
          due_date: pending.due_date, notes: pending.notes, client_id,
        });
        if (error) throw error;
        label = `Invoice ${pending.invoice_number || `(${pending.currency} ${pending.amount})`}`;
        queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      }
      toast.success(`${label} added!`);
      setMessages((p) => [...p, { role: "assistant", content: `✅ ${label} added.` }]);
      setPending(null);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  const renderContent = (content: string) => content.replace(/```json[\s\S]*?```/g, "").trim();

  const actionLabel = (a: PendingAction) => {
    switch (a.action) {
      case "create_project": return `portfolio project "${a.title}"`;
      case "create_client": return `client "${a.name}"`;
      case "create_client_project": return `project "${a.title}"`;
      case "create_invoice": return `invoice (${a.currency} ${a.amount})`;
      default: return "item";
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] max-h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border bg-secondary/50">
              <h3 className="font-heading font-semibold text-sm">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Add clients, projects, invoices, or ask for summaries</p>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[340px]">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center pt-8">
                  Try: "Add client Acme Corp", "New invoice $2000 for Acme due Dec 1", or "How much did I earn this month?"
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm"}`}>
                    {renderContent(msg.content)}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start"><div className="bg-secondary rounded-xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div></div>
              )}
            </div>

            {pending && !creating && (
              <div className="px-4 py-2 border-t border-border bg-primary/5">
                <p className="text-xs mb-2">Add {actionLabel(pending)}?</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={confirm} className="flex-1 h-8 text-xs"><Plus className="w-3 h-3 mr-1" />Confirm</Button>
                  <Button size="sm" variant="outline" onClick={() => setPending(null)} className="h-8 text-xs">Skip</Button>
                </div>
              </div>
            )}
            {creating && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Creating...
              </div>
            )}

            <div className="px-3 py-3 border-t border-border flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                disabled={isLoading}
              />
              <Button size="icon" onClick={sendMessage} disabled={isLoading || !input.trim()} className="h-9 w-9 rounded-lg">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminChat;
