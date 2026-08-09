-- Migration: Add public contact fields (Instagram, WhatsApp) to affiliates
-- Run this in the Supabase SQL editor if the affiliates table already exists
-- sem essas colunas (bancos criados antes desta mudança).

ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
