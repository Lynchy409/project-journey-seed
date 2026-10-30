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
      backtests: {
        Row: {
          created_at: string
          date: string
          id: string
          market: string | null
          period_end: string | null
          period_start: string | null
          question: string
          results: string | null
          rules: string | null
          timeframe: string | null
          updated_at: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          market?: string | null
          period_end?: string | null
          period_start?: string | null
          question: string
          results?: string | null
          rules?: string | null
          timeframe?: string | null
          updated_at?: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          market?: string | null
          period_end?: string | null
          period_start?: string | null
          question?: string
          results?: string | null
          rules?: string | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
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
          recovery: Json
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
          recovery?: Json
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
          recovery?: Json
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
      driver_logs: {
        Row: {
          created_at: string
          date: string
          driver_key: string
          evidence: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          driver_key: string
          evidence?: string
          id?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          driver_key?: string
          evidence?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          created_at: string
          details: Json
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
          details?: Json
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
          details?: Json
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
      fitness_plans: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          kind: string
          name: string
          notes: string
          steps: Json
          target: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          kind: string
          name: string
          notes?: string
          steps?: Json
          target?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          notes?: string
          steps?: Json
          target?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_preferences: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_tasks: {
        Row: {
          created_at: string
          date: string
          id: string
          slot: string
          source_key: string
          status: string
          template_id: string | null
          title: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          slot: string
          source_key: string
          status?: string
          template_id?: string | null
          title: string
          user_id?: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          slot?: string
          source_key?: string
          status?: string
          template_id?: string | null
          title?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fitness_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_tasks_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_templates: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          kind: string
          name: string
          payload: Json
          slot: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          kind: string
          name: string
          payload?: Json
          slot: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          payload?: Json
          slot?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
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
          tracking: Json
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
          tracking?: Json
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
          tracking?: Json
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
      inner_items: {
        Row: {
          created_at: string
          date: string | null
          done: boolean
          id: string
          kind: string
          max_score: number | null
          output: string | null
          score: number | null
          skill: string | null
          sort: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          done?: boolean
          id?: string
          kind?: string
          max_score?: number | null
          output?: string | null
          score?: number | null
          skill?: string | null
          sort?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          done?: boolean
          id?: string
          kind?: string
          max_score?: number | null
          output?: string | null
          score?: number | null
          skill?: string | null
          sort?: number
          title?: string
          updated_at?: string
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
      learning_progress: {
        Row: {
          created_at: string
          id: string
          item_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      little_wins: {
        Row: {
          created_at: string
          cue: string | null
          id: string
          minutes: number
          pillar: string
          sort: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cue?: string | null
          id?: string
          minutes?: number
          pillar?: string
          sort?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          cue?: string | null
          id?: string
          minutes?: number
          pillar?: string
          sort?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_inspections: {
        Row: {
          created_at: string
          date: string
          id: string
          improve: string | null
          investigate: string | null
          learnt: string | null
          market_view: string | null
          pair: string | null
          spotted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          improve?: string | null
          investigate?: string | null
          learnt?: string | null
          market_view?: string | null
          pair?: string | null
          spotted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          improve?: string | null
          investigate?: string | null
          learnt?: string | null
          market_view?: string | null
          pair?: string | null
          spotted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_decks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mode: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mode?: string
          name: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mode?: string
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
          mode: string
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
          mode?: string
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
          mode?: string
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
      spanish_activities: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          kind: string
          seconds: number
          task_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          date: string
          id?: string
          kind: string
          seconds?: number
          task_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          kind?: string
          seconds?: number
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spanish_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "spanish_items"
            referencedColumns: ["id"]
          },
        ]
      }
      spanish_items: {
        Row: {
          created_at: string
          data: Json
          id: string
          key: string
          kind: string
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          key: string
          kind: string
          revision?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          key?: string
          kind?: string
          revision?: number
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
          confirmation: string | null
          confirmation_tf: string | null
          created_at: string
          date: string
          direction: string
          emotions: string | null
          entry: number | null
          entry_tf: string | null
          exit_time: string | null
          external_lesson: string | null
          further_levels: Json | null
          htf_confluences: Json | null
          id: string
          market_did: string | null
          market_feeling: string | null
          news_events: Json | null
          notes: string | null
          outcome: string
          pair: string
          pair_feeling: string | null
          result_r: number | null
          rr: number | null
          screenshot_url: string | null
          setup: string | null
          source: string
          stop: number | null
          strategy: string
          target: number | null
          time_of_trade: string | null
          trend_context: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmation?: string | null
          confirmation_tf?: string | null
          created_at?: string
          date?: string
          direction?: string
          emotions?: string | null
          entry?: number | null
          entry_tf?: string | null
          exit_time?: string | null
          external_lesson?: string | null
          further_levels?: Json | null
          htf_confluences?: Json | null
          id?: string
          market_did?: string | null
          market_feeling?: string | null
          news_events?: Json | null
          notes?: string | null
          outcome?: string
          pair: string
          pair_feeling?: string | null
          result_r?: number | null
          rr?: number | null
          screenshot_url?: string | null
          setup?: string | null
          source?: string
          stop?: number | null
          strategy?: string
          target?: number | null
          time_of_trade?: string | null
          trend_context?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmation?: string | null
          confirmation_tf?: string | null
          created_at?: string
          date?: string
          direction?: string
          emotions?: string | null
          entry?: number | null
          entry_tf?: string | null
          exit_time?: string | null
          external_lesson?: string | null
          further_levels?: Json | null
          htf_confluences?: Json | null
          id?: string
          market_did?: string | null
          market_feeling?: string | null
          news_events?: Json | null
          notes?: string | null
          outcome?: string
          pair?: string
          pair_feeling?: string | null
          result_r?: number | null
          rr?: number | null
          screenshot_url?: string | null
          setup?: string | null
          source?: string
          stop?: number | null
          strategy?: string
          target?: number | null
          time_of_trade?: string | null
          trend_context?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_plans: {
        Row: {
          account_currency: string | null
          account_size: number | null
          allowed_strategies: string | null
          created_at: string
          id: string
          max_daily_loss: string | null
          medium_term_goal: string | null
          risk_per_trade: string | null
          routines: string | null
          short_term_goal: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_currency?: string | null
          account_size?: number | null
          allowed_strategies?: string | null
          created_at?: string
          id?: string
          max_daily_loss?: string | null
          medium_term_goal?: string | null
          risk_per_trade?: string | null
          routines?: string | null
          short_term_goal?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_currency?: string | null
          account_size?: number | null
          allowed_strategies?: string | null
          created_at?: string
          id?: string
          max_daily_loss?: string | null
          medium_term_goal?: string | null
          risk_per_trade?: string | null
          routines?: string | null
          short_term_goal?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      win_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          pillar: string
          title: string
          user_id: string
          win_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          pillar: string
          title: string
          user_id?: string
          win_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          pillar?: string
          title?: string
          user_id?: string
          win_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "win_logs_win_id_fkey"
            columns: ["win_id"]
            isOneToOne: false
            referencedRelation: "little_wins"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          details: Json
          id: string
          kind: string
          media: Json
          media_type: string | null
          media_url: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          details?: Json
          id?: string
          kind?: string
          media?: Json
          media_type?: string | null
          media_url?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          details?: Json
          id?: string
          kind?: string
          media?: Json
          media_type?: string | null
          media_url?: string | null
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
      commit_training_log: {
        Args: { p_edit?: boolean; p_id: string; p_sets: Json; p_workout: Json }
        Returns: string
      }
      delete_fitness_workout: { Args: { p_id: string }; Returns: undefined }
      move_fitness_task: {
        Args: { p_date: string; p_id: string; p_swap_id?: string }
        Returns: undefined
      }
      put_spanish_item: {
        Args: {
          p_data: Json
          p_id: string
          p_key: string
          p_kind: string
          p_revision: number
        }
        Returns: {
          created_at: string
          data: Json
          id: string
          key: string
          kind: string
          revision: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "spanish_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_spanish_activity: {
        Args: {
          p_data: Json
          p_date: string
          p_id: string
          p_kind: string
          p_seconds: number
          p_task_id?: string
        }
        Returns: string
      }
      remove_training_log: { Args: { p_id: string }; Returns: undefined }
      save_fitness_workout: {
        Args: {
          p_id: string
          p_sets: Json
          p_task_id?: string
          p_workout: Json
        }
        Returns: string
      }
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
