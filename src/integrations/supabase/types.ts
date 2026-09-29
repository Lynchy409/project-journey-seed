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
      bias_snapshots: {
        Row: {
          created_at: string
          id: string
          note: string | null
          tf_15m: string
          tf_1h: string
          tf_4h: string
          tf_5m: string
          user_id: string
          verdict: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          tf_15m: string
          tf_1h: string
          tf_4h: string
          tf_5m: string
          user_id: string
          verdict: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          tf_15m?: string
          tf_1h?: string
          tf_4h?: string
          tf_5m?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          id: string
          lesson: string | null
          steps: number | null
          updated_at: string
          user_id: string
          water_ml: number | null
          weight: number | null
          win: string | null
        }
        Insert: {
          created_at?: string
          date: string
          energy?: number | null
          id?: string
          lesson?: string | null
          steps?: number | null
          updated_at?: string
          user_id: string
          water_ml?: number | null
          weight?: number | null
          win?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          lesson?: string | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          water_ml?: number | null
          weight?: number | null
          win?: string | null
        }
        Relationships: []
      }
      day_entries: {
        Row: {
          created_at: string
          date: string
          day_type: string
          id: string
          note: string | null
          shift_type_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_type?: string
          id?: string
          note?: string | null
          shift_type_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_type?: string
          id?: string
          note?: string | null
          shift_type_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_entries_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      day_templates: {
        Row: {
          created_at: string
          day_type: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_type: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_type?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          created_at: string
          exercise: string
          id: string
          reps: number | null
          set_index: number
          user_id: string
          weight: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise: string
          id?: string
          reps?: number | null
          set_index?: number
          user_id: string
          weight?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise?: string
          id?: string
          reps?: number | null
          set_index?: number
          user_id?: string
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          box: number
          created_at: string
          deck: string
          due_on: string
          front: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          box?: number
          created_at?: string
          deck?: string
          due_on?: string
          front: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          box?: number
          created_at?: string
          deck?: string
          due_on?: string
          front?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number
          deadline: string | null
          horizon: string
          id: string
          metric: string | null
          parent_id: string | null
          pillar: string
          source: string
          status: string
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          deadline?: string | null
          horizon?: string
          id?: string
          metric?: string | null
          parent_id?: string | null
          pillar?: string
          source?: string
          status?: string
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          deadline?: string | null
          horizon?: string
          id?: string
          metric?: string | null
          parent_id?: string | null
          pillar?: string
          source?: string
          status?: string
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_statements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          pillar: string
          sort: number
          text: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          pillar?: string
          sort?: number
          text: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          pillar?: string
          sort?: number
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          date: string
          entry_type: string
          goal_id: string | null
          id: string
          is_lesson: boolean
          photo_url: string | null
          pillar: string
          pinned: boolean
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          entry_type?: string
          goal_id?: string | null
          id?: string
          is_lesson?: boolean
          photo_url?: string | null
          pillar?: string
          pinned?: boolean
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          entry_type?: string
          goal_id?: string | null
          id?: string
          is_lesson?: boolean
          photo_url?: string | null
          pillar?: string
          pinned?: boolean
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      match_decks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_pairs: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          left_text: string
          right_text: string
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          left_text: string
          right_text: string
          sort?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          left_text?: string
          right_text?: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_pairs_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "match_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      match_scores: {
        Row: {
          accuracy: number
          created_at: string
          date: string
          deck_id: string | null
          id: string
          pairs: number
          seconds: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          created_at?: string
          date?: string
          deck_id?: string | null
          id?: string
          pairs?: number
          seconds?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          date?: string
          deck_id?: string | null
          id?: string
          pairs?: number
          seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "match_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      momentum_days: {
        Row: {
          created_at: string
          date: string
          day_score: number
          id: string
          momentum: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_score?: number
          id?: string
          momentum?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_score?: number
          id?: string
          momentum?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          show_switch_on: boolean
          track_water: boolean
          track_weight: boolean
          units: string
          updated_at: string
          water_target_ml: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          show_switch_on?: boolean
          track_water?: boolean
          track_weight?: boolean
          units?: string
          updated_at?: string
          water_target_ml?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          show_switch_on?: boolean
          track_water?: boolean
          track_weight?: boolean
          units?: string
          updated_at?: string
          water_target_ml?: number
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          routine_id: string | null
          seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          name: string
          routine_id?: string | null
          seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          routine_id?: string | null
          seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_logs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_steps: {
        Row: {
          created_at: string
          cue: string | null
          id: string
          name: string
          routine_id: string
          seconds: number
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cue?: string | null
          id?: string
          name: string
          routine_id: string
          seconds?: number
          sort?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cue?: string | null
          id?: string
          name?: string
          routine_id?: string
          seconds?: number
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_steps_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kind: string
          name: string
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name: string
          sort?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          name?: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_types: {
        Row: {
          color: string
          created_at: string
          end_time: string | null
          id: string
          name: string
          sort: number
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          end_time?: string | null
          id?: string
          name: string
          sort?: number
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          end_time?: string | null
          id?: string
          name?: string
          sort?: number
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          kind: string
          minutes: number
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          minutes?: number
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          minutes?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      task_logs: {
        Row: {
          created_at: string
          date: string
          done: boolean
          id: string
          non_negotiable: boolean
          pillar: string
          template_task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          done?: boolean
          id?: string
          non_negotiable?: boolean
          pillar?: string
          template_task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          non_negotiable?: boolean
          pillar?: string
          template_task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_template_task_id_fkey"
            columns: ["template_task_id"]
            isOneToOne: false
            referencedRelation: "template_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          created_at: string
          id: string
          non_negotiable: boolean
          pillar: string
          sort: number
          template_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          non_negotiable?: boolean
          pillar?: string
          sort?: number
          template_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          non_negotiable?: boolean
          pillar?: string
          sort?: number
          template_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "day_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_rules: {
        Row: {
          created_at: string
          id: string
          sort: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort?: number
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort?: number
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          date: string
          direction: string
          emotions: string | null
          entry: number | null
          id: string
          notes: string | null
          outcome: string
          pair: string
          result_r: number | null
          rr: number | null
          screenshot_url: string | null
          stop: number | null
          strategy: string
          target: number | null
          time_of_trade: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          direction?: string
          emotions?: string | null
          entry?: number | null
          id?: string
          notes?: string | null
          outcome?: string
          pair: string
          result_r?: number | null
          rr?: number | null
          screenshot_url?: string | null
          stop?: number | null
          strategy?: string
          target?: number | null
          time_of_trade?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          direction?: string
          emotions?: string | null
          entry?: number | null
          id?: string
          notes?: string | null
          outcome?: string
          pair?: string
          result_r?: number | null
          rr?: number | null
          screenshot_url?: string | null
          stop?: number | null
          strategy?: string
          target?: number | null
          time_of_trade?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          id: string
          kind: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          name?: string
          notes?: string | null
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
      seed_user_defaults: { Args: { _user_id: string }; Returns: undefined }
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
