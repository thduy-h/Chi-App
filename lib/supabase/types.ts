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
          date: string
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          couple_id: string
          type: 'income' | 'expense'
          amount: number
          category: string
          date: string
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          couple_id?: string
          type?: 'income' | 'expense'
          amount?: number
          category?: string
          date?: string
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Couple = Database['public']['Tables']['couples']['Row']
