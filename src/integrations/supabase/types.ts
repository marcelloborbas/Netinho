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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          buyer: string | null
          carrier: string | null
          carrier_phone: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          company_name: string
          created_at: string
          deleted_at: string | null
          district: string | null
          email: string | null
          favorite: boolean
          id: string
          last_order_at: string | null
          notes: string | null
          phone: string | null
          seller_id: string
          state: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          buyer?: string | null
          carrier?: string | null
          carrier_phone?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_name: string
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          email?: string | null
          favorite?: boolean
          id?: string
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          seller_id?: string
          state?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          buyer?: string | null
          carrier?: string | null
          carrier_phone?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          email?: string | null
          favorite?: boolean
          id?: string
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          seller_id?: string
          state?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          application: string
          category: string
          code: string
          created_at: string
          discount_pct: number
          id: string
          line_total: number
          net_price: number
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          application?: string
          category?: string
          code: string
          created_at?: string
          discount_pct?: number
          id?: string
          line_total: number
          net_price: number
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          application?: string
          category?: string
          code?: string
          created_at?: string
          discount_pct?: number
          id?: string
          line_total?: number
          net_price?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer: string | null
          carrier: string | null
          created_at: string
          customer_id: string | null
          customer_snapshot: Json
          delivery: string | null
          id: string
          item_count: number
          kind: string
          notes: string | null
          number: number
          payment_term: string
          seller_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          buyer?: string | null
          carrier?: string | null
          created_at?: string
          customer_id?: string | null
          customer_snapshot?: Json
          delivery?: string | null
          id?: string
          item_count?: number
          kind?: string
          notes?: string | null
          number?: number
          payment_term: string
          seller_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          buyer?: string | null
          carrier?: string | null
          created_at?: string
          customer_id?: string | null
          customer_snapshot?: Json
          delivery?: string | null
          id?: string
          item_count?: number
          kind?: string
          notes?: string | null
          number?: number
          payment_term?: string
          seller_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          application: string
          brand: string | null
          category_id: string
          code: string
          created_at: string
          id: string
          price_30: number | null
          price_30_45_60: number | null
          price_30_45_60_75: number | null
          price_cash: number | null
          price_note: string | null
          refs: string
          search_text: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          application?: string
          brand?: string | null
          category_id: string
          code: string
          created_at?: string
          id?: string
          price_30?: number | null
          price_30_45_60?: number | null
          price_30_45_60_75?: number | null
          price_cash?: number | null
          price_note?: string | null
          refs?: string
          search_text?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          application?: string
          brand?: string | null
          category_id?: string
          code?: string
          created_at?: string
          id?: string
          price_30?: number | null
          price_30_45_60?: number | null
          price_30_45_60_75?: number | null
          price_cash?: number | null
          price_note?: string | null
          refs?: string
          search_text?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "seller"
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
      app_role: ["admin", "seller"],
    },
  },
} as const
