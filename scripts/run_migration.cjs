const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://horlyscpspctvceddcup.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvcmx5c2Nwc3BjdHZjZWRkY3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc1NjAzNywiZXhwIjoyMDkzMzMyMDM3fQ.zpPsDgyxnM5rE9Rvojid6Rp5ta9LL7A0FEuI6br6BfY';

// Read the SQL file
const sqlContent = fs.readFileSync('./ENSURE_ALL_TABLES.sql', 'utf8');

console.log('🚀 Executing ENSURE_ALL_TABLES.sql on Supabase...');

const postData = JSON.stringify({ query: sqlContent });

const options = {
  hostname: 'horlyscpspctvceddcup.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Prefer': 'return=minimal'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ SQL executed successfully!');
      console.log('Response:', data);
    } else {
      console.error('❌ Error executing SQL:');
      console.error('Status:', res.statusCode);
      console.error('Response:', data);
      
      // If RPC endpoint doesn't exist, try alternative method
      if (res.statusCode === 404) {
        console.log('\n⚠️  RPC endpoint not available. Use Supabase Dashboard SQL Editor instead.');
        console.log('File saved at: /Users/vladimirv/Desktop/Owebale/ENSURE_ALL_TABLES.sql');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.log('\n⚠️  Cannot connect via API. Please use Supabase Dashboard SQL Editor:');
  console.log('1. Open: https://app.supabase.com/project/horlyscpspctvceddcup/sql');
  console.log('2. Copy contents of: ENSURE_ALL_TABLES.sql');
  console.log('3. Paste and click "Run"');
});

req.write(postData);
req.end();
