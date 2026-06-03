import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail, ArrowLeft, Loader2 } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin");
    }
  }, [user, loading, isAdmin, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setIsForgotPassword(false);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error("An error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          toast.error(error.message);
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Create admin request
          const { error: requestError } = await supabase
            .from("admin_requests")
            .insert({
              user_id: data.user.id,
              email: data.user.email || email,
            });

          if (requestError && !requestError.message.includes("duplicate")) {
            console.error("Error creating admin request:", requestError);
          }

          toast.success("Account created! Your admin access request is pending approval.");
          navigate("/admin/pending");
        }
        setIsLoading(false);
        return;
      }

      // Sign in flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("Authentication failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: adminStatus } = await supabase.rpc('has_role', {
        _user_id: data.user.id,
        _role: 'admin'
      });

      if (adminStatus) {
        toast.success("Logged in successfully!");
        navigate("/admin");
        setIsLoading(false);
        return;
      }

      // Check for existing admin request
      const { data: request } = await supabase
        .from("admin_requests")
        .select("status")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (request) {
        if (request.status === "approved") {
          // Request was approved but role might not be set yet - this shouldn't happen
          toast.success("Logged in successfully!");
          navigate("/admin");
        } else if (request.status === "rejected") {
          toast.error("Your admin access request was rejected.");
          await supabase.auth.signOut();
        } else {
          toast.info("Your admin access request is still pending.");
          navigate("/admin/pending");
        }
      } else {
        // No admin role and no request - create a request
        const { error: requestError } = await supabase
          .from("admin_requests")
          .insert({
            user_id: data.user.id,
            email: data.user.email || email,
          });

        if (!requestError) {
          toast.info("Admin access requested. Waiting for approval.");
          navigate("/admin/pending");
        } else {
          toast.error("Unable to request admin access.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

        <Card className="glass-card border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-heading text-2xl">
              {isForgotPassword ? "Reset Password" : isSignUp ? "Request Admin Access" : "Admin Login"}
            </CardTitle>
            <CardDescription>
              {isForgotPassword 
                ? "Enter your email to receive a password reset link" 
                : isSignUp 
                  ? "Sign up to request admin access (requires approval)" 
                  : "Sign in to access the admin dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {isSignUp ? "Requesting access..." : "Signing in..."}
                    </>
                  ) : (
                    isSignUp ? "Request Admin Access" : "Sign In"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {isSignUp ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(false)}
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Need admin access?{" "}
                      <button
                        type="button"
                        onClick={() => setIsSignUp(true)}
                        className="text-primary hover:underline"
                      >
                        Request access
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
