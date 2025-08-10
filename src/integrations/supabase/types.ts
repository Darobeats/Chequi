export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
          id: string
          ticket_id: string
          name: string
          email: string
          company: string
          category_id: string
          status: string
          qr_code: string
          created_at: string
          updated_at: string
        }[]
      }
      find_attendee_by_ticket_public: {
        Args: { ticket_id: string }
        Returns: {
          id: string
          ticket_id: string
          name: string
          email: string
          company: string
          category_id: string
          status: string
          qr_code: string
          created_at: string
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
          id: string
          event_name: string
          primary_color: string
          secondary_color: string
          accent_color: string
          logo_url: string
          event_image_url: string
          font_family: string
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
      validar_ticket: {
        Args: { qr: string; punto?: string }
        Returns: string
      }
      validate_control_access: {
        Args: { p_ticket_id: string; p_control_type_id: string }
        Returns: {
          can_access: boolean
          attendee_id: string
          category_id: string
          max_uses: number
          current_uses: number
          error_message: string
        }[]
      }
      validate_control_access_public: {
        Args: { p_ticket_id: string; p_control_type_id: string }
        Returns: {
          can_access: boolean
          attendee_id: string
          category_id: string
          max_uses: number
          current_uses: number
          error_message: string
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "control" | "attendee"
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
      user_role: ["admin", "control", "attendee"],
    },
  },
} as const
