import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageCircle, ExternalLink, Send } from "lucide-react";

const WhatsAppBroadcast = () => {
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients-wa"],
    queryFn: async () => (await (supabase as any).from("clients").select("id, name, phone, whatsapp").order("name")).data || [],
  });

  const reachable = clients.filter((c: any) => c.whatsapp || c.phone);

  const toggleAll = () => {
    if (selected.size === reachable.length) setSelected(new Set());
    else setSelected(new Set(reachable.map((c: any) => c.id)));
  };

  const recipients = reachable.filter((c: any) => selected.has(c.id));
  const text = encodeURIComponent(message);

  const waLink = (c: any) => `https://wa.me/${(c.whatsapp || c.phone || "").replace(/\D/g, "")}?text=${text}`;

  const openAll = () => {
    recipients.forEach((c: any, i: number) => {
      setTimeout(() => window.open(waLink(c), "_blank"), i * 250);
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-2"><MessageCircle className="w-7 h-7 text-emerald-400" />WhatsApp Broadcast</h1>
        <p className="text-muted-foreground text-sm mt-1">Compose once, open individual chats with pre-filled message</p>
      </div>

      <Card className="p-4 border-border/60">
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Message</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi {name}, hope you're doing well…"
          rows={5}
          className="mt-2"
        />
      </Card>

      <Card className="border-border/60">
        <div className="p-4 border-b border-border/60 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm">Recipients ({selected.size}/{reachable.length})</h3>
            <p className="text-xs text-muted-foreground">Only clients with phone or WhatsApp shown</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={toggleAll}>{selected.size === reachable.length ? "Clear" : "Select all"}</Button>
            <Button size="sm" disabled={!message || selected.size === 0} onClick={openAll} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
              <Send className="w-4 h-4" />Open {selected.size} chats
            </Button>
          </div>
        </div>
        {reachable.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No clients with phone numbers</div>
        ) : (
          <div className="divide-y divide-border/60">
            {reachable.map((c: any) => (
              <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) next.add(c.id); else next.delete(c.id);
                      setSelected(next);
                    }}
                  />
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.whatsapp || c.phone}</div>
                  </div>
                </label>
                {message && (
                  <a href={waLink(c)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="gap-1"><ExternalLink className="w-3.5 h-3.5" />Open</Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatsAppBroadcast;
