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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asistentes: {
        Row: {
          categoria: string | null
          creado_en: string | null
          email: string
          empresa: string | null
          id: string
          nombre: string
          qr_token: string
          ticket_id: string
          usos_disponibles: number | null
        }
        Insert: {
          categoria?: string | null
          creado_en?: string | null
          email: string
          empresa?: string | null
          id?: string
          nombre: string
          qr_token: string
          ticket_id: string
          usos_disponibles?: number | null
        }
        Update: {
          categoria?: string | null
          creado_en?: string | null
          email?: string
          empresa?: string | null
          id?: string
          nombre?: string
          qr_token?: string
          ticket_id?: string
          usos_disponibles?: number | null
        }
        Relationships: []
      }
      attendees: {
        Row: {
          category_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          qr_code: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          qr_code?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          qr_code?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_controls: {
        Row: {
          category_id: string
          control_type_id: string
          created_at: string
          id: string
          max_uses: number | null
        }
        Insert: {
          category_id: string
          control_type_id: string
          created_at?: string
          id?: string
          max_uses?: number | null
        }
        Update: {
          category_id?: string
          control_type_id?: string
          created_at?: string
          id?: string
          max_uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_controls_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_controls_control_type_id_fkey"
            columns: ["control_type_id"]
            isOneToOne: false
            referencedRelation: "control_types"
            referencedColumns: ["id"]
          },
        ]
      }
      control_types: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          requires_control_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          requires_control_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          requires_control_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_types_requires_control_id_fkey"
            columns: ["requires_control_id"]
            isOneToOne: false
            referencedRelation: "control_types"
            referencedColumns: ["id"]
          },
        ]
      }
      control_usage: {
        Row: {
          attendee_id: string
          control_type_id: string
          device: string | null
          id: string
          notes: string | null
          used_at: string
        }
        Insert: {
          attendee_id: string
          control_type_id: string
          device?: string | null
          id?: string
          notes?: string | null
          used_at?: string
        }
        Update: {
          attendee_id?: string
          control_type_id?: string
          device?: string | null
          id?: string
          notes?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_usage_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_usage_control_type_id_fkey"
            columns: ["control_type_id"]
            isOneToOne: false
            referencedRelation: "control_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_configs: {
        Row: {
          accent_color: string | null
          created_at: string
          event_image_url: string | null
          event_name: string
          font_family: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          event_image_url?: string | null
          event_name: string
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          event_image_url?: string | null
          event_name?: string
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      logs_entrada: {
        Row: {
          fecha_ingreso: string | null
          id: string
          punto_control: string | null
          qr_token: string
        }
        Insert: {
          fecha_ingreso?: string | null
          id?: string
          punto_control?: string | null
          qr_token: string
        }
        Update: {
          fecha_ingreso?: string | null
          id?: string
          punto_control?: string | null
          qr_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_entrada_qr_token_fkey"
            columns: ["qr_token"]
            isOneToOne: false
            referencedRelation: "asistentes"
            referencedColumns: ["qr_token"]
          },
        ]
      }
      profiles: {
        Row: {
          attendee_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          attendee_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          attendee_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_templates: {
        Row: {
          category_id: string
          created_at: string
          id: string
          pattern: string
          prefix: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          pattern?: string
          prefix?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          pattern?: string
          prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          accessed_at: string
          created_at: string
          details: Json | null
          id: string
          operation_type: string
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          operation_type: string
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          operation_type?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          email: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ticket_templates: {
        Row: {
          created_at: string
          custom_fields: Json | null
          event_config_id: string | null
          font_size_info: number
          font_size_name: number
          id: string
          layout: string
          margin_bottom: number
          margin_left: number
          margin_right: number
          margin_top: number
          name: string
          qr_size: number
          show_category: boolean
          show_email: boolean
          show_name: boolean
          show_qr: boolean
          show_ticket_id: boolean
          tickets_per_page: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          event_config_id?: string | null
          font_size_info?: number
          font_size_name?: number
          id?: string
          layout?: string
          margin_bottom?: number
          margin_left?: number
          margin_right?: number
          margin_top?: number
          name: string
          qr_size?: number
          show_category?: boolean
          show_email?: boolean
          show_name?: boolean
          show_qr?: boolean
          show_ticket_id?: boolean
          tickets_per_page?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          event_config_id?: string | null
          font_size_info?: number
          font_size_name?: number
          id?: string
          layout?: string
          margin_bottom?: number
          margin_left?: number
          margin_right?: number
          margin_top?: number
          name?: string
          qr_size?: number
          show_category?: boolean
          show_email?: boolean
          show_name?: boolean
          show_qr?: boolean
          show_ticket_id?: boolean
          tickets_per_page?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_event_config_id_fkey"
            columns: ["event_config_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      find_attendee_by_ticket: {
        Args: { ticket_id: string }
        Returns: {
          category_id: string
          created_at: string
          email: string
          id: string
          name: string
          qr_code: string
          status: string
          ticket_id: string
          updated_at: string
        }[]
      }
      find_attendee_by_ticket_public: {
        Args: { ticket_id: string }
        Returns: {
          category_id: string
          created_at: string
          email: string
          id: string
          name: string
          qr_code: string
          status: string
          ticket_id: string
          updated_at: string
        }[]
      }
      generate_qr_code: {
        Args: { p_category_id: string }
        Returns: string
      }
      get_active_event_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          accent_color: string
          event_image_url: string
          event_name: string
          font_family: string
          id: string
          logo_url: string
          primary_color: string
          secondary_color: string
        }[]
      }
      get_asistentes_security_report: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_count_24h: number
          last_access: string
          recommendations: string[]
          security_status: string
          total_records: number
          unique_users_accessed_24h: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      validar_ticket: {
        Args: { punto?: string; qr: string }
        Returns: string
      }
      validate_control_access: {
        Args: { p_control_type_id: string; p_ticket_id: string }
        Returns: {
          attendee_id: string
          can_access: boolean
          category_id: string
          current_uses: number
          error_message: string
          max_uses: number
        }[]
      }
      validate_control_access_public: {
        Args: { p_control_type_id: string; p_ticket_id: string }
        Returns: {
          attendee_id: string
          can_access: boolean
          category_id: string
          current_uses: number
          error_message: string
          max_uses: number
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "control" | "attendee" | "viewer"
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
      user_role: ["admin", "control", "attendee", "viewer"],
    },
  },
} as const
