-- Migration: 001_add_financial_depth
-- Adds optional financial depth columns to debts and assets tables.
-- All columns use IF NOT EXISTS for safe re-runs.
-- Apply this in the Supabase SQL Editor or via Supabase CLI.

-- Debts: amortization support
ALTER TABLE debts ADD COLUMN IF NOT EXISTS original_amount  DECIMAL(12,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS origination_date DATE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS term_months      INTEGER;

-- Assets: appreciation modeling
ALTER TABLE assets ADD COLUMN IF NOT EXISTS appreciation_rate DECIMAL(7,4) DEFAULT 0;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_price    DECIMAL(12,2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date     DATE;
