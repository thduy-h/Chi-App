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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Couple = Database['public']['Tables']['couples']['Row']
