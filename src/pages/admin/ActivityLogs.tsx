import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, FileText, Wrench, GraduationCap, MessageSquare, Shield, KeyRound, UserPlus, UserMinus, Check, X, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityLog {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const getActionIcon = (actionType: string) => {
  if (actionType.includes("password_reset")) return <KeyRound className="w-4 h-4" />;
  if (actionType.includes("role_added")) return <UserPlus className="w-4 h-4" />;
  if (actionType.includes("role_removed")) return <UserMinus className="w-4 h-4" />;
  if (actionType.includes("approved")) return <Check className="w-4 h-4" />;
  if (actionType.includes("rejected")) return <X className="w-4 h-4" />;
  if (actionType.includes("reordered")) return <ArrowUpDown className="w-4 h-4" />;
  if (actionType.includes("created")) return <FileText className="w-4 h-4" />;
  if (actionType.includes("updated")) return <FileText className="w-4 h-4" />;
  if (actionType.includes("deleted")) return <FileText className="w-4 h-4" />;
  return <History className="w-4 h-4" />;
};

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case "project":
      return <FileText className="w-4 h-4" />;
    case "service":
      return <Wrench className="w-4 h-4" />;
    case "skill":
      return <GraduationCap className="w-4 h-4" />;
    case "testimonial":
      return <MessageSquare className="w-4 h-4" />;
    case "admin_role":
    case "admin_request":
      return <Shield className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

const getActionColor = (actionType: string): string => {
  if (actionType.includes("created") || actionType.includes("added") || actionType.includes("approved")) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
  if (actionType.includes("deleted") || actionType.includes("removed") || actionType.includes("rejected")) {
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }
  if (actionType.includes("updated") || actionType.includes("reordered")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  }
  if (actionType.includes("password_reset")) {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  }
  return "bg-muted text-muted-foreground";
};

const formatActionType = (actionType: string): string => {
  return actionType
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatEntityType = (entityType: string): string => {
  return entityType
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ActivityLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as unknown as ActivityLog[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Activity Logs</h2>
        <p className="text-muted-foreground">Track all admin actions and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing the last 100 admin actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs yet</p>
              <p className="text-sm">Actions will appear here as admins make changes</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getEntityIcon(log.entity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getActionColor(log.action_type)}>
                          <span className="flex items-center gap-1">
                            {getActionIcon(log.action_type)}
                            {formatActionType(log.action_type)}
                          </span>
                        </Badge>
                        <Badge variant="outline">
                          {formatEntityType(log.entity_type)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {log.entity_name && (
                          <span className="font-medium">"{log.entity_name}"</span>
                        )}
                        {log.entity_id && !log.entity_name && (
                          <span className="font-mono text-xs">{log.entity_id.slice(0, 8)}...</span>
                        )}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{log.admin_email || log.admin_id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogs;
