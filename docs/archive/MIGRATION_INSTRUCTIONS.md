# Database Migration Instructions

## Problem
The Supabase CLI `db push` command is taking too long (9+ minutes) to apply 135 migration files to the new project.

## Solution: Use Supabase Dashboard SQL Editor

### Step 1: Open SQL Editor
1. Go to: https://supabase.com/dashboard/project/horlyscpspctvceddcup/sql/new
2. Click "New Query"

### Step 2: Run Combined Migrations
I've already combined all 135 migrations into one file at:
```
/tmp/all_migrations.sql
```

**Option A: Copy from Terminal**
```bash
cat /tmp/all_migrations.sql | pbcopy
```
Then paste into the SQL editor.

**Option B: Open in Text Editor**
```bash
open /tmp/all_migrations.sql
```
Then copy all content and paste into SQL editor.

### Step 3: Execute
1. Paste the SQL into the editor
2. Click "Run" button (or Cmd+Enter)
3. Wait for completion (should take 10-30 seconds)
4. Check for any errors in the output

### Step 4: Verify
After running, verify tables were created by running this query in the SQL editor:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

You should see all your tables: profiles, bills, debts, transactions, etc.

## Alternative: Fix CLI Issue

If you prefer using the CLI, the issue might be:
1. Network timeout
2. Large transaction size
3. Connection pooling issues

Try breaking it into smaller batches or increase timeout settings.

## Expected Result
After migrations run successfully:
- ✅ All 20+ tables created
- ✅ RLS policies enabled
- ✅ Database functions and triggers set up
- ✅ Indexes created for performance
- ✅ Dashboard will load data correctly
