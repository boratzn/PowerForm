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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          content_md: string
          created_at: string
          id: string
          is_read: boolean
          metrics: Json | null
          period_end: string
          period_start: string
          report_type: string
          user_id: string
        }
        Insert: {
          content_md: string
          created_at?: string
          id?: string
          is_read?: boolean
          metrics?: Json | null
          period_end: string
          period_start: string
          report_type: string
          user_id: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metrics?: Json | null
          period_end?: string
          period_start?: string
          report_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          agent: Database["public"]["Enums"]["agent_type"]
          cost_usd: number | null
          created_at: string
          id: string
          input_tokens: number
          model: string | null
          output_tokens: number
          user_id: string
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_type"]
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          user_id: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_type"]
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string | null
          output_tokens?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          arm_left_cm: number | null
          arm_right_cm: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string
          forearm_cm: number | null
          hip_cm: number | null
          id: string
          logged_on: string
          neck_cm: number | null
          shoulder_cm: number | null
          thigh_cm: number | null
          user_id: string
          waist_cm: number | null
        }
        Insert: {
          arm_left_cm?: number | null
          arm_right_cm?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          forearm_cm?: number | null
          hip_cm?: number | null
          id?: string
          logged_on?: string
          neck_cm?: number | null
          shoulder_cm?: number | null
          thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
        }
        Update: {
          arm_left_cm?: number | null
          arm_right_cm?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string
          forearm_cm?: number | null
          hip_cm?: number | null
          id?: string
          logged_on?: string
          neck_cm?: number | null
          shoulder_cm?: number | null
          thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_weight_logs: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          id: string
          logged_on: string
          note: string | null
          source: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          logged_on?: string
          note?: string | null
          source?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          id?: string
          logged_on?: string
          note?: string | null
          source?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_weight_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent: Database["public"]["Enums"]["agent_type"]
          created_at: string
          id: string
          is_archived: boolean
          last_message_at: string
          summary: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          agent?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          summary?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          summary?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_media: {
        Row: {
          attribution: string | null
          display_order: number
          exercise_id: string
          id: string
          is_active: boolean
          media_type: string
          thumbnail_url: string | null
          url: string
        }
        Insert: {
          attribution?: string | null
          display_order?: number
          exercise_id: string
          id?: string
          is_active?: boolean
          media_type: string
          thumbnail_url?: string | null
          url: string
        }
        Update: {
          attribution?: string | null
          display_order?: number
          exercise_id?: string
          id?: string
          is_active?: boolean
          media_type?: string
          thumbnail_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_media_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_muscles: {
        Row: {
          exercise_id: string
          muscle_group_id: string
          role: string
          volume_factor: number
        }
        Insert: {
          exercise_id: string
          muscle_group_id: string
          role: string
          volume_factor?: number
        }
        Update: {
          exercise_id?: string
          muscle_group_id?: string
          role?: string
          volume_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscles_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          common_mistakes_tr: string[] | null
          created_at: string
          created_by: string | null
          cues_tr: string[] | null
          difficulty: Database["public"]["Enums"]["experience_level"] | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          force: Database["public"]["Enums"]["force_type"] | null
          id: string
          instructions_en: string[] | null
          instructions_tr: string[] | null
          is_custom: boolean
          is_unilateral: boolean
          mechanic: Database["public"]["Enums"]["mechanic_type"] | null
          name_en: string
          name_tr: string | null
          search_vector: unknown
          slug: string
          source: string | null
          tracking_type: string
        }
        Insert: {
          common_mistakes_tr?: string[] | null
          created_at?: string
          created_by?: string | null
          cues_tr?: string[] | null
          difficulty?: Database["public"]["Enums"]["experience_level"] | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          force?: Database["public"]["Enums"]["force_type"] | null
          id?: string
          instructions_en?: string[] | null
          instructions_tr?: string[] | null
          is_custom?: boolean
          is_unilateral?: boolean
          mechanic?: Database["public"]["Enums"]["mechanic_type"] | null
          name_en: string
          name_tr?: string | null
          search_vector?: unknown
          slug: string
          source?: string | null
          tracking_type?: string
        }
        Update: {
          common_mistakes_tr?: string[] | null
          created_at?: string
          created_by?: string | null
          cues_tr?: string[] | null
          difficulty?: Database["public"]["Enums"]["experience_level"] | null
          equipment?: Database["public"]["Enums"]["equipment_type"]
          force?: Database["public"]["Enums"]["force_type"] | null
          id?: string
          instructions_en?: string[] | null
          instructions_tr?: string[] | null
          is_custom?: boolean
          is_unilateral?: boolean
          mechanic?: Database["public"]["Enums"]["mechanic_type"] | null
          name_en?: string
          name_tr?: string | null
          search_vector?: unknown
          slug?: string
          source?: string | null
          tracking_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_servings: {
        Row: {
          food_id: string
          grams: number
          id: string
          is_default: boolean
          label: string
        }
        Insert: {
          food_id: string
          grams: number
          id?: string
          is_default?: boolean
          label: string
        }
        Update: {
          food_id?: string
          grams?: number
          id?: string
          is_default?: boolean
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_servings_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          base_unit: string
          brand: string | null
          carbs_per_100: number
          created_at: string
          created_by: string | null
          external_id: string | null
          fat_per_100: number
          fiber_per_100: number | null
          id: string
          is_verified: boolean
          kcal_per_100: number
          name: string
          protein_per_100: number
          saturated_fat_per_100: number | null
          search_vector: unknown
          sodium_mg_per_100: number | null
          source: string
          sugar_per_100: number | null
        }
        Insert: {
          barcode?: string | null
          base_unit?: string
          brand?: string | null
          carbs_per_100?: number
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          fat_per_100?: number
          fiber_per_100?: number | null
          id?: string
          is_verified?: boolean
          kcal_per_100: number
          name: string
          protein_per_100?: number
          saturated_fat_per_100?: number | null
          search_vector?: unknown
          sodium_mg_per_100?: number | null
          source: string
          sugar_per_100?: number | null
        }
        Update: {
          barcode?: string | null
          base_unit?: string
          brand?: string | null
          carbs_per_100?: number
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          fat_per_100?: number
          fiber_per_100?: number | null
          id?: string
          is_verified?: boolean
          kcal_per_100?: number
          name?: string
          protein_per_100?: number
          saturated_fat_per_100?: number | null
          search_vector?: unknown
          sodium_mg_per_100?: number | null
          source?: string
          sugar_per_100?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "foods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_tool_calls: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          input: Json
          is_error: boolean
          message_id: string
          output: Json | null
          tool_name: string
          tool_use_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          input: Json
          is_error?: boolean
          message_id: string
          output?: Json | null
          tool_name: string
          tool_use_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          input?: Json
          is_error?: boolean
          message_id?: string
          output?: Json | null
          tool_name?: string
          tool_use_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_tool_calls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          error: string | null
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: Database["public"]["Enums"]["message_role"]
          stop_reason: string | null
          text_content: string | null
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: Database["public"]["Enums"]["message_role"]
          stop_reason?: string | null
          text_content?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: Database["public"]["Enums"]["message_role"]
          stop_reason?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      muscle_groups: {
        Row: {
          display_order: number
          id: string
          name_en: string
          name_tr: string
          region: string
        }
        Insert: {
          display_order?: number
          id: string
          name_en: string
          name_tr: string
          region: string
        }
        Update: {
          display_order?: number
          id?: string
          name_en?: string
          name_tr?: string
          region?: string
        }
        Relationships: []
      }
      nutrition_entries: {
        Row: {
          carbs_g: number
          client_uuid: string | null
          created_at: string
          entered_via: string
          fat_g: number
          food_id: string | null
          food_name_snapshot: string
          id: string
          kcal: number
          logged_on: string
          meal: Database["public"]["Enums"]["meal_type"]
          protein_g: number
          quantity_g: number
          serving_label: string | null
          user_id: string
        }
        Insert: {
          carbs_g?: number
          client_uuid?: string | null
          created_at?: string
          entered_via?: string
          fat_g?: number
          food_id?: string | null
          food_name_snapshot: string
          id?: string
          kcal: number
          logged_on?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          protein_g?: number
          quantity_g: number
          serving_label?: string | null
          user_id: string
        }
        Update: {
          carbs_g?: number
          client_uuid?: string | null
          created_at?: string
          entered_via?: string
          fat_g?: number
          food_id?: string | null
          food_name_snapshot?: string
          id?: string
          kcal?: number
          logged_on?: string
          meal?: Database["public"]["Enums"]["meal_type"]
          protein_g?: number
          quantity_g?: number
          serving_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_targets: {
        Row: {
          carbs_g: number | null
          created_at: string
          effective_from: string
          fat_g: number | null
          id: string
          kcal: number
          method: string | null
          protein_g: number
          surplus_kcal: number | null
          tdee_estimate: number | null
          user_id: string
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          effective_from?: string
          fat_g?: number | null
          id?: string
          kcal: number
          method?: string | null
          protein_g: number
          surplus_kcal?: number | null
          tdee_estimate?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          effective_from?: string
          fat_g?: number | null
          id?: string
          kcal?: number
          method?: string | null
          protein_g?: number
          surplus_kcal?: number | null
          tdee_estimate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          exercise_id: string
          id: string
          record_type: string
          reps: number | null
          session_set_id: string | null
          user_id: string
          value: number
          weight_kg: number | null
        }
        Insert: {
          achieved_at?: string
          exercise_id: string
          id?: string
          record_type: string
          reps?: number | null
          session_set_id?: string | null
          user_id: string
          value: number
          weight_kg?: number | null
        }
        Update: {
          achieved_at?: string
          exercise_id?: string
          id?: string
          record_type?: string
          reps?: number | null
          session_set_id?: string | null
          user_id?: string
          value?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_session_set_id_fkey"
            columns: ["session_set_id"]
            isOneToOne: false
            referencedRelation: "session_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_equipment:
            | Database["public"]["Enums"]["equipment_type"][]
            | null
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          display_name: string | null
          experience: Database["public"]["Enums"]["experience_level"]
          height_cm: number | null
          id: string
          injuries: string | null
          is_pro: boolean
          onboarding_done: boolean
          primary_goal: Database["public"]["Enums"]["goal_type"]
          sex: Database["public"]["Enums"]["sex_type"]
          timezone: string
          training_days_target: number | null
          units: Database["public"]["Enums"]["unit_system"]
          updated_at: string
        }
        Insert: {
          available_equipment?:
            | Database["public"]["Enums"]["equipment_type"][]
            | null
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          experience?: Database["public"]["Enums"]["experience_level"]
          height_cm?: number | null
          id: string
          injuries?: string | null
          is_pro?: boolean
          onboarding_done?: boolean
          primary_goal?: Database["public"]["Enums"]["goal_type"]
          sex?: Database["public"]["Enums"]["sex_type"]
          timezone?: string
          training_days_target?: number | null
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Update: {
          available_equipment?:
            | Database["public"]["Enums"]["equipment_type"][]
            | null
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          experience?: Database["public"]["Enums"]["experience_level"]
          height_cm?: number | null
          id?: string
          injuries?: string | null
          is_pro?: boolean
          onboarding_done?: boolean
          primary_goal?: Database["public"]["Enums"]["goal_type"]
          sex?: Database["public"]["Enums"]["sex_type"]
          timezone?: string
          training_days_target?: number | null
          units?: Database["public"]["Enums"]["unit_system"]
          updated_at?: string
        }
        Relationships: []
      }
      program_days: {
        Row: {
          day_index: number
          focus: string | null
          id: string
          name: string
          notes: string | null
          program_id: string
        }
        Insert: {
          day_index: number
          focus?: string | null
          id?: string
          name: string
          notes?: string | null
          program_id: string
        }
        Update: {
          day_index?: number
          focus?: string | null
          id?: string
          name?: string
          notes?: string | null
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          program_day_id: string
          rep_max: number | null
          rep_min: number | null
          rest_seconds: number | null
          superset_group: number | null
          target_rir: number | null
          target_sets: number
          tempo: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          program_day_id: string
          rep_max?: number | null
          rep_min?: number | null
          rest_seconds?: number | null
          superset_group?: number | null
          target_rir?: number | null
          target_sets: number
          tempo?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          program_day_id?: string
          rep_max?: number | null
          rep_min?: number | null
          rest_seconds?: number | null
          superset_group?: number | null
          target_rir?: number | null
          target_sets?: number
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          ai_conversation_id: string | null
          archived_at: string | null
          created_at: string
          created_by_ai: boolean
          days_per_week: number
          description: string | null
          duration_weeks: number | null
          goal: Database["public"]["Enums"]["goal_type"] | null
          id: string
          is_template: boolean
          name: string
          source_template_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["program_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_conversation_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by_ai?: boolean
          days_per_week: number
          description?: string | null
          duration_weeks?: number | null
          goal?: Database["public"]["Enums"]["goal_type"] | null
          id?: string
          is_template?: boolean
          name: string
          source_template_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_conversation_id?: string | null
          archived_at?: string | null
          created_at?: string
          created_by_ai?: boolean
          days_per_week?: number
          description?: string | null
          duration_weeks?: number | null
          goal?: Database["public"]["Enums"]["goal_type"] | null
          id?: string
          is_template?: boolean
          name?: string
          source_template_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          pose: string | null
          storage_path: string
          taken_on: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          pose?: string | null
          storage_path: string
          taken_on?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          pose?: string | null
          storage_path?: string
          taken_on?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          session_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          session_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_exercise_progress"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          completed_at: string
          distance_m: number | null
          duration_seconds: number | null
          e1rm: number | null
          id: string
          is_completed: boolean
          reps: number | null
          rir: number | null
          rpe: number | null
          session_exercise_id: string
          set_index: number
          set_type: Database["public"]["Enums"]["set_type"]
          volume_kg: number | null
          weight_kg: number | null
        }
        Insert: {
          completed_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          e1rm?: number | null
          id?: string
          is_completed?: boolean
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          session_exercise_id: string
          set_index: number
          set_type?: Database["public"]["Enums"]["set_type"]
          volume_kg?: number | null
          weight_kg?: number | null
        }
        Update: {
          completed_at?: string
          distance_m?: number | null
          duration_seconds?: number | null
          e1rm?: number | null
          id?: string
          is_completed?: boolean
          reps?: number | null
          rir?: number | null
          rpe?: number | null
          session_exercise_id?: string
          set_index?: number
          set_type?: Database["public"]["Enums"]["set_type"]
          volume_kg?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          bodyweight_kg: number | null
          client_uuid: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          name: string | null
          notes: string | null
          perceived_effort: number | null
          program_day_id: string | null
          program_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          synced_at: string | null
          user_id: string
        }
        Insert: {
          bodyweight_kg?: number | null
          client_uuid?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          perceived_effort?: number | null
          program_day_id?: string | null
          program_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          synced_at?: string | null
          user_id: string
        }
        Update: {
          bodyweight_kg?: number | null
          client_uuid?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          perceived_effort?: number | null
          program_day_id?: string | null
          program_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_daily_nutrition: {
        Row: {
          carbs_g: number | null
          entry_count: number | null
          fat_g: number | null
          kcal: number | null
          logged_on: string | null
          protein_g: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_exercise_progress: {
        Row: {
          avg_reps: number | null
          best_e1rm: number | null
          exercise_id: string | null
          performed_on: string | null
          session_id: string | null
          session_volume: number | null
          top_weight: number | null
          user_id: string | null
          working_sets: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_weekly_volume: {
        Row: {
          direct_sets: number | null
          effective_sets: number | null
          muscle_group_id: string | null
          muscle_name: string | null
          tonnage_kg: number | null
          user_id: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_weight_trend: {
        Row: {
          logged_on: string | null
          ma7_kg: number | null
          user_id: string | null
          weight_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_weight_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      agent_type:
        | "coach"
        | "program_architect"
        | "nutrition_logger"
        | "weekly_analyst"
      equipment_type:
        | "barbell"
        | "dumbbell"
        | "machine"
        | "cable"
        | "bodyweight"
        | "kettlebell"
        | "band"
        | "smith"
        | "other"
      experience_level: "beginner" | "intermediate" | "advanced"
      force_type: "push" | "pull" | "static"
      goal_type:
        | "hypertrophy"
        | "strength"
        | "fat_loss"
        | "recomp"
        | "general_health"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      mechanic_type: "compound" | "isolation"
      message_role: "user" | "assistant" | "system" | "tool"
      program_status: "draft" | "active" | "archived"
      session_status: "in_progress" | "completed" | "abandoned"
      set_type:
        | "normal"
        | "warmup"
        | "drop"
        | "myorep"
        | "failure"
        | "amrap"
        | "backoff"
      sex_type: "male" | "female" | "other" | "unspecified"
      unit_system: "metric" | "imperial"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agent_type: [
        "coach",
        "program_architect",
        "nutrition_logger",
        "weekly_analyst",
      ],
      equipment_type: [
        "barbell",
        "dumbbell",
        "machine",
        "cable",
        "bodyweight",
        "kettlebell",
        "band",
        "smith",
        "other",
      ],
      experience_level: ["beginner", "intermediate", "advanced"],
      force_type: ["push", "pull", "static"],
      goal_type: [
        "hypertrophy",
        "strength",
        "fat_loss",
        "recomp",
        "general_health",
      ],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      mechanic_type: ["compound", "isolation"],
      message_role: ["user", "assistant", "system", "tool"],
      program_status: ["draft", "active", "archived"],
      session_status: ["in_progress", "completed", "abandoned"],
      set_type: [
        "normal",
        "warmup",
        "drop",
        "myorep",
        "failure",
        "amrap",
        "backoff",
      ],
      sex_type: ["male", "female", "other", "unspecified"],
      unit_system: ["metric", "imperial"],
    },
  },
} as const
