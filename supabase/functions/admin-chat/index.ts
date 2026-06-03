import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, action } = await req.json();

    // If action is "create_project", directly insert
    if (action === "create_project") {
      const { projectData } = await req.json().catch(() => ({ projectData: null }));
      // This path is handled client-side instead
    }

    const systemPrompt = `You are an AI assistant for a freelance portfolio + CRM admin panel. You help manage:
- Portfolio projects (public projects shown on website)
- Clients (CRM)
- Client projects (work tracker, internal)
- Invoices / income tracking
- General Q&A, summaries, follow-up suggestions

When the user asks to CREATE something, respond with a SINGLE JSON code block (\`\`\`json ... \`\`\`) using one of these actions. Always include a short friendly sentence first.

1. Portfolio project:
{ "action": "create_project", "title": "...", "description": "...", "tech_stack": ["..."], "live_url": null, "github_url": null }

2. Client:
{ "action": "create_client", "name": "...", "email": null, "phone": null, "company": null, "status": "active", "notes": null }

3. Client work project (tracker):
{ "action": "create_client_project", "title": "...", "description": null, "status": "in_progress", "progress": 0, "deadline": null, "budget": null, "currency": "USD", "client_name": null }
(status: lead | in_progress | review | done | on_hold; client_name optional - will be matched fuzzy to existing clients)

4. Invoice:
{ "action": "create_invoice", "invoice_number": null, "amount": 0, "currency": "USD", "status": "unpaid", "issue_date": "YYYY-MM-DD", "due_date": null, "client_name": null, "notes": null }

For SUMMARIES, REPORTS, FOLLOW-UPS, or general questions: just answer naturally in markdown — no JSON. Keep responses concise. When suggesting follow-ups for stalled projects or overdue invoices, give 2-3 specific, actionable suggestions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
