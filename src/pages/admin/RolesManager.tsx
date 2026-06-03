import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, X, Clock, Shield, Loader2, UserCheck, UserX, Plus, Trash2, Users, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { logActivity } from "@/hooks/useActivityLog";

interface AdminRequest {
  id: string;
  user_id: string;
  email: string;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "user";
  created_at: string;
  email: string | null;
}

const RolesManager = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null);

  const sendNotificationEmail = async (email: string, status: "approved" | "rejected") => {
    try {
      const response = await supabase.functions.invoke("send-admin-notification", {
        body: { email, status, appName: "Radhakrishnan's Portfolio" },
      });
      
      if (response.error) {
        console.error("Failed to send notification email:", response.error);
        toast.error("Request processed but email notification failed");
      } else {
        console.log("Notification email sent successfully");
      }
    } catch (error) {
      console.error("Error sending notification email:", error);
    }
  };

  // Fetch admin requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as AdminRequest[];
    },
  });

  // Fetch all admin users
  const { data: adminUsers, isLoading: adminsLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserRole[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (request: AdminRequest) => {
      // Add the admin role to user_roles
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: request.user_id,
        role: "admin",
      });

      if (roleError) throw roleError;

      // Update the request status
      const { error: updateError } = await supabase
        .from("admin_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;
      
      return request;
    },
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Admin access approved!");
      setProcessingId(null);
      sendNotificationEmail(request.email, "approved");
      logActivity({
        actionType: "request_approved",
        entityType: "admin_request",
        entityId: request.id,
        entityName: request.email,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (request: AdminRequest) => {
      const { error } = await supabase
        .from("admin_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;
      
      return request;
    },
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Request rejected");
      setProcessingId(null);
      sendNotificationEmail(request.email, "rejected");
      logActivity({
        actionType: "request_rejected",
        entityType: "admin_request",
        entityId: request.id,
        entityName: request.email,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setProcessingId(null);
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      toast.success("Request deleted");
      setProcessingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setProcessingId(null);
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: (_data, roleId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Admin removed successfully");
      setProcessingId(null);
      logActivity({
        actionType: "role_removed",
        entityType: "admin_role",
        entityId: roleId,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setProcessingId(null);
    },
  });

  const handleApprove = (request: AdminRequest) => {
    setProcessingId(request.id);
    approveMutation.mutate(request);
  };

  const handleReject = (request: AdminRequest) => {
    setProcessingId(request.id);
    rejectMutation.mutate(request);
  };

  const handleDeleteRequest = (id: string) => {
    setProcessingId(id);
    deleteRequestMutation.mutate(id);
  };

  const handleRemoveAdmin = (roleId: string) => {
    setProcessingId(roleId);
    removeAdminMutation.mutate(roleId);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      toast.error("Please enter email and password");
      return;
    }

    setIsCreatingAdmin(true);
    try {
      // Create new user via signup
      const { data, error } = await supabase.auth.signUp({
        email: newAdminEmail,
        password: newAdminPassword,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user");

      // Add admin role with email
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "admin",
        email: newAdminEmail,
      });

      if (roleError) throw roleError;

      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-activity-logs"] });
      toast.success("Admin user created successfully!");
      logActivity({
        actionType: "role_added",
        entityType: "admin_role",
        entityId: data.user.id,
        entityName: newAdminEmail,
      });
      setNewAdminEmail("");
      setNewAdminPassword("");
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create admin");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleSendPasswordReset = async (admin: UserRole) => {
    if (!admin.email) {
      toast.error("No email found for this admin");
      return;
    }

    setResettingPasswordId(admin.id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(admin.email, {
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (error) throw error;

      toast.success(`Password reset email sent to ${admin.email}`);
      logActivity({
        actionType: "password_reset",
        entityType: "admin_role",
        entityId: admin.id,
        entityName: admin.email || undefined,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to send password reset email");
    } finally {
      setResettingPasswordId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="gap-1 bg-green-600">
            <Check className="w-3 h-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const processedRequests = requests?.filter((r) => r.status !== "pending") || [];
  const isLoading = requestsLoading || adminsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Roles Manager</h1>
          <p className="text-muted-foreground mt-2">
            Manage admin users and access requests
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>
                Create a new admin user with full access to the admin panel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAdmin} disabled={isCreatingAdmin}>
                {isCreatingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Admin"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Admins
            {adminUsers && adminUsers.length > 0 && (
              <Badge variant="secondary">{adminUsers.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Users with admin access to the panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!adminUsers || adminUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No admin users found
            </p>
          ) : (
            <div className="space-y-4">
              {adminUsers.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <p className="font-medium">
                        {admin.email || `User ID: ${admin.user_id.slice(0, 8)}...`}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Added {format(new Date(admin.created_at), "PPp")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary">Admin</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={resettingPasswordId === admin.id || !admin.email}
                      onClick={() => handleSendPasswordReset(admin)}
                      title={!admin.email ? "No email available" : "Send password reset email"}
                    >
                      {resettingPasswordId === admin.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      Reset Password
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={processingId === admin.id}
                        >
                          {processingId === admin.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Admin Access?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will revoke admin access for this user. They will no longer be able to access the admin panel.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveAdmin(admin.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Users waiting for admin access approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending requests
            </p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{request.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested {format(new Date(request.requested_at), "PPp")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>
            Previously reviewed admin access requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No processed requests yet
            </p>
          ) : (
            <div className="space-y-4">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{request.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested {format(new Date(request.requested_at), "PPp")}
                      {request.reviewed_at && (
                        <> · Reviewed {format(new Date(request.reviewed_at), "PPp")}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRequest(request.id)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesManager;
