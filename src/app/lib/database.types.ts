
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "access_requests": {
                  Row: {
                    "created_at": string,"email": string,"handled_at": string | null,"id": number,"name": string,"notified_at": string | null,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"handled_at"?: string | null,"id"?: never,"name": string,"notified_at"?: string | null,"reason": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"handled_at"?: string | null,"id"?: never,"name"?: string,"notified_at"?: string | null,"reason"?: string
                  }
                  Relationships: [
                    
                  ]
                },"active_days": {
                  Row: {
                    "day": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "active_days_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"allowed_email_domains": {
                  Row: {
                    "created_at": string,"entry": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entry": string
                  }
                  Update: {
                    "created_at"?: string,"entry"?: string
                  }
                  Relationships: [
                    
                  ]
                },"articles": {
                  Row: {
                    "first_seen_at": string,"id": number,"published_at": string | null,"source_id": string,"summary": string | null,"title": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "first_seen_at"?: string,"id"?: never,"published_at"?: string | null,"source_id": string,"summary"?: string | null,"title": string,"url": string
                  }
                  Update: {
                    "first_seen_at"?: string,"id"?: never,"published_at"?: string | null,"source_id"?: string,"summary"?: string | null,"title"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "articles_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"digest_time": string | null,"email": string,"full_name": string | null,"id": string,"last_digest_at": string | null,"share_copy_link": boolean,"share_email": boolean,"share_linkedin": boolean,"time_zone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"digest_time"?: string | null,"email": string,"full_name"?: string | null,"id": string,"last_digest_at"?: string | null,"share_copy_link"?: boolean,"share_email"?: boolean,"share_linkedin"?: boolean,"time_zone"?: string
                  }
                  Update: {
                    "created_at"?: string,"digest_time"?: string | null,"email"?: string,"full_name"?: string | null,"id"?: string,"last_digest_at"?: string | null,"share_copy_link"?: boolean,"share_email"?: boolean,"share_linkedin"?: boolean,"time_zone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"publications": {
                  Row: {
                    "id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sources": {
                  Row: {
                    "created_at": string,"feed_url": string | null,"id": string,"last_checked_at": string | null,"name": string | null,"problem": string | null,"read_from": string | null,"stories_found": number | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feed_url"?: string | null,"id"?: string,"last_checked_at"?: string | null,"name"?: string | null,"problem"?: string | null,"read_from"?: string | null,"stories_found"?: number | null,"url": string
                  }
                  Update: {
                    "created_at"?: string,"feed_url"?: string | null,"id"?: string,"last_checked_at"?: string | null,"name"?: string | null,"problem"?: string | null,"read_from"?: string | null,"stories_found"?: number | null,"url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"usage_events": {
                  Row: {
                    "action": string,"article_id": number | null,"created_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"article_id"?: number | null,"created_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Update: {
                    "action"?: string,"article_id"?: number | null,"created_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "usage_events_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usage_events_article_id_fkey"
      columns: ["article_id"]
isOneToOne: false
      referencedRelation: "watch_list_articles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usage_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"usage_reports": {
                  Row: {
                    "month": string,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "month": string,"sent_at"?: string
                  }
                  Update: {
                    "month"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_publications": {
                  Row: {
                    "publication_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "publication_id": number,"user_id": string
                  }
                  Update: {
                    "publication_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_publications_publication_id_fkey"
      columns: ["publication_id"]
isOneToOne: false
      referencedRelation: "publications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_publications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"watch_list_sources": {
                  Row: {
                    "created_at": string,"source_id": string,"watch_list_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"source_id": string,"watch_list_id": string
                  }
                  Update: {
                    "created_at"?: string,"source_id"?: string,"watch_list_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "watch_list_sources_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "watch_list_sources_watch_list_id_fkey"
      columns: ["watch_list_id"]
isOneToOne: false
      referencedRelation: "watch_list_articles"
      referencedColumns: ["watch_list_id"]
    },{
      foreignKeyName: "watch_list_sources_watch_list_id_fkey"
      columns: ["watch_list_id"]
isOneToOne: false
      referencedRelation: "watch_list_new_counts"
      referencedColumns: ["watch_list_id"]
    },{
      foreignKeyName: "watch_list_sources_watch_list_id_fkey"
      columns: ["watch_list_id"]
isOneToOne: false
      referencedRelation: "watch_lists"
      referencedColumns: ["id"]
    }
                  ]
                },"watch_lists": {
                  Row: {
                    "created_at": string,"id": string,"keywords": (string)[],"last_viewed_at": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"keywords"?: (string)[],"last_viewed_at"?: string,"name": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"keywords"?: (string)[],"last_viewed_at"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "watch_lists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "watch_list_articles": {
                  Row: {
                    "first_seen_at": string,"id": number,"published_at": string | null,"search_text": string | null,"source_id": string,"summary": string | null,"title": string,"url": string,"watch_list_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "articles_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"watch_list_new_counts": {
                  Row: {
                    "new_count": number | null,"watch_list_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "new_count"?: never,"watch_list_id"?: string | null
                         }
                        Update: {
                           "new_count"?: never,"watch_list_id"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "hook_before_user_created":
{ Args: { "event": Json }; Returns: Json
                           },
"mentions_any":
{ Args: { "content": string,"keywords": (string)[] }; Returns: boolean
                           },
"record_active_day":
{ Args: Record<PropertyKey, never>; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
