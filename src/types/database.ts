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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      child_items: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          kind: string
          linked_event_id: string | null
          note: string | null
          owner: string
          scheduled_at: string | null
          space: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          household_id: string
          id?: string
          kind: string
          linked_event_id?: string | null
          note?: string | null
          owner: string
          scheduled_at?: string | null
          space: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          kind?: string
          linked_event_id?: string | null
          note?: string | null
          owner?: string
          scheduled_at?: string | null
          space?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_items_linked_event_fk"
            columns: ["household_id", "linked_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          created_at: string
          created_by: string
          ends_at: string | null
          household_id: string
          id: string
          location: string | null
          owner: string
          reminder_at: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          household_id: string
          id?: string
          location?: string | null
          owner: string
          reminder_at?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          household_id?: string
          id?: string
          location?: string | null
          owner?: string
          reminder_at?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          household_id: string
          id: string
          owner: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          display_name: string
          household_id: string
          id?: string
          owner: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          household_id?: string
          id?: string
          owner?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          child_item_id: string | null
          created_at: string
          created_by: string
          event_id: string | null
          household_id: string
          id: string
          remind_at: string
          sent_at: string | null
          status: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          child_item_id?: string | null
          created_at?: string
          created_by?: string
          event_id?: string | null
          household_id: string
          id?: string
          remind_at: string
          sent_at?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          child_item_id?: string | null
          created_at?: string
          created_by?: string
          event_id?: string | null
          household_id?: string
          id?: string
          remind_at?: string
          sent_at?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_child_item_fk"
            columns: ["household_id", "child_item_id"]
            isOneToOne: false
            referencedRelation: "child_items"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "reminders_event_fk"
            columns: ["household_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["household_id", "id"]
          },
          {
            foreignKeyName: "reminders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_task_fk"
            columns: ["household_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
      shopping_items: {
        Row: {
          aisle: string
          checked: boolean
          checked_at: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          note: string | null
          quantity: string | null
          updated_at: string
        }
        Insert: {
          aisle: string
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          created_by?: string
          household_id: string
          id?: string
          name: string
          note?: string | null
          quantity?: string | null
          updated_at?: string
        }
        Update: {
          aisle?: string
          checked?: boolean
          checked_at?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          name?: string
          note?: string | null
          quantity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          due_at: string | null
          household_id: string
          id: string
          owner: string
          priority: string
          recurrence: Json | null
          recurrence_occurrence: number | null
          recurrence_series_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          household_id: string
          id?: string
          owner: string
          priority?: string
          recurrence?: Json | null
          recurrence_occurrence?: number | null
          recurrence_series_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_at?: string | null
          household_id?: string
          id?: string
          owner?: string
          priority?: string
          recurrence?: Json | null
          recurrence_occurrence?: number | null
          recurrence_series_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurrence_series_fk"
            columns: ["household_id", "recurrence_series_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["household_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invitation: {
        Args: { invitation_token: string; member_display_name: string }
        Returns: string
      }
      create_household: {
        Args: {
          creator_display_name: string
          creator_owner: string
          household_name: string
        }
        Returns: string
      }
      complete_task_occurrence: {
        Args: { occurrence_completed_at: string; target_task_id: string }
        Returns: string
      }
      is_household_member: {
        Args: { target_household_id: string }
        Returns: boolean
      }
      issue_household_invitation: {
        Args: {
          invited_email: string
          invited_owner: string
          target_household_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
