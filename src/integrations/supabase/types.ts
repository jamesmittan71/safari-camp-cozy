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
      allocations: {
        Row: {
          arrival_date: string
          bed_a: string | null
          bed_a_name: string | null
          bed_b: string | null
          bed_b_name: string | null
          comments: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          departure_date: string
          id: string
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          arrival_date: string
          bed_a?: string | null
          bed_a_name?: string | null
          bed_b?: string | null
          bed_b_name?: string | null
          comments?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          departure_date: string
          id?: string
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          arrival_date?: string
          bed_a?: string | null
          bed_a_name?: string | null
          bed_b?: string | null
          bed_b_name?: string | null
          comments?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          departure_date?: string
          id?: string
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_bed_a_fkey"
            columns: ["bed_a"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_bed_b_fkey"
            columns: ["bed_b"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          camp_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          room_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          room_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          room_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_reports: {
        Row: {
          completed_date: string | null
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          priority: string
          reported_by: string | null
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          priority?: string
          reported_by?: string | null
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          priority?: string
          reported_by?: string | null
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_reports_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_types: {
        Row: {
          camp_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          camp_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          camp_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_types_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          bed_configuration: string
          building_id: string
          created_at: string
          deleted_at: string | null
          id: string
          maintenance_notes: string | null
          max_occupancy: number
          room_number: string
          room_type_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bed_configuration?: string
          building_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          maintenance_notes?: string | null
          max_occupancy?: number
          room_number: string
          room_type_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bed_configuration?: string
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          maintenance_notes?: string | null
          max_occupancy?: number
          room_number?: string
          room_type_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          deleted_at: string | null
          department: string | null
          email: string | null
          emergency_contact: string | null
          employee_number: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          surname: string
          updated_at: string
          vehicle_registration: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_number?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          surname: string
          updated_at?: string
          vehicle_registration?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          employee_number?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          surname?: string
          updated_at?: string
          vehicle_registration?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      can_operate: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrator" | "manager" | "housekeeping" | "read_only"
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
      app_role: ["administrator", "manager", "housekeeping", "read_only"],
    },
  },
} as const
