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
      couples: {
        Row: {
          id: string
          code: string
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          code: string
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      couple_members: {
        Row: {
          id: string
          couple_id: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          couple_id?: string
          user_id?: string
          created_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          couple_id: string
          title: string
          description: string | null
          status: string
          priority: string | null
          due_date: string | null
          sort_order: number
          board: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          couple_id: string
          title: string
          description?: string | null
          status: string
          priority?: string | null
          due_date?: string | null
          sort_order?: number
          board: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          couple_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string | null
          due_date?: string | null
          sort_order?: number
          board?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          id: string
          couple_id: string
          type: 'income' | 'expense'
          amount: number
          category: string
          entry_date: string
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          couple_id: string
          type: 'income' | 'expense'
          amount: number
          category: string
          entry_date: string
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          couple_id?: string
          type?: 'income' | 'expense'
          amount?: number
          category?: string
          entry_date?: string
          note?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      cycle_settings: {
        Row: {
          id: string
          couple_id: string
          user_id: string
          last_period_start: string
          cycle_length: number
          period_length: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          last_period_start: string
          cycle_length: number
          period_length: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          couple_id?: string
          user_id?: string
          last_period_start?: string
          cycle_length?: number
          period_length?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      letters: {
        Row: {
          id: string
          couple_id: string
          kind: 'feedback' | 'love'
          title: string | null
          message: string
          mood: string | null
          anonymous: boolean
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          couple_id: string
          kind: 'feedback' | 'love'
          title?: string | null
          message: string
          mood?: string | null
          anonymous?: boolean
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          couple_id?: string
          kind?: 'feedback' | 'love'
          title?: string | null
          message?: string
          mood?: string | null
          anonymous?: boolean
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      couple_nicknames: {
        Row: {
          id: string
          couple_id: string
          owner_user_id: string
          target_user_id: string
          nickname: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          couple_id: string
          owner_user_id: string
          target_user_id: string
          nickname: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          couple_id?: string
          owner_user_id?: string
          target_user_id?: string
          nickname?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          user_id: string
          telegram_chat_id: string | null
          telegram_linked_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          telegram_chat_id?: string | null
          telegram_linked_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          telegram_chat_id?: string | null
          telegram_linked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_prefs: {
        Row: {
          id: string
          couple_id: string
          user_id: string
          event: 'order_created' | 'letter_received'
          channel: 'telegram' | 'email' | 'in_app'
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          couple_id: string
          user_id: string
          event: 'order_created' | 'letter_received'
          channel: 'telegram' | 'email' | 'in_app'
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          couple_id?: string
          user_id?: string
          event?: 'order_created' | 'letter_received'
          channel?: 'telegram' | 'email' | 'in_app'
          enabled?: boolean
          created_at?: string
        }
        Relationships: []
      }
      telegram_link_tokens: {
        Row: {
          token: string
          user_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          token: string
          user_id: string
          expires_at: string
          created_at?: string
        }
        Update: {
          token?: string
          user_id?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_couple: {
        Args: {
          p_code: string
        }
        Returns: {
          code: string
          id: string
        } | null
      }
      delete_my_couple: {
        Args: {
          p_couple_id: string
        }
        Returns: Json
      }
      join_by_code: {
        Args: {
          p_code: string
        }
        Returns: string | null
      }
      get_my_membership: {
        Args: Record<string, never>
        Returns: string | { couple_id?: string | null; id?: string | null } | null
      }
      get_my_couple: {
        Args: Record<string, never>
        Returns:
          | {
              id: string
              code: string
              created_by: string | null
            }
          | null
      }
      leave_couple: {
        Args: {
          p_couple_id: string
        }
        Returns: Json
      }
      rotate_couple_code: {
        Args: {
          p_couple_id: string
        }
        Returns: string | { code?: string | null; new_code?: string | null } | null
      }
      whoami: {
        Args: Record<string, never>
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Couple = Database['public']['Tables']['couples']['Row']
