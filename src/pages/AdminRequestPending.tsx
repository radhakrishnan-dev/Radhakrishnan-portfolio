import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, RefreshCw, Loader2, CheckCircle, XCircle } from "lucide-react";

const AdminRequestPending = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("pending");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    if (!user) return;

    setIsRefreshing(true);
    const { data, error } = await supabase
      .from("admin_requests")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking status:", error);
    } else if (data) {
      setStatus(data.status);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isAdmin) {
      navigate("/admin");
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    checkStatus();
    // Poll for status updates every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const getStatusContent = () => {
    switch (status) {
      case "approved":
        return {
          icon: <CheckCircle className="w-12 h-12 text-green-500" />,
          title: "Access Approved!",
          description: "Your admin access has been approved. You can now access the admin panel.",
          action: (
            <Button onClick={() => navigate("/admin")} className="mt-4">
              Go to Admin Panel
            </Button>
          ),
        };
      case "rejected":
        return {
          icon: <XCircle className="w-12 h-12 text-destructive" />,
          title: "Access Denied",
          description: "Unfortunately, your admin access request has been rejected. Please contact an administrator if you believe this is an error.",
          action: (
            <Button variant="outline" onClick={handleSignOut} className="mt-4">
              Sign Out
            </Button>
          ),
        };
      default:
        return {
          icon: <Clock className="w-12 h-12 text-primary" />,
          title: "Request Pending",
          description: "Your admin access request is being reviewed. An administrator will approve or reject your request soon.",
          action: (
            <Button
              variant="outline"
              onClick={checkStatus}
              disabled={isRefreshing}
              className="mt-4 gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Status
            </Button>
          ),
        };
    }
  };

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to website
        </button>

        <Card className="glass-card border-border text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {content.icon}
            </div>
            <CardTitle className="font-heading text-2xl">
              {content.title}
            </CardTitle>
            <CardDescription className="text-base">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.action}
            
            {status === "pending" && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  Signed in as: {user?.email}
                </p>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRequestPending;
