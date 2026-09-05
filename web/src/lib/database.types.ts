export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      collection_medals: {
        Row: {
          collection_id: string
          medal_id: string
        }
        Insert: {
          collection_id: string
          medal_id: string
        }
        Update: {
          collection_id?: string
          medal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_medals_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "medal_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_medals_medal_id_fkey"
            columns: ["medal_id"]
            isOneToOne: false
            referencedRelation: "medals"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_translations: {
        Row: {
          collection_id: string
          description: string | null
          locale: string
          name: string
        }
        Insert: {
          collection_id: string
          description?: string | null
          locale: string
          name: string
        }
        Update: {
          collection_id?: string
          description?: string | null
          locale?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_translations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "medal_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_events: {
        Row: {
          created_at: string
          id: string
          medal_id: string | null
          monument_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medal_id?: string | null
          monument_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medal_id?: string | null
          monument_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_medal_id_fkey"
            columns: ["medal_id"]
            isOneToOne: false
            referencedRelation: "medals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medal_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_premium: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_premium?: boolean
          name?: string
        }
        Relationships: []
      }
      medal_requirements: {
        Row: {
          medal_id: string
          monument_id: string
        }
        Insert: {
          medal_id: string
          monument_id: string
        }
        Update: {
          medal_id?: string
          monument_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medal_requirements_medal_id_fkey"
            columns: ["medal_id"]
            isOneToOne: false
            referencedRelation: "medals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medal_requirements_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
        ]
      }
      medal_translations: {
        Row: {
          description: string | null
          locale: string
          medal_id: string
          name: string
        }
        Insert: {
          description?: string | null
          locale: string
          medal_id: string
          name: string
        }
        Update: {
          description?: string | null
          locale?: string
          medal_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "medal_translations_medal_id_fkey"
            columns: ["medal_id"]
            isOneToOne: false
            referencedRelation: "medals"
            referencedColumns: ["id"]
          },
        ]
      }
      medals: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          points_reward: number
          tier: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          points_reward?: number
          tier: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          points_reward?: number
          tier?: string
        }
        Relationships: []
      }
      monument_periods: {
        Row: {
          description: string | null
          id: string
          monument_id: string
          order_index: number
          title: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          monument_id: string
          order_index?: number
          title: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          monument_id?: string
          order_index?: number
          title?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monument_periods_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
        ]
      }
      monument_translations: {
        Row: {
          description: string | null
          locale: string
          monument_id: string
          name: string
        }
        Insert: {
          description?: string | null
          locale: string
          monument_id: string
          name: string
        }
        Update: {
          description?: string | null
          locale?: string
          monument_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "monument_translations_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
        ]
      }
      monuments: {
        Row: {
          audio_url: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          location: unknown
          mind_target_url: string | null
          name: string
          published: boolean
          reference_image_url: string | null
          script_url: string | null
          tags: string[] | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location: unknown
          mind_target_url?: string | null
          name: string
          published?: boolean
          reference_image_url?: string | null
          script_url?: string | null
          tags?: string[] | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: unknown
          mind_target_url?: string | null
          name?: string
          published?: boolean
          reference_image_url?: string | null
          script_url?: string | null
          tags?: string[] | null
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public: boolean
          locale: string
          total_points: number
          verified_visit_count: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_public?: boolean
          locale?: string
          total_points?: number
          verified_visit_count?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public?: boolean
          locale?: string
          total_points?: number
          verified_visit_count?: number
        }
        Relationships: []
      }
      user_medals: {
        Row: {
          earned_at: string
          medal_id: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          medal_id: string
          user_id: string
        }
        Update: {
          earned_at?: string
          medal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_medals_medal_id_fkey"
            columns: ["medal_id"]
            isOneToOne: false
            referencedRelation: "medals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_medals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          id: string
          monument_id: string
          user_id: string
          verified_geo: boolean
          verified_image: boolean
          visited_at: string
        }
        Insert: {
          id?: string
          monument_id: string
          user_id: string
          verified_geo?: boolean
          verified_image?: boolean
          visited_at?: string
        }
        Update: {
          id?: string
          monument_id?: string
          user_id?: string
          verified_geo?: boolean
          verified_image?: boolean
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_visit_verification: {
        Args: { p_attempt_id: string; p_monument_id: string; p_user_id: string }
        Returns: boolean
      }
      feed_for_me_rich: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          id: string
          medal_id: string
          medal_name: string
          monument_id: string
          monument_name: string
          type: string
          user_avatar: string
          user_id: string
          user_name: string
        }[]
      }
      get_collection_monuments: {
        Args: { p_collection_id: string; p_limit?: number }
        Returns: {
          id: string
          name: string
          reference_image_url: string
        }[]
      }
      get_collections_progress: {
        Args: never
        Returns: {
          collection_description: string
          collection_id: string
          collection_name: string
          earned_at: string
          medal_id: string
          medal_name: string
          medal_tier: string
          points_reward: number
          total_monuments: number
          visited_monuments: number
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          medal_count: number
          rank: number
          total_points: number
          user_id: string
          visit_count: number
        }[]
      }
      get_monument_by_id: {
        Args: { p_id: string }
        Returns: {
          audio_url: string
          built_year: number
          city: string
          country: string
          description: string
          id: string
          lat: number
          lng: number
          mind_target_url: string
          name: string
          reference_image_url: string
          video_url: string
        }[]
      }
      get_my_rank: { Args: never; Returns: number }
      monument_within: {
        Args: {
          p_lat: number
          p_lng: number
          p_monument_id: string
          p_radius_m?: number
        }
        Returns: boolean
      }
      monuments_all: {
        Args: never
        Returns: {
          audio_url: string
          built_year: number
          city: string
          country: string
          description: string
          id: string
          lat: number
          lng: number
          mind_target_url: string
          name: string
          reference_image_url: string
          video_url: string
        }[]
      }
      monuments_nearby: {
        Args: {
          p_lat: number
          p_lng: number
          p_only_unvisited?: boolean
          p_radius_m?: number
        }
        Returns: {
          audio_url: string
          built_year: number
          city: string
          country: string
          distance_m: number
          id: string
          lat: number
          lng: number
          mind_target_url: string
          name: string
          reference_image_url: string
          video_url: string
        }[]
      }
      search_profiles: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          is_following: boolean
          total_points: number
        }[]
      }
      start_visit_verification: {
        Args: { p_monument_id: string; p_user_id: string }
        Returns: {
          attempt_expires_at: string
          attempt_id: string
        }[]
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

