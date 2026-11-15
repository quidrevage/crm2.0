// Generated from the Supabase schema (Supabase MCP generate_typescript_types). Do not edit by hand.
// Regenerate after every migration: npx supabase gen types typescript --linked > src/types/database.ts

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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          case_id: string | null
          client_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          case_id?: string | null
          client_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          case_id?: string | null
          client_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: boolean
          max_upload_mb: number
          max_users: number
          member_finance_access: Database["public"]["Enums"]["finance_access"]
          practice_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          max_upload_mb?: number
          max_users?: number
          member_finance_access?: Database["public"]["Enums"]["finance_access"]
          practice_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          max_upload_mb?: number
          max_users?: number
          member_finance_access?: Database["public"]["Enums"]["finance_access"]
          practice_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_parties: {
        Row: {
          archived_at: string | null
          case_id: string
          client_id: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          id: string
          identifier: string | null
          is_our_client: boolean
          name: string
          notes: string | null
          role_id: string
          row_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          case_id: string
          client_id?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          identifier?: string | null
          is_our_client?: boolean
          name: string
          notes?: string | null
          role_id: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          case_id?: string
          client_id?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          identifier?: string | null
          is_our_client?: boolean
          name?: string
          notes?: string | null
          role_id?: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "party_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_parties_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_statuses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_closed: boolean
          name: string
          sort_order: number
          tone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_closed?: boolean
          name: string
          sort_order?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_closed?: boolean
          name?: string
          sort_order?: number
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          archived_at: string | null
          case_number: string
          client_id: string
          closed_on: string | null
          court_case_number: string | null
          court_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_litigation: boolean
          judge: string | null
          matter_type_id: string | null
          next_important_date: string | null
          notes: string | null
          opened_on: string
          opposing_party: string | null
          practice_area_id: string | null
          responsible_id: string | null
          row_version: number
          status_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          case_number: string
          client_id: string
          closed_on?: string | null
          court_case_number?: string | null
          court_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_litigation?: boolean
          judge?: string | null
          matter_type_id?: string | null
          next_important_date?: string | null
          notes?: string | null
          opened_on?: string
          opposing_party?: string | null
          practice_area_id?: string | null
          responsible_id?: string | null
          row_version?: number
          status_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          case_number?: string
          client_id?: string
          closed_on?: string | null
          court_case_number?: string | null
          court_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_litigation?: boolean
          judge?: string | null
          matter_type_id?: string | null
          next_important_date?: string | null
          notes?: string | null
          opened_on?: string
          opposing_party?: string | null
          practice_area_id?: string | null
          responsible_id?: string | null
          row_version?: number
          status_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_matter_type_id_fkey"
            columns: ["matter_type_id"]
            isOneToOne: false
            referencedRelation: "matter_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_practice_area_id_fkey"
            columns: ["practice_area_id"]
            isOneToOne: false
            referencedRelation: "practice_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "case_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          archived_at: string | null
          client_id: string
          comment: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          phone: string | null
          position: string | null
          row_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          phone?: string | null
          position?: string | null
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          phone?: string | null
          position?: string | null
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived_at: string | null
          assigned_to: string | null
          client_number: string
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          created_by: string | null
          edrpou: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          representative: string | null
          rnokpp: string | null
          row_version: number
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          client_number: string
          client_type: Database["public"]["Enums"]["client_type"]
          created_at?: string
          created_by?: string | null
          edrpou?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          representative?: string | null
          rnokpp?: string | null
          row_version?: number
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          client_number?: string
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          created_by?: string | null
          edrpou?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          representative?: string | null
          rnokpp?: string | null
          row_version?: number
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          address: string | null
          archived_at: string | null
          city: string | null
          court_type_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          region: string | null
          row_version: number
          updated_at: string
          updated_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          court_type_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          region?: string | null
          row_version?: number
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          city?: string | null
          court_type_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          region?: string | null
          row_version?: number
          updated_at?: string
          updated_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courts_court_type_id_fkey"
            columns: ["court_type_id"]
            isOneToOne: false
            referencedRelation: "court_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          document_id: string
          id: string
          mime_type: string
          original_filename: string
          sha256: string | null
          size_bytes: number
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          document_id: string
          id?: string
          mime_type: string
          original_filename: string
          sha256?: string | null
          size_bytes: number
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_no: number
        }
        Update: {
          document_id?: string
          id?: string
          mime_type?: string
          original_filename?: string
          sha256?: string | null
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          case_id: string | null
          category_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          description: string | null
          id: string
          name: string
          row_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          case_id?: string | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          name: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          case_id?: string | null
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          description?: string | null
          id?: string
          name?: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string
          dismissed_at: string | null
          event_id: string
          id: string
          remind_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          event_id: string
          id?: string
          remind_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          event_id?: string
          id?: string
          remind_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean
          archived_at: string | null
          case_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deadline_source: string | null
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_verified: boolean
          location: string | null
          responsible_id: string | null
          row_version: number
          starts_at: string
          title: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          all_day?: boolean
          archived_at?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline_source?: string | null
          description?: string | null
          ends_at?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          is_verified?: boolean
          location?: string | null
          responsible_id?: string | null
          row_version?: number
          starts_at: string
          title: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          all_day?: boolean
          archived_at?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline_source?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_verified?: boolean
          location?: string | null
          responsible_id?: string | null
          row_version?: number
          starts_at?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_uah: number
          archived_at: string | null
          case_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incurred_on: string
          reimbursable: boolean
          row_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_uah: number
          archived_at?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incurred_on?: string
          reimbursable?: boolean
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_uah?: number
          archived_at?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incurred_on?: string
          reimbursable?: boolean
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_agreements: {
        Row: {
          agreed_on: string
          amount_uah: number
          archived_at: string | null
          case_id: string | null
          client_id: string
          contract_number: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fee_type: Database["public"]["Enums"]["fee_type"]
          id: string
          row_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agreed_on?: string
          amount_uah: number
          archived_at?: string | null
          case_id?: string | null
          client_id: string
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agreed_on?: string
          amount_uah?: number
          archived_at?: string | null
          case_id?: string | null
          client_id?: string
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_agreements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_agreements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          archived_at: string | null
          author_id: string | null
          case_id: string | null
          client_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          row_version: number
          task_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          author_id?: string | null
          case_id?: string | null
          client_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          row_version?: number
          task_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          author_id?: string | null
          case_id?: string | null
          client_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          row_version?: number
          task_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_uah: number
          archived_at: string | null
          case_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          fee_agreement_id: string | null
          id: string
          method: string | null
          paid_on: string
          row_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_uah: number
          archived_at?: string | null
          case_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_agreement_id?: string | null
          id?: string
          method?: string | null
          paid_on?: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_uah?: number
          archived_at?: string | null
          case_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_agreement_id?: string | null
          id?: string
          method?: string | null
          paid_on?: string
          row_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_fee_agreement_id_fkey"
            columns: ["fee_agreement_id"]
            isOneToOne: false
            referencedRelation: "fee_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_areas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          advocate_certificate_no: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_advocate: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          advocate_certificate_no?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          is_advocate?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          advocate_certificate_no?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_advocate?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          case_id: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          row_version: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          row_version?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          row_version?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          invited_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          invited_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
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
      add_document_version: {
        Args: {
          p_case_id?: string
          p_category_id?: string
          p_client_id?: string
          p_description?: string
          p_document_id: string
          p_mime_type: string
          p_name?: string
          p_original_filename: string
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
        }
        Returns: string
      }
      search_global: {
        Args: { max_per_kind?: number; q: string }
        Returns: {
          id: string
          kind: string
          label: string
          sublabel: string
        }[]
      }
    }
    Enums: {
      client_status: "potential" | "active" | "inactive" | "archived"
      client_type: "individual" | "legal_entity"
      event_type:
        | "hearing"
        | "client_meeting"
        | "call"
        | "internal"
        | "deadline"
        | "other"
      fee_type: "fixed" | "hourly" | "other"
      finance_access: "none" | "read" | "write"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "new" | "in_progress" | "waiting" | "completed" | "cancelled"
      user_role: "admin" | "member"
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
      client_status: ["potential", "active", "inactive", "archived"],
      client_type: ["individual", "legal_entity"],
      event_type: [
        "hearing",
        "client_meeting",
        "call",
        "internal",
        "deadline",
        "other",
      ],
      fee_type: ["fixed", "hourly", "other"],
      finance_access: ["none", "read", "write"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["new", "in_progress", "waiting", "completed", "cancelled"],
      user_role: ["admin", "member"],
    },
  },
} as const
