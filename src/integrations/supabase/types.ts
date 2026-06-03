export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_email: string | null
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          email: string
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      client_files: {
        Row: {
          category: string
          client_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path: string
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          currency: string
          deadline: string | null
          description: string | null
          id: string
          income_type: string
          notes: string | null
          progress: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          id?: string
          income_type?: string
          notes?: string | null
          progress?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          id?: string
          income_type?: string
          notes?: string | null
          progress?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birthday: string | null
          company: string | null
          created_at: string
          email: string | null
          follow_up_date: string | null
          id: string
          last_contacted_at: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          birthday?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          birthday?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
        }
        Relationships: []
      }
      designs: {
        Row: {
          category: string
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          income_type: string
          invoice_number: string | null
          issue_date: string
          notes: string | null
          paid_date: string | null
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          income_type?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          income_type?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          invoice_id: string | null
          notes: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string
          display_order: number
          github_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          live_url: string | null
          tech_stack: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          live_url?: string | null
          tech_stack?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          live_url?: string | null
          tech_stack?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          accepted_date: string | null
          client_id: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          price: number
          scope: string | null
          sent_date: string | null
          status: string
          timeline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          accepted_date?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          price?: number
          scope?: string | null
          sent_date?: string | null
          status?: string
          timeline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          accepted_date?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          price?: number
          scope?: string | null
          sent_date?: string | null
          status?: string
          timeline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string
          display_order: number
          highlight: string
          icon: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          highlight?: string
          icon?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          highlight?: string
          icon?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          percentage: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          percentage: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          client_name: string
          client_role: string
          company: string
          content: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          rating: number
          updated_at: string
        }
        Insert: {
          client_name: string
          client_role: string
          company: string
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          rating?: number
          updated_at?: string
        }
        Update: {
          client_name?: string
          client_role?: string
          company?: string
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          billed: boolean
          created_at: string
          description: string | null
          duration_minutes: number
          ended_at: string | null
          id: string
          project_id: string | null
          started_at: string
        }
        Insert: {
          billed?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
        }
        Update: {
          billed?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          project_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
