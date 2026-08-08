-- Migration: Add price_comparisons table for AI price intelligence feature
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS price_comparisons (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  our_price DECIMAL(10,2),
  petlove_price DECIMAL(10,2),
  cobasi_price DECIMAL(10,2),
  petz_price DECIMAL(10,2),
  cheapest_competitor DECIMAL(10,2),
  difference_amount DECIMAL(10,2),
  difference_percentage DECIMAL(6,2),
  alert_type TEXT DEFAULT 'no_data', -- 'expensive', 'cheap', 'competitive', 'no_data', 'error'
  note TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_comparisons_product_id ON price_comparisons(product_id);
CREATE INDEX IF NOT EXISTS idx_price_comparisons_checked_at ON price_comparisons(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_comparisons_alert_type ON price_comparisons(alert_type);
