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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      menu_items: {
        Row: {
          category: string
          description_en: string | null
          description_th: string | null
          id: string
          image_url: string | null
          ingredients_en: string | null
          ingredients_th: string | null
          is_visible: boolean
          name_en: string
          name_th: string
          price: number
          sort_order: number | null
        }
        Insert: {
          category: string
          description_en?: string | null
          description_th?: string | null
          id?: string
          image_url?: string | null
          ingredients_en?: string | null
          ingredients_th?: string | null
          is_visible?: boolean
          name_en: string
          name_th: string
          price: number
          sort_order?: number | null
        }
        Update: {
          category?: string
          description_en?: string | null
          description_th?: string | null
          id?: string
          image_url?: string | null
          ingredients_en?: string | null
          ingredients_th?: string | null
          is_visible?: boolean
          name_en?: string
          name_th?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          contact_email: string | null
          created_at: string
          customer_name: string
          id: string
          party_size: number
          phone: string
          reservation_date: string
          status: Database["public"]["Enums"]["reservation_status"]
          table_id: string
          time_slot: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          customer_name: string
          id?: string
          party_size?: number
          phone: string
          reservation_date: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_id: string
          time_slot: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          party_size?: number
          phone?: string
          reservation_date?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_id?: string
          time_slot?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_info: {
        Row: {
          close_time: string | null
          created_at: string
          description_en: string | null
          description_th: string | null
          id: string
          name_en: string
          name_th: string
          open_time: string | null
          phone: string | null
          seating_info_en: string | null
          seating_info_th: string | null
          total_tables: number | null
          updated_at: string
          zone_info_en: string | null
          zone_info_th: string | null
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          id?: string
          name_en: string
          name_th: string
          open_time?: string | null
          phone?: string | null
          seating_info_en?: string | null
          seating_info_th?: string | null
          total_tables?: number | null
          updated_at?: string
          zone_info_en?: string | null
          zone_info_th?: string | null
        }
        Update: {
          close_time?: string | null
          created_at?: string
          description_en?: string | null
          description_th?: string | null
          id?: string
          name_en?: string
          name_th?: string
          open_time?: string | null
          phone?: string | null
          seating_info_en?: string | null
          seating_info_th?: string | null
          total_tables?: number | null
          updated_at?: string
          zone_info_en?: string | null
          zone_info_th?: string | null
        }
        Relationships: []
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          status: string
          table_number: number
          zone: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id: string
          status?: string
          table_number: number
          zone: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          status?: string
          table_number?: number
          zone?: string
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
      table_availability: {
        Row: {
          reservation_date: string | null
          table_id: string | null
          time_slot: string | null
        }
        Insert: {
          reservation_date?: string | null
          table_id?: string | null
          time_slot?: string | null
        }
        Update: {
          reservation_date?: string | null
          table_id?: string | null
          time_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      booked_slots: {
        Args: { _date: string }
        Returns: {
          table_id: string
          time_slot: string
        }[]
      }
      cancel_reservation_by_contact: {
        Args: { _email: string; _id: string; _phone: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reservations_by_contact: {
        Args: { _email: string; _phone: string }
        Returns: {
          contact_email: string
          created_at: string
          customer_name: string
          id: string
          party_size: number
          phone: string
          reservation_date: string
          status: Database["public"]["Enums"]["reservation_status"]
          table_id: string
          time_slot: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      reservation_status: "pending" | "confirmed" | "cancelled" | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      reservation_status: ["pending", "confirmed", "cancelled", "completed"],
    },
  },
} as const
