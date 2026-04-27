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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          rate_limit: number
          scopes: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          rate_limit?: number
          scopes?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          rate_limit?: number
          scopes?: Json
          user_id?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          id: string
          response_time_ms: number
          status_code: number
          user_id: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          id?: string
          response_time_ms?: number
          status_code: number
          user_id: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          response_time_ms?: number
          status_code?: number
          user_id?: string
        }
        Relationships: []
      }
      bot_api_keys: {
        Row: {
          api_key_id: string
          bot_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          api_key_id: string
          bot_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          api_key_id?: string
          bot_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_attachments: {
        Row: {
          conversation_id: string
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          message_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          message_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          message_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          memory_tier: number | null
          role: string
          security_flag: string | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          memory_tier?: number | null
          role: string
          security_flag?: string | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          memory_tier?: number | null
          role?: string
          security_flag?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tag_links: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tag_links_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "conversation_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          model: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_design_entries: {
        Row: {
          category: Database["public"]["Enums"]["design_entry_category"]
          content: string
          created_at: string
          id: string
          parent_id: string | null
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["design_entry_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["design_entry_category"]
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["design_entry_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["design_entry_category"]
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["design_entry_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_design_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "game_design_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_design_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "game_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      game_projects: {
        Row: {
          created_at: string
          description: string | null
          genre: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
          vision_statement: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
          vision_statement?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          vision_statement?: string | null
        }
        Relationships: []
      }
      game_purchase_locks: {
        Row: {
          created_at: string
          id: string
          source: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source: string
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_saves: {
        Row: {
          created_at: string
          game_state: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_state?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_state?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          currency_type: string
          id: string
          metadata: Json | null
          source: string
          source_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          currency_type: string
          id?: string
          metadata?: Json | null
          source: string
          source_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          currency_type?: string
          id?: string
          metadata?: Json | null
          source?: string
          source_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      gunit_agents: {
        Row: {
          created_at: string
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      gunit_bots: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      gunit_improvements: {
        Row: {
          analysis: string
          created_at: string
          execution: string
          goal: string
          id: string
          improvement: string
          score: number
          user_id: string
        }
        Insert: {
          analysis?: string
          created_at?: string
          execution?: string
          goal: string
          id?: string
          improvement?: string
          score?: number
          user_id: string
        }
        Update: {
          analysis?: string
          created_at?: string
          execution?: string
          goal?: string
          id?: string
          improvement?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      gunit_memory: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      jackie_control_audit: {
        Row: {
          action_id: string | null
          actor: string
          args: Json | null
          command: string
          id: string
          message: string
          result: string
          ts: string
          user_id: string
        }
        Insert: {
          action_id?: string | null
          actor?: string
          args?: Json | null
          command: string
          id?: string
          message?: string
          result: string
          ts?: string
          user_id: string
        }
        Update: {
          action_id?: string | null
          actor?: string
          args?: Json | null
          command?: string
          id?: string
          message?: string
          result?: string
          ts?: string
          user_id?: string
        }
        Relationships: []
      }
      jackie_control_prefs: {
        Row: {
          model_override: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          model_override?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          model_override?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jackie_control_swarms: {
        Row: {
          goal: string
          id: string
          models: Json
          results: Json
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          goal: string
          id?: string
          models?: Json
          results?: Json
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          goal?: string
          id?: string
          models?: Json
          results?: Json
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jackie_memory: {
        Row: {
          category: string
          confidence: number
          created_at: string
          id: string
          key: string
          source_conversation_id: string | null
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          key: string
          source_conversation_id?: string | null
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          key?: string
          source_conversation_id?: string | null
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackie_memory_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      jackie_tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bots: {
        Row: {
          behavior_style: string
          created_at: string
          generated_code: string | null
          id: string
          language: string
          logic_modules: Json
          name: string
          platform: string
          purpose: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          behavior_style?: string
          created_at?: string
          generated_code?: string | null
          id?: string
          language?: string
          logic_modules?: Json
          name: string
          platform?: string
          purpose?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          behavior_style?: string
          created_at?: string
          generated_code?: string | null
          id?: string
          language?: string
          logic_modules?: Json
          name?: string
          platform?: string
          purpose?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      design_entry_category:
        | "lore"
        | "mechanic"
        | "unit"
        | "building"
        | "resource"
        | "tech_tree"
        | "faction"
        | "event"
        | "economy_rule"
        | "battle_system"
        | "alliance"
        | "monetization"
        | "quest"
        | "map"
        | "general"
      design_entry_status: "draft" | "approved" | "implemented"
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
      design_entry_category: [
        "lore",
        "mechanic",
        "unit",
        "building",
        "resource",
        "tech_tree",
        "faction",
        "event",
        "economy_rule",
        "battle_system",
        "alliance",
        "monetization",
        "quest",
        "map",
        "general",
      ],
      design_entry_status: ["draft", "approved", "implemented"],
    },
  },
} as const
