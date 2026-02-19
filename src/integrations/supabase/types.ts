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
      attendees: {
        Row: {
          category_id: string
          cedula: string | null
          created_at: string
          event_id: string
          id: string
          name: string
          qr_code: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          cedula?: string | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          qr_code?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          cedula?: string | null
          created_at?: string
          event_id?: string
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
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
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
      cedula_access_logs: {
        Row: {
          access_result: string
          created_at: string | null
          denial_reason: string | null
          device_info: string | null
          event_id: string
          id: string
          nombre_detectado: string | null
          numero_cedula: string
          scanned_by: string | null
        }
        Insert: {
          access_result: string
          created_at?: string | null
          denial_reason?: string | null
          device_info?: string | null
          event_id: string
          id?: string
          nombre_detectado?: string | null
          numero_cedula: string
          scanned_by?: string | null
        }
        Update: {
          access_result?: string
          created_at?: string | null
          denial_reason?: string | null
          device_info?: string | null
          event_id?: string
          id?: string
          nombre_detectado?: string | null
          numero_cedula?: string
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cedula_access_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      cedula_control_usage: {
        Row: {
          control_type_id: string
          created_at: string
          device: string | null
          event_id: string
          id: string
          notes: string | null
          numero_cedula: string
          scanned_by: string | null
          used_at: string
        }
        Insert: {
          control_type_id: string
          created_at?: string
          device?: string | null
          event_id: string
          id?: string
          notes?: string | null
          numero_cedula: string
          scanned_by?: string | null
          used_at?: string
        }
        Update: {
          control_type_id?: string
          created_at?: string
          device?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          numero_cedula?: string
          scanned_by?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cedula_control_usage_control_type_id_fkey"
            columns: ["control_type_id"]
            isOneToOne: false
            referencedRelation: "control_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cedula_control_usage_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      cedula_registros: {
        Row: {
          created_at: string
          device_info: string | null
          event_id: string
          fecha_expedicion: string | null
          fecha_nacimiento: string | null
          id: string
          lugar_expedicion: string | null
          nombre_completo: string | null
          nombres: string
          numero_cedula: string
          primer_apellido: string
          raw_data: string | null
          rh: string | null
          scanned_at: string
          scanned_by: string | null
          segundo_apellido: string | null
          sexo: string | null
          was_on_whitelist: boolean | null
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          event_id: string
          fecha_expedicion?: string | null
          fecha_nacimiento?: string | null
          id?: string
          lugar_expedicion?: string | null
          nombre_completo?: string | null
          nombres: string
          numero_cedula: string
          primer_apellido: string
          raw_data?: string | null
          rh?: string | null
          scanned_at?: string
          scanned_by?: string | null
          segundo_apellido?: string | null
          sexo?: string | null
          was_on_whitelist?: boolean | null
        }
        Update: {
          created_at?: string
          device_info?: string | null
          event_id?: string
          fecha_expedicion?: string | null
          fecha_nacimiento?: string | null
          id?: string
          lugar_expedicion?: string | null
          nombre_completo?: string | null
          nombres?: string
          numero_cedula?: string
          primer_apellido?: string
          raw_data?: string | null
          rh?: string | null
          scanned_at?: string
          scanned_by?: string | null
          segundo_apellido?: string | null
          sexo?: string | null
          was_on_whitelist?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cedula_registros_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      cedulas_autorizadas: {
        Row: {
          categoria: string | null
          created_at: string | null
          created_by: string | null
          empresa: string | null
          event_id: string
          id: string
          nombre_completo: string | null
          notas: string | null
          numero_cedula: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa?: string | null
          event_id: string
          id?: string
          nombre_completo?: string | null
          notas?: string | null
          numero_cedula: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa?: string | null
          event_id?: string
          id?: string
          nombre_completo?: string | null
          notas?: string | null
          numero_cedula?: string
        }
        Relationships: [
          {
            foreignKeyName: "cedulas_autorizadas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      control_types: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          event_id: string
          icon: string | null
          id: string
          name: string
          requires_control_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          icon?: string | null
          id?: string
          name: string
          requires_control_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          icon?: string | null
          id?: string
          name?: string
          requires_control_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "control_usage_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees_public"
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
          background_opacity: number | null
          background_url: string | null
          created_at: string
          event_date: string | null
          event_image_url: string | null
          event_name: string
          event_status: string | null
          font_family: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          primary_color: string | null
          require_whitelist: boolean | null
          secondary_color: string | null
          sponsor_logos: Json | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          accent_color?: string | null
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          event_date?: string | null
          event_image_url?: string | null
          event_name: string
          event_status?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          require_whitelist?: boolean | null
          secondary_color?: string | null
          sponsor_logos?: Json | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          accent_color?: string | null
          background_opacity?: number | null
          background_url?: string | null
          created_at?: string
          event_date?: string | null
          event_image_url?: string | null
          event_name?: string
          event_status?: string | null
          font_family?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          require_whitelist?: boolean | null
          secondary_color?: string | null
          sponsor_logos?: Json | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          attendee_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          attendee_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          attendee_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
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
          {
            foreignKeyName: "profiles_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees_public"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_templates: {
        Row: {
          category_id: string
          created_at: string
          event_id: string
          id: string
          pattern: string
          prefix: string
        }
        Insert: {
          category_id: string
          created_at?: string
          event_id: string
          id?: string
          pattern?: string
          prefix?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          event_id?: string
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
          {
            foreignKeyName: "qr_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
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
          event_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          background_image_url: string | null
          background_mode: string | null
          background_opacity: number | null
          canvas_height: number | null
          canvas_width: number | null
          created_at: string
          custom_fields: Json | null
          elements: Json | null
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
          use_visual_editor: boolean | null
        }
        Insert: {
          background_image_url?: string | null
          background_mode?: string | null
          background_opacity?: number | null
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string
          custom_fields?: Json | null
          elements?: Json | null
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
          use_visual_editor?: boolean | null
        }
        Update: {
          background_image_url?: string | null
          background_mode?: string | null
          background_opacity?: number | null
          canvas_height?: number | null
          canvas_width?: number | null
          created_at?: string
          custom_fields?: Json | null
          elements?: Json | null
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
          use_visual_editor?: boolean | null
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
      user_event_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          event_id: string
          id: string
          is_primary: boolean | null
          role_in_event: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id: string
          id?: string
          is_primary?: boolean | null
          role_in_event?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id?: string
          id?: string
          is_primary?: boolean | null
          role_in_event?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      attendees_public: {
        Row: {
          category_id: string | null
          created_at: string | null
          event_id: string | null
          id: string | null
          name: string | null
          qr_code: string | null
          status: string | null
          ticket_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          name?: string | null
          qr_code?: string | null
          status?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          name?: string | null
          qr_code?: string | null
          status?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      auth_uid: { Args: never; Returns: string }
      can_access_dashboard: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      can_access_scanner: { Args: { check_user_id?: string }; Returns: boolean }
      can_manage_event_team: {
        Args: { check_event_id: string; check_user_id?: string }
        Returns: boolean
      }
      can_modify_data: { Args: { check_user_id?: string }; Returns: boolean }
      check_cedula_control_limit: {
        Args: {
          p_control_type_id: string
          p_event_id: string
          p_numero_cedula: string
        }
        Returns: {
          can_access: boolean
          current_uses: number
          error_message: string
          max_uses: number
        }[]
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
          id: string
          name: string
          qr_code: string
          status: string
          ticket_id: string
          updated_at: string
        }[]
      }
      generate_qr_code: { Args: { p_category_id: string }; Returns: string }
      get_active_event_config: {
        Args: never
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
      get_active_event_id: { Args: never; Returns: string }
      get_asistentes_security_report: {
        Args: never
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
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_events: {
        Args: { check_user_id?: string }
        Returns: {
          event_date: string
          event_id: string
          event_name: string
          event_status: string
          is_active: boolean
          is_primary: boolean
          role_in_event: string
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role_in_event: {
        Args: { check_event_id: string; check_user_id?: string }
        Returns: string
      }
      get_user_role_secure: {
        Args: { _user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
      is_super_admin: { Args: { check_user_id?: string }; Returns: boolean }
      user_can_access_event: {
        Args: { check_event_id: string; check_user_id?: string }
        Returns: boolean
      }
      user_has_role_secure: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validar_ticket: { Args: { punto?: string; qr: string }; Returns: string }
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
      user_role: "admin" | "control" | "attendee" | "viewer" | "scanner"
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
      user_role: ["admin", "control", "attendee", "viewer", "scanner"],
    },
  },
} as const
