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
      ai_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          created_at: string
          date: string
          id: string
          mood: number
          note: string | null
          triggers: string[]
          urge: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mood: number
          note?: string | null
          triggers?: string[]
          urge: number
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mood?: number
          note?: string | null
          triggers?: string[]
          urge?: number
          user_id?: string
        }
        Relationships: []
      }
      contact_events: {
        Row: {
          created_at: string
          id: string
          mood: number | null
          note: string | null
          occurred_at: string
          previous_streak_seconds: number | null
          trigger: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood?: number | null
          note?: string | null
          occurred_at?: string
          previous_streak_seconds?: number | null
          trigger?: string | null
          type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: number | null
          note?: string | null
          occurred_at?: string
          previous_streak_seconds?: number | null
          trigger?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acquisition_source: string | null
          age: number | null
          best_streak_seconds: number
          coach_tone: string
          commitment_at: string | null
          created_at: string
          current_feelings: string[]
          difficulty_level: string | null
          difficulty_score: number | null
          dominant_emotion: string | null
          ended_by: string | null
          first_breakup: boolean | null
          gender: string | null
          id: string
          language: string
          last_contact_at: string | null
          last_contact_feelings: string[]
          last_contact_range: string | null
          motivation: string | null
          name: string | null
          no_contact_goal: string | null
          no_contact_rules: string[]
          onboarding_completed: boolean
          onboarding_step: number
          reasons: string[]
          relationship_duration: string | null
          reminder_enabled: boolean
          reminder_time: string
          score_computed_at: string | null
          score_factors: Json | null
          situation_type: string | null
          triggers: string[]
        }
        Insert: {
          acquisition_source?: string | null
          age?: number | null
          best_streak_seconds?: number
          coach_tone?: string
          commitment_at?: string | null
          created_at?: string
          current_feelings?: string[]
          difficulty_level?: string | null
          difficulty_score?: number | null
          dominant_emotion?: string | null
          ended_by?: string | null
          first_breakup?: boolean | null
          gender?: string | null
          id: string
          language?: string
          last_contact_at?: string | null
          last_contact_feelings?: string[]
          last_contact_range?: string | null
          motivation?: string | null
          name?: string | null
          no_contact_goal?: string | null
          no_contact_rules?: string[]
          onboarding_completed?: boolean
          onboarding_step?: number
          reasons?: string[]
          relationship_duration?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          score_computed_at?: string | null
          score_factors?: Json | null
          situation_type?: string | null
          triggers?: string[]
        }
        Update: {
          acquisition_source?: string | null
          age?: number | null
          best_streak_seconds?: number
          coach_tone?: string
          commitment_at?: string | null
          created_at?: string
          current_feelings?: string[]
          difficulty_level?: string | null
          difficulty_score?: number | null
          dominant_emotion?: string | null
          ended_by?: string | null
          first_breakup?: boolean | null
          gender?: string | null
          id?: string
          language?: string
          last_contact_at?: string | null
          last_contact_feelings?: string[]
          last_contact_range?: string | null
          motivation?: string | null
          name?: string | null
          no_contact_goal?: string | null
          no_contact_rules?: string[]
          onboarding_completed?: boolean
          onboarding_step?: number
          reasons?: string[]
          relationship_duration?: string | null
          reminder_enabled?: boolean
          reminder_time?: string
          score_computed_at?: string | null
          score_factors?: Json | null
          situation_type?: string | null
          triggers?: string[]
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          is_premium: boolean | null
          plan: string | null
          status: string
          updated_at: string
          user_id: string
          whop_membership_id: string | null
          whop_status: string | null
          whop_synced_at: string | null
          whop_user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          is_premium?: boolean | null
          plan?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whop_membership_id?: string | null
          whop_status?: string | null
          whop_synced_at?: string | null
          whop_user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          is_premium?: boolean | null
          plan?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whop_membership_id?: string | null
          whop_status?: string | null
          whop_synced_at?: string | null
          whop_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_ai_usage: {
        Args: { _day: string; _user: string }
        Returns: number
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
    Enums: {},
  },
} as const
