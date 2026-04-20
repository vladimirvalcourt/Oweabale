/**
 * Supabase Database Types
 * Generated from supabase_schema.sql
 * 
 * To regenerate automatically:
 * npx supabase gen types typescript --project-id <your-project-ref> > src/types/supabase.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          avatar: string | null
          theme: string | null
          tax_state: string | null
          tax_rate: number | null
          phone: string | null
          timezone: string | null
          language: string | null
          is_admin: boolean
          is_banned: boolean
          has_completed_onboarding: boolean | null
          credit_score: number | null
          credit_last_updated: string | null
          plaid_institution_name: string | null
          plaid_linked_at: string | null
          plaid_last_sync_at: string | null
          plaid_needs_relink: boolean
          completed_lessons: string[]
          tax_reserve_percent: number
          steady_salary_target: number
          alert_preferences: Json
          notification_prefs: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          avatar?: string | null
          theme?: string | null
          tax_state?: string | null
          tax_rate?: number | null
          phone?: string | null
          timezone?: string | null
          language?: string | null
          is_admin?: boolean
          is_banned?: boolean
          has_completed_onboarding?: boolean | null
          credit_score?: number | null
          credit_last_updated?: string | null
          plaid_institution_name?: string | null
          plaid_linked_at?: string | null
          plaid_last_sync_at?: string | null
          plaid_needs_relink?: boolean
          completed_lessons?: string[]
          tax_reserve_percent?: number
          steady_salary_target?: number
          alert_preferences?: Json
          notification_prefs?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          avatar?: string | null
          theme?: string | null
          tax_state?: string | null
          tax_rate?: number | null
          phone?: string | null
          timezone?: string | null
          language?: string | null
          is_admin?: boolean
          is_banned?: boolean
          has_completed_onboarding?: boolean | null
          credit_score?: number | null
          credit_last_updated?: string | null
          plaid_institution_name?: string | null
          plaid_linked_at?: string | null
          plaid_last_sync_at?: string | null
          plaid_needs_relink?: boolean
          completed_lessons?: string[]
          tax_reserve_percent?: number
          steady_salary_target?: number
          alert_preferences?: Json
          notification_prefs?: Json
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string
          biller: string
          amount: number
          category: string | null
          due_date: string
          frequency: string | null
          status: 'upcoming' | 'paid' | 'overdue' | null
          auto_pay: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          biller: string
          amount: number
          category?: string | null
          due_date: string
          frequency?: string | null
          status?: 'upcoming' | 'paid' | 'overdue' | null
          auto_pay?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          biller?: string
          amount?: number
          category?: string | null
          due_date?: string
          frequency?: string | null
          status?: 'upcoming' | 'paid' | 'overdue' | null
          auto_pay?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      debts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string | null
          apr: number | null
          remaining: number
          min_payment: number | null
          paid: number | null
          original_amount: number | null
          origination_date: string | null
          term_months: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: string | null
          apr?: number | null
          remaining: number
          min_payment?: number | null
          paid?: number | null
          original_amount?: number | null
          origination_date?: string | null
          term_months?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string | null
          apr?: number | null
          remaining?: number
          min_payment?: number | null
          paid?: number | null
          original_amount?: number | null
          origination_date?: string | null
          term_months?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string | null
          date: string
          amount: number
          type: 'income' | 'expense' | null
          source: 'manual' | 'plaid'
          plaid_transaction_id: string | null
          plaid_account_id: string | null
          platform_tag: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string | null
          date: string
          amount: number
          type?: 'income' | 'expense' | null
          source?: 'manual' | 'plaid'
          plaid_transaction_id?: string | null
          plaid_account_id?: string | null
          platform_tag?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string | null
          date?: string
          amount?: number
          type?: 'income' | 'expense' | null
          source?: 'manual' | 'plaid'
          plaid_transaction_id?: string | null
          plaid_account_id?: string | null
          platform_tag?: string
          notes?: string | null
          created_at?: string
        }
      }
      plaid_accounts: {
        Row: {
          id: string
          user_id: string
          plaid_item_id: string
          plaid_account_id: string
          name: string
          official_name: string | null
          account_type: string
          account_subtype: string | null
          mask: string | null
          subtype_suggested_savings: boolean
          include_in_savings: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plaid_item_id: string
          plaid_account_id: string
          name: string
          official_name?: string | null
          account_type?: string
          account_subtype?: string | null
          mask?: string | null
          subtype_suggested_savings?: boolean
          include_in_savings?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plaid_item_id?: string
          plaid_account_id?: string
          name?: string
          official_name?: string | null
          account_type?: string
          account_subtype?: string | null
          mask?: string | null
          subtype_suggested_savings?: boolean
          include_in_savings?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string
          name: string
          value: number
          type: string | null
          appreciation_rate: number | null
          purchase_price: number | null
          purchase_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          value: number
          type?: string | null
          appreciation_rate?: number | null
          purchase_price?: number | null
          purchase_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          value?: number
          type?: string | null
          appreciation_rate?: number | null
          purchase_price?: number | null
          purchase_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          frequency: string | null
          next_billing_date: string | null
          status: 'active' | 'paused' | 'cancelled' | null
          price_history: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          frequency?: string | null
          next_billing_date?: string | null
          status?: 'active' | 'paused' | 'cancelled' | null
          price_history?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          frequency?: string | null
          next_billing_date?: string | null
          status?: 'active' | 'paused' | 'cancelled' | null
          price_history?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number | null
          deadline: string | null
          type: 'debt' | 'savings' | 'emergency' | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number | null
          deadline?: string | null
          type?: 'debt' | 'savings' | 'emergency' | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number | null
          deadline?: string | null
          type?: 'debt' | 'savings' | 'emergency' | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      incomes: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          frequency: string | null
          category: string | null
          next_date: string | null
          status: 'active' | 'paused' | null
          is_tax_withheld: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          frequency?: string | null
          category?: string | null
          next_date?: string | null
          status?: 'active' | 'paused' | null
          is_tax_withheld?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          frequency?: string | null
          category?: string | null
          next_date?: string | null
          status?: 'active' | 'paused' | null
          is_tax_withheld?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          period: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | null
          rollover_enabled: boolean
          lock_mode: 'none' | 'soft' | 'hard'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          amount: number
          period?: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | null
          rollover_enabled?: boolean
          lock_mode?: 'none' | 'soft' | 'hard'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          period?: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | null
          rollover_enabled?: boolean
          lock_mode?: 'none' | 'soft' | 'hard'
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          type: 'income' | 'expense' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          type?: 'income' | 'expense' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          type?: 'income' | 'expense' | null
          created_at?: string
        }
      }
      citations: {
        Row: {
          id: string
          user_id: string
          type: string
          jurisdiction: string | null
          days_left: number | null
          amount: number
          penalty_fee: number | null
          date: string | null
          citation_number: string | null
          payment_url: string | null
          status: 'open' | 'resolved' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          jurisdiction?: string | null
          days_left?: number | null
          amount: number
          penalty_fee?: number | null
          date?: string | null
          citation_number?: string | null
          payment_url?: string | null
          status?: 'open' | 'resolved' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          jurisdiction?: string | null
          days_left?: number | null
          amount?: number
          penalty_fee?: number | null
          date?: string | null
          citation_number?: string | null
          payment_url?: string | null
          status?: 'open' | 'resolved' | null
          created_at?: string
          updated_at?: string
        }
      }
      deductions: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string | null
          amount: number
          date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string | null
          amount: number
          date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string | null
          amount?: number
          date?: string | null
          created_at?: string
        }
      }
      freelance_entries: {
        Row: {
          id: string
          user_id: string
          client: string
          amount: number
          date: string
          is_vaulted: boolean | null
          scoured_write_offs: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client: string
          amount: number
          date: string
          is_vaulted?: boolean | null
          scoured_write_offs?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client?: string
          amount?: number
          date?: string
          is_vaulted?: boolean | null
          scoured_write_offs?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      mileage_log: {
        Row: {
          id: string
          user_id: string
          trip_date: string
          start_location: string
          end_location: string
          miles: number
          purpose: 'business' | 'medical' | 'charity'
          platform: string
          irs_rate_per_mile: number
          deduction_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trip_date: string
          start_location?: string
          end_location?: string
          miles: number
          purpose: 'business' | 'medical' | 'charity'
          platform?: string
          irs_rate_per_mile?: number
          deduction_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trip_date?: string
          start_location?: string
          end_location?: string
          miles?: number
          purpose?: 'business' | 'medical' | 'charity'
          platform?: string
          irs_rate_per_mile?: number
          deduction_amount?: number
          created_at?: string
        }
      }
      client_invoices: {
        Row: {
          id: string
          user_id: string
          client_name: string
          amount: number
          issued_date: string
          due_date: string
          status: 'draft' | 'sent' | 'paid' | 'void'
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_name: string
          amount: number
          issued_date: string
          due_date: string
          status?: 'draft' | 'sent' | 'paid' | 'void'
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_name?: string
          amount?: number
          issued_date?: string
          due_date?: string
          status?: 'draft' | 'sent' | 'paid' | 'void'
          notes?: string
          created_at?: string
        }
      }
      risc_google_events: {
        Row: {
          jti: string
          received_at: string
        }
        Insert: {
          jti: string
          received_at?: string
        }
        Update: {
          jti?: string
          received_at?: string
        }
      }
      pending_ingestions: {
        Row: {
          id: string
          user_id: string
          type: string
          status: string | null
          source: string | null
          extracted_data: Json | null
          original_file: Json | null
          storage_path: string | null
          storage_url: string | null
          /** Mobile capture secret; required for anon INSERT via RLS. */
          token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          status?: string | null
          source?: string | null
          extracted_data?: Json | null
          original_file?: Json | null
          storage_path?: string | null
          storage_url?: string | null
          token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          status?: string | null
          source?: string | null
          extracted_data?: Json | null
          original_file?: Json | null
          storage_path?: string | null
          storage_url?: string | null
          token?: string | null
          created_at?: string
        }
      }
      categorization_rules: {
        Row: {
          id: string
          user_id: string
          match_type: 'exact' | 'contains' | 'regex'
          match_value: string
          category: string
          priority: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          match_type: 'exact' | 'contains' | 'regex'
          match_value: string
          category: string
          priority?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          match_type?: 'exact' | 'contains' | 'regex'
          match_value?: string
          category?: string
          priority?: number
          created_at?: string
        }
      }
      categorization_exclusions: {
        Row: {
          id: string
          user_id: string
          scope: 'transaction' | 'merchant'
          transaction_id: string | null
          merchant_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scope: 'transaction' | 'merchant'
          transaction_id?: string | null
          merchant_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scope?: 'transaction' | 'merchant'
          transaction_id?: string | null
          merchant_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      credit_fixes: {
        Row: {
          id: string
          user_id: string
          item: string
          amount: number | null
          status: string | null
          bureau: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          item: string
          amount?: number | null
          status?: string | null
          bureau?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          item?: string
          amount?: number | null
          status?: string | null
          bureau?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      net_worth_snapshots: {
        Row: {
          id: string
          user_id: string
          date: string
          net_worth: number
          assets: number
          debts: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          net_worth: number
          assets: number
          debts: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          net_worth?: number
          assets?: number
          debts?: number
          created_at?: string
        }
      }
      user_feedback: {
        Row: {
          id: string
          user_id: string
          type: string
          rating: number | null
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          rating?: number | null
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          rating?: number | null
          message?: string
          created_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          ticket_number: string
          subject: string
          description: string
          department: string
          priority: 'Low' | 'Normal' | 'Urgent'
          status: 'Open' | 'In Progress' | 'Resolved'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticket_number?: string
          subject: string
          description: string
          department?: string
          priority?: 'Low' | 'Normal' | 'Urgent'
          status?: 'Open' | 'In Progress' | 'Resolved'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticket_number?: string
          subject?: string
          description?: string
          department?: string
          priority?: 'Low' | 'Normal' | 'Urgent'
          status?: 'Open' | 'In Progress' | 'Resolved'
          created_at?: string
          updated_at?: string
        }
      }
      admin_broadcasts: {
        Row: {
          id: string
          title: string
          content: string
          type: 'info' | 'warning' | 'error'
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          type?: 'info' | 'warning' | 'error'
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          type?: 'info' | 'warning' | 'error'
          created_at?: string
        }
      }
      platform_settings: {
        Row: {
          id: string
          maintenance_mode: boolean
          plaid_enabled: boolean
          broadcast_message: string
          feature_flags: Json
          tax_standard_deduction: number
          tax_top_bracket: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          maintenance_mode?: boolean
          plaid_enabled?: boolean
          broadcast_message?: string
          feature_flags?: Json
          tax_standard_deduction?: number
          tax_top_bracket?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          maintenance_mode?: boolean
          plaid_enabled?: boolean
          broadcast_message?: string
          feature_flags?: Json
          tax_standard_deduction?: number
          tax_top_bracket?: number
          created_at?: string
          updated_at?: string
        }
      }
      credit_factors: {
        Row: {
          id: string
          user_id: string
          name: string
          impact: 'high' | 'medium' | 'low'
          status: 'excellent' | 'good' | 'fair' | 'poor'
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          impact: 'high' | 'medium' | 'low'
          status: 'excellent' | 'good' | 'fair' | 'poor'
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          impact?: 'high' | 'medium' | 'low'
          status?: 'excellent' | 'good' | 'fair' | 'poor'
          description?: string
          created_at?: string
        }
      }
      document_capture_sessions: {
        Row: {
          id: string
          user_id: string
          token: string
          status: 'idle' | 'pending' | 'active' | 'completed' | 'error'
          uploaded_file_url: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token?: string
          status?: 'idle' | 'pending' | 'active' | 'completed' | 'error'
          uploaded_file_url?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          status?: 'idle' | 'pending' | 'active' | 'completed' | 'error'
          uploaded_file_url?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          table_name: string
          record_id: string | null
          action: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          table_name: string
          record_id?: string | null
          action: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          table_name?: string
          record_id?: string | null
          action?: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
      moderation_queue: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          submitted_by: string | null
          report_reason: string | null
          status: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderator_note: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          submitted_by?: string | null
          report_reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderator_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          submitted_by?: string | null
          report_reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'flagged'
          moderator_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
      }
      system_notifications: {
        Row: {
          id: string
          type: string
          title: string
          body: string
          source: string | null
          severity: 'info' | 'warning' | 'critical'
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type?: string
          title: string
          body: string
          source?: string | null
          severity?: 'info' | 'warning' | 'critical'
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          body?: string
          source?: string | null
          severity?: 'info' | 'warning' | 'critical'
          is_read?: boolean
          created_at?: string
        }
      }
      admin_roles: {
        Row: {
          id: string
          key: string
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          created_at?: string
        }
      }
      admin_user_roles: {
        Row: {
          user_id: string
          role_id: string
          assigned_by: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          role_id: string
          assigned_by?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          role_id?: string
          assigned_by?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          table_name: string
          record_id: string | null
          action: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
      }
    }
    Functions: {
      get_closed_beta_public: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      flip_overdue_bills: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      find_user_id_by_google_sub: {
        Args: { lookup_sub: string }
        Returns: string | null
      }
      risc_revoke_user_sessions: {
        Args: { target_user: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
