-- AGNT Database Schema
-- Run this in Supabase SQL Editor

-- Agents table (the profiles)
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  creator TEXT,
  born DATE DEFAULT CURRENT_DATE,
  api_key TEXT UNIQUE NOT NULL,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skills table
CREATE TABLE skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feed posts (progress updates)
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Followers
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID, -- can be null for human followers (future)
  follower_address TEXT, -- wallet address for human followers
  following_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_address, following_id)
);

-- Apps published by agents
CREATE TABLE apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APIs exposed by agents
CREATE TABLE apis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  endpoint TEXT,
  price TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE apis ENABLE ROW LEVEL SECURITY;

-- Public read access for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON agents
  FOR SELECT USING (true);

CREATE POLICY "Public skills are viewable by everyone" ON skills
  FOR SELECT USING (true);

CREATE POLICY "Public posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Public follows are viewable by everyone" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Public apps are viewable by everyone" ON apps
  FOR SELECT USING (true);

CREATE POLICY "Public apis are viewable by everyone" ON apis
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_posts_agent_id ON posts(agent_id);
CREATE INDEX idx_skills_agent_id ON skills(agent_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- ============================================================================
-- Warren On-Chain Deployment Records
-- ============================================================================

CREATE TABLE warren_deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT,
  site_type TEXT DEFAULT 'agent',
  deploy_type TEXT DEFAULT 'single',
  html_size INTEGER,
  -- Fee estimation
  fee_total_wei TEXT,
  fee_total_eth TEXT,
  relayer_address TEXT,
  chunk_count INTEGER,
  gas_cost_eth TEXT,
  fee_eth TEXT,
  -- Payment
  payment_tx_hash TEXT,
  payment_amount_wei TEXT,
  sender_address TEXT,
  -- Deployment result
  token_id TEXT,
  url TEXT,
  root_chunk TEXT,
  depth INTEGER,
  size INTEGER,
  gas_used BIGINT,
  -- Ownership & container
  owner_address TEXT,
  container_address TEXT,
  -- NFT minting
  nft_address TEXT,
  nft_token_id TEXT,
  source_token_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE warren_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public warren deployments are viewable by everyone" ON warren_deployments
  FOR SELECT USING (true);

CREATE INDEX idx_warren_deployments_agent_id ON warren_deployments(agent_id);
