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
      ai_insights: {
        Row: {
          advantage: Database["public"]["Enums"]["ai_advantage"] | null
          commentary: string | null
          confidence: Database["public"]["Enums"]["ai_confidence"]
          context_hash: string
          cost_usd: number | null
          created_at: string
          data_quality: Database["public"]["Enums"]["ai_data_quality"]
          data_timestamp: string
          expected_goals_range: unknown
          fixture_id: string | null
          id: string
          key_factors: Json | null
          league_id: string | null
          openai_model: string
          prediction_id: string | null
          prompt_version: string
          raw_output: Json
          scenarios: Json | null
          summary: string | null
          team_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          type: Database["public"]["Enums"]["ai_insight_type"]
          validated: boolean
          weaker_team_scoring_chance: number | null
          win_outcome: Database["public"]["Enums"]["ai_win_outcome"] | null
          win_probabilities: Json | null
        }
        Insert: {
          advantage?: Database["public"]["Enums"]["ai_advantage"] | null
          commentary?: string | null
          confidence: Database["public"]["Enums"]["ai_confidence"]
          context_hash: string
          cost_usd?: number | null
          created_at?: string
          data_quality: Database["public"]["Enums"]["ai_data_quality"]
          data_timestamp: string
          expected_goals_range?: unknown
          fixture_id?: string | null
          id?: string
          key_factors?: Json | null
          league_id?: string | null
          openai_model: string
          prediction_id?: string | null
          prompt_version: string
          raw_output: Json
          scenarios?: Json | null
          summary?: string | null
          team_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          type: Database["public"]["Enums"]["ai_insight_type"]
          validated?: boolean
          weaker_team_scoring_chance?: number | null
          win_outcome?: Database["public"]["Enums"]["ai_win_outcome"] | null
          win_probabilities?: Json | null
        }
        Update: {
          advantage?: Database["public"]["Enums"]["ai_advantage"] | null
          commentary?: string | null
          confidence?: Database["public"]["Enums"]["ai_confidence"]
          context_hash?: string
          cost_usd?: number | null
          created_at?: string
          data_quality?: Database["public"]["Enums"]["ai_data_quality"]
          data_timestamp?: string
          expected_goals_range?: unknown
          fixture_id?: string | null
          id?: string
          key_factors?: Json | null
          league_id?: string | null
          openai_model?: string
          prediction_id?: string | null
          prompt_version?: string
          raw_output?: Json
          scenarios?: Json | null
          summary?: string | null
          team_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          type?: Database["public"]["Enums"]["ai_insight_type"]
          validated?: boolean
          weaker_team_scoring_chance?: number | null
          win_outcome?: Database["public"]["Enums"]["ai_win_outcome"] | null
          win_probabilities?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          ai_deep_analyses_count: number
          ai_generations_count: number
          ai_predictions_count: number
          id: string
          last_live_ai_at: Json
          live_ai_matches: string[]
          updated_at: string
          usage_day: string
          user_id: string
        }
        Insert: {
          ai_deep_analyses_count?: number
          ai_generations_count?: number
          ai_predictions_count?: number
          id?: string
          last_live_ai_at?: Json
          live_ai_matches?: string[]
          updated_at?: string
          usage_day: string
          user_id: string
        }
        Update: {
          ai_deep_analyses_count?: number
          ai_generations_count?: number
          ai_predictions_count?: number
          id?: string
          last_live_ai_at?: Json
          live_ai_matches?: string[]
          updated_at?: string
          usage_day?: string
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string | null
          created_at: string
          flag_url: string | null
          id: string
          name: string
          provider_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          flag_url?: string | null
          id?: string
          name: string
          provider_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          flag_url?: string | null
          id?: string
          name?: string
          provider_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          premium_since: string | null
          premium_until: string | null
          subscription_id: string | null
          tier: Database["public"]["Enums"]["app_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          premium_since?: string | null
          premium_until?: string | null
          subscription_id?: string | null
          tier?: Database["public"]["Enums"]["app_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          premium_since?: string | null
          premium_until?: string | null
          subscription_id?: string | null
          tier?: Database["public"]["Enums"]["app_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          fixture_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fixture_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fixture_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fixture_events: {
        Row: {
          assist_player_id: string | null
          comments: string | null
          created_at: string
          detail: string | null
          extra_minute: number | null
          fixture_id: string
          id: string
          minute: number
          player_id: string | null
          provider_event_id: string | null
          provider_payload: Json | null
          team_id: string | null
          type: string
        }
        Insert: {
          assist_player_id?: string | null
          comments?: string | null
          created_at?: string
          detail?: string | null
          extra_minute?: number | null
          fixture_id: string
          id?: string
          minute: number
          player_id?: string | null
          provider_event_id?: string | null
          provider_payload?: Json | null
          team_id?: string | null
          type: string
        }
        Update: {
          assist_player_id?: string | null
          comments?: string | null
          created_at?: string
          detail?: string | null
          extra_minute?: number | null
          fixture_id?: string
          id?: string
          minute?: number
          player_id?: string | null
          provider_event_id?: string | null
          provider_payload?: Json | null
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixture_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_events_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fixture_sidelined_players: {
        Row: {
          created_at: string
          fixture_id: string
          id: string
          kind: string
          player_id: string | null
          player_name: string
          player_provider_id: number | null
          provider_payload: Json | null
          reason: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fixture_id: string
          id?: string
          kind: string
          player_id?: string | null
          player_name: string
          player_provider_id?: number | null
          provider_payload?: Json | null
          reason?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fixture_id?: string
          id?: string
          kind?: string
          player_id?: string | null
          player_name?: string
          player_provider_id?: number | null
          provider_payload?: Json | null
          reason?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixture_sidelined_players_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_sidelined_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_sidelined_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fixture_statistics: {
        Row: {
          ball_possession: number | null
          captured_at: string
          corners: number | null
          expected_goals: number | null
          fixture_id: string
          fouls: number | null
          goalkeeper_saves: number | null
          id: string
          offsides: number | null
          passes_accurate: number | null
          passes_percent: number | null
          provider_payload: Json | null
          red_cards: number | null
          shots_blocked: number | null
          shots_inside_box: number | null
          shots_off_target: number | null
          shots_on_target: number | null
          shots_outside_box: number | null
          shots_total: number | null
          team_id: string
          total_passes: number | null
          updated_at: string
          yellow_cards: number | null
        }
        Insert: {
          ball_possession?: number | null
          captured_at?: string
          corners?: number | null
          expected_goals?: number | null
          fixture_id: string
          fouls?: number | null
          goalkeeper_saves?: number | null
          id?: string
          offsides?: number | null
          passes_accurate?: number | null
          passes_percent?: number | null
          provider_payload?: Json | null
          red_cards?: number | null
          shots_blocked?: number | null
          shots_inside_box?: number | null
          shots_off_target?: number | null
          shots_on_target?: number | null
          shots_outside_box?: number | null
          shots_total?: number | null
          team_id: string
          total_passes?: number | null
          updated_at?: string
          yellow_cards?: number | null
        }
        Update: {
          ball_possession?: number | null
          captured_at?: string
          corners?: number | null
          expected_goals?: number | null
          fixture_id?: string
          fouls?: number | null
          goalkeeper_saves?: number | null
          id?: string
          offsides?: number | null
          passes_accurate?: number | null
          passes_percent?: number | null
          provider_payload?: Json | null
          red_cards?: number | null
          shots_blocked?: number | null
          shots_inside_box?: number | null
          shots_off_target?: number | null
          shots_on_target?: number | null
          shots_outside_box?: number | null
          shots_total?: number | null
          team_id?: string
          total_passes?: number | null
          updated_at?: string
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fixture_statistics_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixture_statistics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fixtures: {
        Row: {
          active_viewers: number
          away_team_id: string
          created_at: string
          et_away: number | null
          et_home: number | null
          ft_away: number | null
          ft_home: number | null
          home_team_id: string
          ht_away: number | null
          ht_home: number | null
          id: string
          is_live: boolean | null
          kickoff_at: string
          last_provider_sync_at: string | null
          league_id: string
          minute: number | null
          pen_away: number | null
          pen_home: number | null
          period_first_start_at: string | null
          period_second_start_at: string | null
          provider_id: number
          provider_payload: Json | null
          referee: string | null
          round: string | null
          score_away: number | null
          score_home: number | null
          season_id: string | null
          status: Database["public"]["Enums"]["fixture_status"]
          status_extra_minute: number | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          active_viewers?: number
          away_team_id: string
          created_at?: string
          et_away?: number | null
          et_home?: number | null
          ft_away?: number | null
          ft_home?: number | null
          home_team_id: string
          ht_away?: number | null
          ht_home?: number | null
          id?: string
          is_live?: boolean | null
          kickoff_at: string
          last_provider_sync_at?: string | null
          league_id: string
          minute?: number | null
          pen_away?: number | null
          pen_home?: number | null
          period_first_start_at?: string | null
          period_second_start_at?: string | null
          provider_id: number
          provider_payload?: Json | null
          referee?: string | null
          round?: string | null
          score_away?: number | null
          score_home?: number | null
          season_id?: string | null
          status?: Database["public"]["Enums"]["fixture_status"]
          status_extra_minute?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          active_viewers?: number
          away_team_id?: string
          created_at?: string
          et_away?: number | null
          et_home?: number | null
          ft_away?: number | null
          ft_home?: number | null
          home_team_id?: string
          ht_away?: number | null
          ht_home?: number | null
          id?: string
          is_live?: boolean | null
          kickoff_at?: string
          last_provider_sync_at?: string | null
          league_id?: string
          minute?: number | null
          pen_away?: number | null
          pen_home?: number | null
          period_first_start_at?: string | null
          period_second_start_at?: string | null
          provider_id?: number
          provider_payload?: Json | null
          referee?: string | null
          round?: string | null
          score_away?: number | null
          score_home?: number | null
          season_id?: string | null
          status?: Database["public"]["Enums"]["fixture_status"]
          status_extra_minute?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          object_type: Database["public"]["Enums"]["follow_object"]
          player_id: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          object_type: Database["public"]["Enums"]["follow_object"]
          player_id?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          object_type?: Database["public"]["Enums"]["follow_object"]
          player_id?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_snapshots: {
        Row: {
          captured_at: string
          clean_sheets: number | null
          draws: number | null
          failed_to_score: number | null
          goals_against: number | null
          goals_for: number | null
          id: string
          losses: number | null
          matches: number
          points: number | null
          ppg: number | null
          scope: string
          team_id: string
          wins: number | null
          xg_against: number | null
          xg_for: number | null
        }
        Insert: {
          captured_at?: string
          clean_sheets?: number | null
          draws?: number | null
          failed_to_score?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          matches: number
          points?: number | null
          ppg?: number | null
          scope: string
          team_id: string
          wins?: number | null
          xg_against?: number | null
          xg_for?: number | null
        }
        Update: {
          captured_at?: string
          clean_sheets?: number | null
          draws?: number | null
          failed_to_score?: number | null
          goals_against?: number | null
          goals_for?: number | null
          id?: string
          losses?: number | null
          matches?: number
          points?: number | null
          ppg?: number | null
          scope?: string
          team_id?: string
          wins?: number | null
          xg_against?: number | null
          xg_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      h2h_summaries: {
        Row: {
          captured_at: string
          draws: number | null
          id: string
          league_id: string | null
          scope: string
          team_a_goals: number | null
          team_a_id: string
          team_a_wins: number | null
          team_b_goals: number | null
          team_b_id: string
          team_b_wins: number | null
          window_size: number
        }
        Insert: {
          captured_at?: string
          draws?: number | null
          id?: string
          league_id?: string | null
          scope: string
          team_a_goals?: number | null
          team_a_id: string
          team_a_wins?: number | null
          team_b_goals?: number | null
          team_b_id: string
          team_b_wins?: number | null
          window_size: number
        }
        Update: {
          captured_at?: string
          draws?: number | null
          id?: string
          league_id?: string | null
          scope?: string
          team_a_goals?: number | null
          team_a_id?: string
          team_a_wins?: number | null
          team_b_goals?: number | null
          team_b_id?: string
          team_b_wins?: number | null
          window_size?: number
        }
        Relationships: [
          {
            foreignKeyName: "h2h_summaries_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "h2h_summaries_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "h2h_summaries_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          country_id: string | null
          country_name: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          prestige_score: number | null
          provider_id: number
          type: string | null
          updated_at: string
        }
        Insert: {
          country_id?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          prestige_score?: number | null
          provider_id: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          country_id?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          prestige_score?: number | null
          provider_id?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      lineup_players: {
        Row: {
          created_at: string
          grid: string | null
          id: string
          is_captain: boolean
          is_starting: boolean
          lineup_id: string
          player_id: string | null
          position: string | null
          provider_payload: Json | null
          shirt_number: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grid?: string | null
          id?: string
          is_captain?: boolean
          is_starting?: boolean
          lineup_id: string
          player_id?: string | null
          position?: string | null
          provider_payload?: Json | null
          shirt_number?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grid?: string | null
          id?: string
          is_captain?: boolean
          is_starting?: boolean
          lineup_id?: string
          player_id?: string | null
          position?: string | null
          provider_payload?: Json | null
          shirt_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineup_players_lineup_id_fkey"
            columns: ["lineup_id"]
            isOneToOne: false
            referencedRelation: "lineups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineup_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      lineups: {
        Row: {
          captured_at: string
          coach_name: string | null
          coach_photo_url: string | null
          coach_provider_id: number | null
          fixture_id: string
          formation: string | null
          id: string
          is_confirmed: boolean
          provider_payload: Json | null
          team_id: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          coach_name?: string | null
          coach_photo_url?: string | null
          coach_provider_id?: number | null
          fixture_id: string
          formation?: string | null
          id?: string
          is_confirmed?: boolean
          provider_payload?: Json | null
          team_id: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          coach_name?: string | null
          coach_photo_url?: string | null
          coach_provider_id?: number | null
          fixture_id?: string
          formation?: string | null
          id?: string
          is_confirmed?: boolean
          provider_payload?: Json | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineups_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          coefficients: Json | null
          description: string | null
          id: string
          is_active: boolean
          released_at: string
          version: string
        }
        Insert: {
          coefficients?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          released_at?: string
          version: string
        }
        Update: {
          coefficients?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean
          released_at?: string
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          fixture_id: string | null
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload: Json | null
          player_id: string | null
          read_at: string | null
          team_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          fixture_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload?: Json | null
          player_id?: string | null
          read_at?: string | null
          team_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          fixture_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          payload?: Json | null
          player_id?: string | null
          read_at?: string | null
          team_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_limits: {
        Row: {
          free_tier_follows_total: number
          id: number
        }
        Insert: {
          free_tier_follows_total?: number
          id?: number
        }
        Update: {
          free_tier_follows_total?: number
          id?: number
        }
        Relationships: []
      }
      player_match_performances: {
        Row: {
          assists: number | null
          created_at: string
          fixture_id: string
          goals: number | null
          id: string
          is_motm: boolean | null
          key_passes: number | null
          minutes: number | null
          passes: number | null
          player_id: string
          provider_payload: Json | null
          rating: number | null
          red_cards: number | null
          saves: number | null
          shots_on_target: number | null
          shots_total: number | null
          team_id: string | null
          updated_at: string
          was_captain: boolean | null
          was_starter: boolean | null
          yellow_cards: number | null
        }
        Insert: {
          assists?: number | null
          created_at?: string
          fixture_id: string
          goals?: number | null
          id?: string
          is_motm?: boolean | null
          key_passes?: number | null
          minutes?: number | null
          passes?: number | null
          player_id: string
          provider_payload?: Json | null
          rating?: number | null
          red_cards?: number | null
          saves?: number | null
          shots_on_target?: number | null
          shots_total?: number | null
          team_id?: string | null
          updated_at?: string
          was_captain?: boolean | null
          was_starter?: boolean | null
          yellow_cards?: number | null
        }
        Update: {
          assists?: number | null
          created_at?: string
          fixture_id?: string
          goals?: number | null
          id?: string
          is_motm?: boolean | null
          key_passes?: number | null
          minutes?: number | null
          passes?: number | null
          player_id?: string
          provider_payload?: Json | null
          rating?: number | null
          red_cards?: number | null
          saves?: number | null
          shots_on_target?: number | null
          shots_total?: number | null
          team_id?: string | null
          updated_at?: string
          was_captain?: boolean | null
          was_starter?: boolean | null
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_performances_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_performances_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_performances_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_seasons: {
        Row: {
          appearances: number | null
          assists: number | null
          average_rating: number | null
          created_at: string
          goals: number | null
          id: string
          minutes: number | null
          player_id: string
          provider_payload: Json | null
          red_cards: number | null
          season_id: string
          team_id: string | null
          updated_at: string
          yellow_cards: number | null
        }
        Insert: {
          appearances?: number | null
          assists?: number | null
          average_rating?: number | null
          created_at?: string
          goals?: number | null
          id?: string
          minutes?: number | null
          player_id: string
          provider_payload?: Json | null
          red_cards?: number | null
          season_id: string
          team_id?: string | null
          updated_at?: string
          yellow_cards?: number | null
        }
        Update: {
          appearances?: number | null
          assists?: number | null
          average_rating?: number | null
          created_at?: string
          goals?: number | null
          id?: string
          minutes?: number | null
          player_id?: string
          provider_payload?: Json | null
          red_cards?: number | null
          season_id?: string
          team_id?: string | null
          updated_at?: string
          yellow_cards?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_seasons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_seasons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_seasons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_team_history: {
        Row: {
          created_at: string
          id: string
          joined_on: string | null
          left_on: string | null
          player_id: string
          provider_payload: Json | null
          shirt_number: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_on?: string | null
          left_on?: string | null
          player_id: string
          provider_payload?: Json | null
          shirt_number?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_on?: string | null
          left_on?: string | null
          player_id?: string
          provider_payload?: Json | null
          shirt_number?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          country_id: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          full_name: string
          height_cm: number | null
          id: string
          last_name: string | null
          market_value_amount: number | null
          market_value_at: string | null
          market_value_currency: string | null
          market_value_source: string | null
          nationality: string | null
          photo_url: string | null
          position: Database["public"]["Enums"]["player_position"] | null
          preferred_foot: Database["public"]["Enums"]["player_foot"] | null
          provider_id: number
          provider_payload: Json | null
          secondary_positions:
            | Database["public"]["Enums"]["player_position"][]
            | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          full_name: string
          height_cm?: number | null
          id?: string
          last_name?: string | null
          market_value_amount?: number | null
          market_value_at?: string | null
          market_value_currency?: string | null
          market_value_source?: string | null
          nationality?: string | null
          photo_url?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          preferred_foot?: Database["public"]["Enums"]["player_foot"] | null
          provider_id: number
          provider_payload?: Json | null
          secondary_positions?:
            | Database["public"]["Enums"]["player_position"][]
            | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          full_name?: string
          height_cm?: number | null
          id?: string
          last_name?: string | null
          market_value_amount?: number | null
          market_value_at?: string | null
          market_value_currency?: string | null
          market_value_source?: string | null
          nationality?: string | null
          photo_url?: string | null
          position?: Database["public"]["Enums"]["player_position"] | null
          preferred_foot?: Database["public"]["Enums"]["player_foot"] | null
          provider_id?: number
          provider_payload?: Json | null
          secondary_positions?:
            | Database["public"]["Enums"]["player_position"][]
            | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          away_win_prob: number
          btts_prob: number | null
          confidence: Database["public"]["Enums"]["ai_confidence"]
          created_at: string
          draw_prob: number
          expected_goals_away: number | null
          expected_goals_home: number | null
          expected_goals_total_max: number | null
          expected_goals_total_min: number | null
          fixture_id: string
          home_win_prob: number
          id: string
          input_snapshot: Json
          minute: number | null
          model_version_id: string
          type: Database["public"]["Enums"]["prediction_type"]
          weaker_team_scoring_prob: number | null
        }
        Insert: {
          away_win_prob: number
          btts_prob?: number | null
          confidence: Database["public"]["Enums"]["ai_confidence"]
          created_at?: string
          draw_prob: number
          expected_goals_away?: number | null
          expected_goals_home?: number | null
          expected_goals_total_max?: number | null
          expected_goals_total_min?: number | null
          fixture_id: string
          home_win_prob: number
          id?: string
          input_snapshot: Json
          minute?: number | null
          model_version_id: string
          type: Database["public"]["Enums"]["prediction_type"]
          weaker_team_scoring_prob?: number | null
        }
        Update: {
          away_win_prob?: number
          btts_prob?: number | null
          confidence?: Database["public"]["Enums"]["ai_confidence"]
          created_at?: string
          draw_prob?: number
          expected_goals_away?: number | null
          expected_goals_home?: number | null
          expected_goals_total_max?: number | null
          expected_goals_total_min?: number | null
          fixture_id?: string
          home_win_prob?: number
          id?: string
          input_snapshot?: Json
          minute?: number | null
          model_version_id?: string
          type?: Database["public"]["Enums"]["prediction_type"]
          weaker_team_scoring_prob?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_deleted: boolean
          language: string
          onboarding_completed: boolean
          preferred_league_id: string | null
          timezone: string
          updated_at: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_deleted?: boolean
          language?: string
          onboarding_completed?: boolean
          preferred_league_id?: string | null
          timezone?: string
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_deleted?: boolean
          language?: string
          onboarding_completed?: boolean
          preferred_league_id?: string | null
          timezone?: string
          updated_at?: string
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_league_id_fkey"
            columns: ["preferred_league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          league_id: string
          provider_payload: Json | null
          start_date: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          league_id: string
          provider_payload?: Json | null
          start_date?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          league_id?: string
          provider_payload?: Json | null
          start_date?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          away_draw: number | null
          away_ga: number | null
          away_gf: number | null
          away_lose: number | null
          away_played: number | null
          away_win: number | null
          captured_at: string
          draw: number | null
          form: string | null
          goal_diff: number | null
          goals_against: number | null
          goals_for: number | null
          group_name: string | null
          home_draw: number | null
          home_ga: number | null
          home_gf: number | null
          home_lose: number | null
          home_played: number | null
          home_win: number | null
          id: string
          league_id: string
          lose: number | null
          played: number | null
          points: number | null
          provider_payload: Json | null
          rank: number | null
          season_id: string
          team_id: string
          updated_at: string
          win: number | null
        }
        Insert: {
          away_draw?: number | null
          away_ga?: number | null
          away_gf?: number | null
          away_lose?: number | null
          away_played?: number | null
          away_win?: number | null
          captured_at?: string
          draw?: number | null
          form?: string | null
          goal_diff?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_name?: string | null
          home_draw?: number | null
          home_ga?: number | null
          home_gf?: number | null
          home_lose?: number | null
          home_played?: number | null
          home_win?: number | null
          id?: string
          league_id: string
          lose?: number | null
          played?: number | null
          points?: number | null
          provider_payload?: Json | null
          rank?: number | null
          season_id: string
          team_id: string
          updated_at?: string
          win?: number | null
        }
        Update: {
          away_draw?: number | null
          away_ga?: number | null
          away_gf?: number | null
          away_lose?: number | null
          away_played?: number | null
          away_win?: number | null
          captured_at?: string
          draw?: number | null
          form?: string | null
          goal_diff?: number | null
          goals_against?: number | null
          goals_for?: number | null
          group_name?: string | null
          home_draw?: number | null
          home_ga?: number | null
          home_gf?: number | null
          home_lose?: number | null
          home_played?: number | null
          home_win?: number | null
          id?: string
          league_id?: string
          lose?: number | null
          played?: number | null
          points?: number | null
          provider_payload?: Json | null
          rank?: number | null
          season_id?: string
          team_id?: string
          updated_at?: string
          win?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          ended_at: string | null
          id: string
          price_amount: number
          price_currency: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string
          provider_variant_id: string
          raw_event_payload: Json | null
          renews_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ending_email_sent_at: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          price_amount: number
          price_currency?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id: string
          provider_variant_id: string
          raw_event_payload?: Json | null
          renews_at?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ending_email_sent_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          price_amount?: number
          price_currency?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string
          provider_variant_id?: string
          raw_event_payload?: Json | null
          renews_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ending_email_sent_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string | null
          country_id: string | null
          created_at: string
          elo_rating: number | null
          founded: number | null
          id: string
          is_national: boolean
          logo_url: string | null
          name: string
          provider_id: number
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          code?: string | null
          country_id?: string | null
          created_at?: string
          elo_rating?: number | null
          founded?: number | null
          id?: string
          is_national?: boolean
          logo_url?: string | null
          name: string
          provider_id: number
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          code?: string | null
          country_id?: string | null
          created_at?: string
          elo_rating?: number | null
          founded?: number | null
          id?: string
          is_national?: boolean
          logo_url?: string | null
          name?: string
          provider_id?: number
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          email_marketing_optin: boolean
          notify_ai_insight_refreshed: boolean
          notify_full_time: boolean
          notify_goal: boolean
          notify_lineup_confirmed: boolean
          notify_prediction_shift: boolean
          sound_full_time_enabled: boolean
          sound_goal_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_marketing_optin?: boolean
          notify_ai_insight_refreshed?: boolean
          notify_full_time?: boolean
          notify_goal?: boolean
          notify_lineup_confirmed?: boolean
          notify_prediction_shift?: boolean
          sound_full_time_enabled?: boolean
          sound_goal_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_marketing_optin?: boolean
          notify_ai_insight_refreshed?: boolean
          notify_full_time?: boolean
          notify_goal?: boolean
          notify_lineup_confirmed?: boolean
          notify_prediction_shift?: boolean
          sound_full_time_enabled?: boolean
          sound_goal_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          capacity: number | null
          city: string | null
          country_id: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          provider_id: number | null
          surface: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          city?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          provider_id?: number | null
          surface?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          city?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          provider_id?: number | null
          surface?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          invited_at: string | null
          ip_hash: string | null
          referrer: string | null
          source: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          ip_hash?: string | null
          referrer?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          ip_hash?: string | null
          referrer?: string | null
          source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_ai_usage: {
        Args: {
          p_deep_analyses?: number
          p_generations?: number
          p_live_fixture_uuid?: string
          p_live_touch_at?: string
          p_predictions?: number
          p_usage_day: string
          p_user_id: string
        }
        Returns: {
          ai_deep_analyses_count: number
          ai_generations_count: number
          ai_predictions_count: number
          id: string
          last_live_ai_at: Json
          live_ai_matches: string[]
          updated_at: string
          usage_day: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      merge_ai_usage_from_redis: {
        Args: {
          p_deep_analyses: number
          p_generations: number
          p_last_live_ai_at: Json
          p_live_ai_matches: string[]
          p_predictions: number
          p_usage_day: string
          p_user_id: string
        }
        Returns: {
          ai_deep_analyses_count: number
          ai_generations_count: number
          ai_predictions_count: number
          id: string
          last_live_ai_at: Json
          live_ai_matches: string[]
          updated_at: string
          usage_day: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_players: {
        Args: { max_results?: number; q: string }
        Returns: {
          full_name: string
          id: string
          photo_url: string
          position: Database["public"]["Enums"]["player_position"]
          sim: number
        }[]
      }
      search_teams: {
        Args: { max_results?: number; q: string }
        Returns: {
          country_name: string
          id: string
          logo_url: string
          name: string
          sim: number
        }[]
      }
    }
    Enums: {
      ai_advantage: "HOME" | "DRAW" | "AWAY" | "EVEN"
      ai_confidence: "LOW" | "MEDIUM" | "HIGH"
      ai_data_quality: "COMPLETE" | "PARTIAL" | "STALE"
      ai_insight_type:
        | "PREMATCH"
        | "LIVE"
        | "DEEP"
        | "LEAGUE_SUMMARY"
        | "TEAM_SUMMARY"
      ai_win_outcome: "1" | "X" | "2"
      app_tier: "FREE" | "PREMIUM"
      fixture_status:
        | "TBD"
        | "NS"
        | "1H"
        | "HT"
        | "2H"
        | "ET"
        | "BT"
        | "P"
        | "FT"
        | "AET"
        | "PEN"
        | "SUSP"
        | "INT"
        | "PST"
        | "CANC"
        | "ABD"
        | "AWD"
        | "WO"
        | "LIVE"
      follow_object: "TEAM" | "PLAYER" | "LEAGUE"
      notification_channel: "IN_APP" | "EMAIL" | "PUSH"
      notification_kind:
        | "GOAL_FOR_FOLLOWED_TEAM"
        | "FULL_TIME_FOLLOWED_TEAM"
        | "LINEUP_CONFIRMED"
        | "PREDICTION_SHIFT"
        | "AI_INSIGHT_REFRESHED"
        | "TRIAL_ENDING"
        | "PAYMENT_SUCCESS"
        | "PAYMENT_FAILED"
      player_foot: "LEFT" | "RIGHT" | "BOTH" | "UNKNOWN"
      player_position: "GK" | "DF" | "MF" | "FW"
      prediction_type: "PREMATCH" | "LIVE"
      subscription_status:
        | "TRIALING"
        | "ACTIVE"
        | "PAST_DUE"
        | "CANCELLED"
        | "EXPIRED"
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
      ai_advantage: ["HOME", "DRAW", "AWAY", "EVEN"],
      ai_confidence: ["LOW", "MEDIUM", "HIGH"],
      ai_data_quality: ["COMPLETE", "PARTIAL", "STALE"],
      ai_insight_type: [
        "PREMATCH",
        "LIVE",
        "DEEP",
        "LEAGUE_SUMMARY",
        "TEAM_SUMMARY",
      ],
      ai_win_outcome: ["1", "X", "2"],
      app_tier: ["FREE", "PREMIUM"],
      fixture_status: [
        "TBD",
        "NS",
        "1H",
        "HT",
        "2H",
        "ET",
        "BT",
        "P",
        "FT",
        "AET",
        "PEN",
        "SUSP",
        "INT",
        "PST",
        "CANC",
        "ABD",
        "AWD",
        "WO",
        "LIVE",
      ],
      follow_object: ["TEAM", "PLAYER", "LEAGUE"],
      notification_channel: ["IN_APP", "EMAIL", "PUSH"],
      notification_kind: [
        "GOAL_FOR_FOLLOWED_TEAM",
        "FULL_TIME_FOLLOWED_TEAM",
        "LINEUP_CONFIRMED",
        "PREDICTION_SHIFT",
        "AI_INSIGHT_REFRESHED",
        "TRIAL_ENDING",
        "PAYMENT_SUCCESS",
        "PAYMENT_FAILED",
      ],
      player_foot: ["LEFT", "RIGHT", "BOTH", "UNKNOWN"],
      player_position: ["GK", "DF", "MF", "FW"],
      prediction_type: ["PREMATCH", "LIVE"],
      subscription_status: [
        "TRIALING",
        "ACTIVE",
        "PAST_DUE",
        "CANCELLED",
        "EXPIRED",
      ],
    },
  },
} as const
