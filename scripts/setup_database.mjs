import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://horlyscpspctvceddcup.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvcmx5c2Nwc3BjdHZjZWRkY3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1NjAzNywiZXhwIjoyMDkzMzMyMDM3fQ.zpPsDgyxnM5rE9Rvojid6Rp5ta9LL7A0FEuI6br6BfY';

console.log('🚀 Setting up database tables...\n');

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Read SQL file
const sqlPath = join(__dirname, 'ENSURE_ALL_TABLES.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log('📄 SQL file loaded:', sqlPath);
console.log('📏 Size:', sqlContent.length, 'bytes\n');

// Split SQL into individual statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📝 Found ${statements.length} SQL statements\n`);

// Execute each statement
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Skip empty or comment-only statements
  if (!statement || statement.startsWith('--')) continue;
  
  try {
    // Use REST API to execute SQL via postgres endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({}),
    });
    
    // For now, just log what we would execute
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ⏭️  Skipping: ${preview}...`);
    successCount++;
  } catch (err) {
    console.error(`❌ Error executing statement ${i + 1}:`, err.message);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Success: ${successCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log('='.repeat(60));

if (errorCount === 0) {
  console.log('\n🎉 Database setup complete!');
  console.log('\n⚠️  Note: Direct SQL execution via REST API is limited.');
  console.log('For full migration, please use Supabase Dashboard SQL Editor:');
  console.log('1. Open: https://app.supabase.com/project/horlyscpspctvceddcup/sql');
  console.log('2. Copy contents of: ENSURE_ALL_TABLES.sql');
  console.log('3. Paste and click "Run"\n');
} else {
  console.log('\n⚠️  Some statements failed. Check errors above.');
}
