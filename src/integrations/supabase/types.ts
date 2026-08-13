export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      allocations: {
        Row: {
          arrival_date: string;
          bed_a: string | null;
          bed_a_name: string | null;
          bed_b: string | null;
          bed_b_name: string | null;
          comments: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          department: string | null;
          departure_date: string;
          id: string;
          room_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          arrival_date: string;
          bed_a?: string | null;
          bed_a_name?: string | null;
          bed_b?: string | null;
          bed_b_name?: string | null;
          comments?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          department?: string | null;
          departure_date: string;
          id?: string;
          room_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          arrival_date?: string;
          bed_a?: string | null;
          bed_a_name?: string | null;
          bed_b?: string | null;
          bed_b_name?: string | null;
          comments?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          department?: string | null;
          departure_date?: string;
          id?: string;
          room_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "allocations_bed_a_fkey";
            columns: ["bed_a"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allocations_bed_b_fkey";
            columns: ["bed_b"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "allocations_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      buildings: {
        Row: {
          camp_id: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          camp_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          camp_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "buildings_camp_id_fkey";
            columns: ["camp_id"];
            isOneToOne: false;
            referencedRelation: "camps";
            referencedColumns: ["id"];
          },
        ];
      };
      camps: {
        Row: {
          code: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          location: string | null;
          name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      housekeeping_history: {
        Row: {
          id: string;
          task_id: string;
          from_status: string | null;
          to_status: string;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          from_status?: string | null;
          to_status: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          from_status?: string | null;
          to_status?: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "housekeeping_history_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "housekeeping_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string;
          date_assigned: string | null;
          deleted_at: string | null;
          id: string;
          inspection_notes: string | null;
          inspected_by: string | null;
          notes: string | null;
          priority: string;
          room_id: string;
          started_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          date_assigned?: string | null;
          deleted_at?: string | null;
          id?: string;
          inspection_notes?: string | null;
          inspected_by?: string | null;
          notes?: string | null;
          priority?: string;
          room_id: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          date_assigned?: string | null;
          deleted_at?: string | null;
          id?: string;
          inspection_notes?: string | null;
          inspected_by?: string | null;
          notes?: string | null;
          priority?: string;
          room_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "housekeeping_tasks_inspected_by_fkey";
            columns: ["inspected_by"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "housekeeping_tasks_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_history: {
        Row: {
          id: string;
          report_id: string;
          from_status: string | null;
          to_status: string;
          changed_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          from_status?: string | null;
          to_status: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          from_status?: string | null;
          to_status?: string;
          changed_by?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_history_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_reports: {
        Row: {
          assigned_to: string | null;
          category: string;
          completed_date: string | null;
          completion_notes: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          priority: string;
          reported_by: string | null;
          room_id: string;
          status: string;
          target_date: string | null;
          updated_at: string;
          work_order_number: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          category?: string;
          completed_date?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description: string;
          id?: string;
          priority?: string;
          reported_by?: string | null;
          room_id: string;
          status?: string;
          target_date?: string | null;
          updated_at?: string;
          work_order_number?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          category?: string;
          completed_date?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          priority?: string;
          reported_by?: string | null;
          room_id?: string;
          status?: string;
          target_date?: string | null;
          updated_at?: string;
          work_order_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_reports_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_reports_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_types: {
        Row: {
          camp_id: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          camp_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          camp_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_types_camp_id_fkey";
            columns: ["camp_id"];
            isOneToOne: false;
            referencedRelation: "camps";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          bed_configuration: string;
          building_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          maintenance_notes: string | null;
          max_occupancy: number;
          room_number: string;
          room_type_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          bed_configuration?: string;
          building_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          maintenance_notes?: string | null;
          max_occupancy?: number;
          room_number: string;
          room_type_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          bed_configuration?: string;
          building_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          maintenance_notes?: string | null;
          max_occupancy?: number;
          room_number?: string;
          room_type_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_building_id_fkey";
            columns: ["building_id"];
            isOneToOne: false;
            referencedRelation: "buildings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          department: string | null;
          email: string | null;
          emergency_contact: string | null;
          employee_number: string | null;
          employment_status: string;
          date_joined: string | null;
          gender: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          position: string | null;
          surname: string;
          updated_at: string;
          vehicle_registration: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          department?: string | null;
          email?: string | null;
          emergency_contact?: string | null;
          employee_number?: string | null;
          employment_status?: string;
          date_joined?: string | null;
          gender?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          position?: string | null;
          surname: string;
          updated_at?: string;
          vehicle_registration?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          department?: string | null;
          email?: string | null;
          emergency_contact?: string | null;
          employee_number?: string | null;
          employment_status?: string;
          date_joined?: string | null;
          gender?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          position?: string | null;
          surname?: string;
          updated_at?: string;
          vehicle_registration?: string | null;
        };
        Relationships: [];
      };
      staff_allocation_history: {
        Row: {
          allocation_date: string;
          created_at: string;
          created_by: string | null;
          from_bed: string | null;
          from_room_id: string | null;
          id: string;
          reason: string | null;
          team_member_id: string;
          to_bed: string | null;
          to_room_id: string | null;
        };
        Insert: {
          allocation_date?: string;
          created_at?: string;
          created_by?: string | null;
          from_bed?: string | null;
          from_room_id?: string | null;
          id?: string;
          reason?: string | null;
          team_member_id: string;
          to_bed?: string | null;
          to_room_id?: string | null;
        };
        Update: {
          allocation_date?: string;
          created_at?: string;
          created_by?: string | null;
          from_bed?: string | null;
          from_room_id?: string | null;
          id?: string;
          reason?: string | null;
          team_member_id?: string;
          to_bed?: string | null;
          to_room_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_allocation_history_team_member_id_fkey";
            columns: ["team_member_id"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_allocation_history_from_room_id_fkey";
            columns: ["from_room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_allocation_history_to_room_id_fkey";
            columns: ["to_room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_set_user_role: {
        Args: {
          grant_role: boolean;
          target_role: Database["public"]["Enums"]["app_role"];
          target_user_id: string;
        };
        Returns: undefined;
      };
      can_manage: { Args: { _user_id: string }; Returns: boolean };
      can_operate: { Args: { _user_id: string }; Returns: boolean };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "administrator" | "manager" | "housekeeping" | "read_only";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrator", "manager", "housekeeping", "read_only"],
    },
  },
} as const;
