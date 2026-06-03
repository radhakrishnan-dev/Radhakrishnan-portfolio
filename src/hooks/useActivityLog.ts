import { supabase } from "@/integrations/supabase/client";

type ActionType = 
  | "password_reset"
  | "role_added"
  | "role_removed"
  | "request_approved"
  | "request_rejected"
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "project_reordered"
  | "service_created"
  | "service_updated"
  | "service_deleted"
  | "service_reordered"
  | "skill_created"
  | "skill_updated"
  | "skill_deleted"
  | "skill_reordered"
  | "category_renamed"
  | "category_deleted"
  | "testimonial_created"
  | "testimonial_updated"
  | "testimonial_deleted"
  | "testimonial_reordered"
  | "profile_updated"
  | "media_uploaded"
  | "media_deleted";

type EntityType = "admin_role" | "admin_request" | "project" | "service" | "skill" | "testimonial" | "settings" | "media";

interface LogActivityParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}

export const logActivity = async ({
  actionType,
  entityType,
  entityId,
  entityName,
  details = {},
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Cannot log activity: No authenticated user");
      return;
    }

    const { error } = await supabase.from("admin_activity_logs" as any).insert({
      admin_id: user.id,
      admin_email: user.email,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
    } as any);

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

export const useActivityLog = () => {
  return { logActivity };
};
