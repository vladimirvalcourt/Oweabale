#!/usr/bin/env node

/**
 * RLS Policy Audit Script
 * Checks if all required tables have Row Level Security enabled
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables that MUST have RLS policies
const REQUIRED_TABLES = [
    'profiles',
    'bills',
    'debts',
    'transactions',
    'assets',
    'incomes',
    'subscriptions',
    'goals',
    'budgets',
    'categories',
    'citations',
    'deductions',
    'freelance_entries',
    'mileage_log',
    'client_invoices',
    'pending_ingestions',
    'categorization_exclusions',
    'credit_fixes',
    'net_worth_snapshots',
    'plaid_accounts',
];

async function checkRLS() {
    console.log('🔍 Auditing Row Level Security Policies...\n');

    const results = [];

    for (const table of REQUIRED_TABLES) {
        try {
            // Check if RLS is enabled
            const { data: tableInfo, error: tableError } = await supabase
                .from('pg_tables')
                .select('tablename, rowsecurity')
                .eq('tablename', table)
                .eq('schemaname', 'public')
                .single();

            if (tableError || !tableInfo) {
                results.push({
                    table,
                    status: '❌ MISSING',
                    rlsEnabled: false,
                    policyCount: 0,
                    details: 'Table not found or query failed'
                });
                continue;
            }

            // Count policies
            const { data: policies, error: policyError } = await supabase
                .from('pg_policies')
                .select('policyname')
                .eq('tablename', table)
                .eq('schemaname', 'public');

            const policyCount = policies?.length || 0;
            const rlsEnabled = tableInfo.rowsecurity;

            let status = '✅ OK';
            if (!rlsEnabled) {
                status = '⚠️  RLS DISABLED';
            } else if (policyCount === 0) {
                status = '⚠️  NO POLICIES';
            }

            results.push({
                table,
                status,
                rlsEnabled,
                policyCount,
                details: `${policyCount} policies`
            });

        } catch (error) {
            results.push({
                table,
                status: '❌ ERROR',
                rlsEnabled: false,
                policyCount: 0,
                details: error.message
            });
        }
    }

    // Print results
    console.log('Table Name'.padEnd(30), 'Status'.padEnd(20), 'Details');
    console.log('='.repeat(70));

    results.forEach(({ table, status, details }) => {
        console.log(table.padEnd(30), status.padEnd(20), details);
    });

    console.log('\n' + '='.repeat(70));

    // Summary
    const missing = results.filter(r => r.status.includes('MISSING'));
    const disabled = results.filter(r => r.status.includes('DISABLED'));
    const noPolicies = results.filter(r => r.status.includes('NO POLICIES'));
    const errors = results.filter(r => r.status.includes('ERROR'));

    console.log(`\n📊 Summary:`);
    console.log(`   Total tables checked: ${results.length}`);
    console.log(`   ✅ OK: ${results.filter(r => r.status === '✅ OK').length}`);
    console.log(`   ⚠️  RLS Disabled: ${disabled.length}`);
    console.log(`   ⚠️  No Policies: ${noPolicies.length}`);
    console.log(`   ❌ Missing: ${missing.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (missing.length > 0 || disabled.length > 0 || noPolicies.length > 0) {
        console.log('\n⚠️  WARNING: Some tables are missing RLS policies!');
        console.log('This could cause data fetching issues or security vulnerabilities.');
        console.log('\nTo fix: Enable RLS and add policies in Supabase Dashboard → Authentication → Policies');
        process.exit(1);
    } else {
        console.log('\n✅ All tables have proper RLS configuration!');
        process.exit(0);
    }
}

checkRLS().catch(error => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
});
