export type Json =
  | string
  | number
  | boolean
  | null
  | {[key: string]: Json | undefined}
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string;
          role: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          phone?: string;
          role?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          role?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      master_profiles: {
        Row: {
          user_id: string;
          bio: string | null;
          age: number | null;
          citizenship: string | null;
          work_experience: string | null;
          profile_completed: boolean;
          avg_rating: number | null;
          review_count: number;
          last_active_at: string | null;
        };
        Insert: {
          user_id: string;
          bio?: string | null;
          age?: number | null;
          citizenship?: string | null;
          work_experience?: string | null;
          profile_completed?: boolean;
          avg_rating?: number | null;
          review_count?: number;
          last_active_at?: string | null;
        };
        Update: {
          user_id?: string;
          bio?: string | null;
          age?: number | null;
          citizenship?: string | null;
          work_experience?: string | null;
          profile_completed?: boolean;
          avg_rating?: number | null;
          review_count?: number;
          last_active_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          description: string;
          category: string;
          budget_min: number | null;
          budget_max: number | null;
          status: string;
          location: string | null;
          assigned_master_id: string | null;
          master_completed: boolean;
          client_completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          description: string;
          category: string;
          budget_min?: number | null;
          budget_max?: number | null;
          status?: string;
          location?: string | null;
          assigned_master_id?: string | null;
          master_completed?: boolean;
          client_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          title?: string;
          description?: string;
          category?: string;
          budget_min?: number | null;
          budget_max?: number | null;
          status?: string;
          location?: string | null;
          assigned_master_id?: string | null;
          master_completed?: boolean;
          client_completed?: boolean;
          created_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          order_id: string;
          master_id: string;
          message: string | null;
          proposed_price: number | null;
          status: string;
          chat_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          master_id: string;
          message?: string | null;
          proposed_price?: number | null;
          status?: string;
          chat_blocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          master_id?: string;
          message?: string | null;
          proposed_price?: number | null;
          status?: string;
          chat_blocked?: boolean;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          order_id: string;
          client_id: string;
          master_id: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          client_id: string;
          master_id: string;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          client_id?: string;
          master_id?: string;
          last_message_at?: string | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          text: string | null;
          file_url: string | null;
          file_name: string | null;
          file_type: string | null;
          file_size: number | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          text?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          text?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      special_offers: {
        Row: {
          id: string;
          response_id: string;
          master_id: string;
          client_id: string;
          message: string;
          proposed_price: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          response_id: string;
          master_id: string;
          client_id: string;
          message: string;
          proposed_price?: number | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          master_id?: string;
          client_id?: string;
          message?: string;
          proposed_price?: number | null;
          status?: string;
          created_at?: string;
        };
      };
      order_views: {
        Row: {
          user_id: string;
          order_id: string;
          viewed_at: string;
        };
        Insert: {
          user_id: string;
          order_id: string;
          viewed_at?: string;
        };
        Update: {
          user_id?: string;
          order_id?: string;
          viewed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      mark_messages_read: {
        Args: { p_conversation_id: string };
        Returns: void;
      };
      get_unread_counts: {
        Args: Record<string, never>;
        Returns: { conversation_id: string; unread_count: number }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type MasterProfile = Tables<'master_profiles'>;
export type Order = Tables<'orders'>;
export type Response = Tables<'responses'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type Review = Tables<'reviews'>;
export type SpecialOffer = Tables<'special_offers'>;

export interface PendingUploadMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  file_url: null;
  file_name: string;
  file_type: string;
  file_size: number;
  read_at: null;
  created_at: string;
  _uploading: true;
  _progress: number;
}

export type DisplayMessage = Message | PendingUploadMessage;
