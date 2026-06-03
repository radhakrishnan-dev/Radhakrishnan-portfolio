import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Pin, StickyNote } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  { value: "yellow", bg: "bg-yellow-500/15 border-yellow-500/30" },
  { value: "teal", bg: "bg-primary/15 border-primary/30" },
  { value: "pink", bg: "bg-pink-500/15 border-pink-500/30" },
  { value: "blue", bg: "bg-blue-500/15 border-blue-500/30" },
];

const QuickNotes = () => {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [color, setColor] = useState("yellow");

  const { data: notes = [] } = useQuery({
    queryKey: ["quick-notes"],
    queryFn: async () => (await (supabase as any).from("quick_notes").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false })).data || [],
  });

  const add = async () => {
    if (!content.trim()) return;
    const { error } = await (supabase as any).from("quick_notes").insert({ content, color });
    if (error) return toast.error(error.message);
    setContent("");
    qc.invalidateQueries({ queryKey: ["quick-notes"] });
  };

  const update = async (id: string, patch: any) => {
    await (supabase as any).from("quick_notes").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["quick-notes"] });
  };

  const del = async (id: string) => {
    await (supabase as any).from("quick_notes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["quick-notes"] });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight flex items-center gap-2"><StickyNote className="w-7 h-7 text-primary" />Quick Notes</h1>
        <p className="text-muted-foreground text-sm mt-1">Scratchpad for ideas, client feedback, reminders</p>
      </div>

      <Card className="p-4 border-border/60">
        <Textarea placeholder="Write a note…" value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
        <div className="flex justify-between mt-2">
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setColor(c.value)} className={`w-6 h-6 rounded-full border ${c.bg} ${color === c.value ? "ring-2 ring-primary" : ""}`} />
            ))}
          </div>
          <Button onClick={add} className="gap-2" size="sm"><Plus className="w-4 h-4" />Add Note</Button>
        </div>
      </Card>

      {notes.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No notes yet.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n: any) => {
            const c = COLORS.find(x => x.value === n.color) || COLORS[0];
            return (
              <Card key={n.id} className={`p-3 border ${c.bg} group relative`}>
                <Textarea
                  defaultValue={n.content}
                  onBlur={(e) => e.target.value !== n.content && update(n.id, { content: e.target.value })}
                  rows={5}
                  className="bg-transparent border-0 resize-none focus-visible:ring-0 p-0 text-sm"
                />
                <div className="flex justify-between items-center mt-1 text-[10px] text-muted-foreground">
                  <span>{new Date(n.updated_at).toLocaleDateString()}</span>
                  <div className="flex gap-1 opacity-50 group-hover:opacity-100">
                    <button onClick={() => update(n.id, { pinned: !n.pinned })}><Pin className={`w-3 h-3 ${n.pinned ? "text-primary fill-primary" : ""}`} /></button>
                    <button onClick={() => del(n.id)}><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickNotes;
