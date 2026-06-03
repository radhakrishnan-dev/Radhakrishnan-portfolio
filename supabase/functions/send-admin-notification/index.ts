import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  status: "approved" | "rejected";
  appName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, status, appName = "Admin Panel" }: NotificationRequest = await req.json();

    if (!email || !status) {
      return new Response(
        JSON.stringify({ error: "Email and status are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const isApproved = status === "approved";
    const subject = isApproved
      ? `Your Admin Access Request Has Been Approved!`
      : `Update on Your Admin Access Request`;

    const htmlContent = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">🎉 Congratulations!</h1>
          <p>Your request for admin access to <strong>${appName}</strong> has been <strong style="color: #22c55e;">approved</strong>!</p>
          <p>You now have full access to the admin panel where you can:</p>
          <ul>
            <li>Manage projects and portfolio items</li>
            <li>Update skills and testimonials</li>
            <li>Handle user roles and permissions</li>
          </ul>
          <p>Log in now to start managing your content.</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The ${appName} Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Admin Access Request Update</h1>
          <p>We've reviewed your request for admin access to <strong>${appName}</strong>.</p>
          <p>Unfortunately, your request has been <strong style="color: #ef4444;">declined</strong> at this time.</p>
          <p>If you believe this was done in error or have questions, please contact the site administrator.</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The ${appName} Team</p>
        </div>
      `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Admin Panel <onboarding@resend.dev>",
        to: [email],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
