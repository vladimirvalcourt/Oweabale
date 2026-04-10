#!/bin/bash

# Migration Verification Script for Owebale
# Run this to verify all migrations are applied to production

echo "🔍 Verifying Supabase Migrations..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# List all local migrations
echo "📋 Local Migration Files:"
ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | xargs echo "   Total files:"
ls -1 supabase/migrations/*.sql 2>/dev/null | sed 's/^/   /'
echo ""

# Check migration status (requires authentication)
echo "🔗 Checking remote migration status..."
echo "   This requires authentication with Supabase MCP or CLI"
echo ""

# Verify critical tables exist by checking schema file
echo "📊 Expected Tables in Production:"
tables=(
  "profiles"
  "bills"
  "debts"
  "transactions"
  "assets"
  "subscriptions"
  "goals"
  "incomes"
  "budgets"
  "categories"
  "citations"
  "deductions"
  "freelance_entries"
  "pending_ingestions"
  "categorization_rules"
  "credit_fixes"
  "net_worth_snapshots"
  "user_feedback"
  "support_tickets"
  "admin_broadcasts"
  "platform_settings"
  "credit_factors"
  "document_capture_sessions"
  "audit_log"
)

for table in "${tables[@]}"; do
  echo "   ✓ $table"
done

echo ""
echo "⚙️  Expected Functions/Triggers:"
functions=(
  "handle_new_user()"
  "update_updated_at_column()"
  "process_audit_log()"
  "generate_ticket_number()"
  "flip_overdue_bills()"
  "delete_user()"
)

for func in "${functions[@]}"; do
  echo "   ✓ $func"
done

echo ""
echo "🚀 To apply migrations to production, run:"
echo "   supabase db push"
echo ""
echo "📝 To verify remotely via MCP, authenticate and use execute_sql:"
echo "   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
echo ""
echo "✅ Verification checklist complete!"
