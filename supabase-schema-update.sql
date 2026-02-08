-- Add on-chain tracking fields to agents table
-- Run this in Supabase SQL Editor

ALTER TABLE agents ADD COLUMN IF NOT EXISTS onchain_id INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS onchain_tx TEXT;

-- Warren V2: Add container, NFT, and ownership columns
ALTER TABLE warren_deployments ADD COLUMN IF NOT EXISTS deploy_type TEXT DEFAULT 'single';
ALTER TABLE warren_deployments ADD COLUMN IF NOT EXISTS owner_address TEXT;
ALTER TABLE warren_deployments ADD COLUMN IF NOT EXISTS container_address TEXT;
ALTER TABLE warren_deployments ADD COLUMN IF NOT EXISTS nft_address TEXT;
ALTER TABLE warren_deployments ADD COLUMN IF NOT EXISTS nft_token_id TEXT;
ALTER TABLE warren_deployments ADD COLUMN IF NOT EXISTS source_token_id TEXT;

-- Container Gateway: Add warren_token_id and warren_url to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS warren_token_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS warren_url TEXT;
