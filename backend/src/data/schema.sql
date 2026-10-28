-- ========================================================
-- JANSETU (CIVICSAMADHAN) - SUPABASE DATABASE SCHEMA
-- Copy and paste this directly into Supabase SQL Editor and click 'Run'.
-- ========================================================

-- 1. Issues Table (Civic complaints lifecycle)
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'Moderate',
  status TEXT DEFAULT 'Pending',
  location_address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  image_url TEXT,
  reported_by JSONB,
  assigned_to JSONB,
  resolution JSONB,
  ai_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contractors Table (Authorized civic vendors)
CREATE TABLE IF NOT EXISTS contractors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 4.5,
  completed_jobs INT DEFAULT 0,
  active_jobs INT DEFAULT 0,
  avg_turnaround_hours NUMERIC(4,1) DEFAULT 24.0
);

-- 3. Leaderboard Table (Gamified citizen points & Web3 badges)
CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE,
  name TEXT NOT NULL,
  points INT DEFAULT 0,
  issues_resolved INT DEFAULT 0,
  badge TEXT,
  tier TEXT DEFAULT 'Bronze'
);

-- Row Level Security (RLS) Policies for Public Hackathon Demo
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on issues" ON issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert on issues" ON issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on issues" ON issues FOR UPDATE USING (true);
CREATE POLICY "Allow public read on contractors" ON contractors FOR SELECT USING (true);
CREATE POLICY "Allow public read on leaderboard" ON leaderboard FOR SELECT USING (true);

-- Seed Initial Realistic Issues
INSERT INTO contractors (id, name, category, rating, completed_jobs, active_jobs, avg_turnaround_hours)
VALUES 
  ('CONT-01', 'Apex Road Infrastructure Ltd', 'Potholes & Roads', 4.8, 142, 3, 14.5),
  ('CONT-02', 'JalSetu Pipeline Engineering', 'Water & Drainage', 4.6, 98, 2, 18.2),
  ('CONT-03', 'Urja Grid Maintenance Services', 'Electrical & Lighting', 4.9, 215, 1, 6.8),
  ('CONT-04', 'Swachh Bharat Cleaners Pvt Ltd', 'Sanitation & Waste', 4.5, 320, 5, 8.1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO leaderboard (user_id, name, points, issues_resolved, badge, tier)
VALUES
  ('USR-105', 'Rajesh Kumar', 820, 18, 'Urban Guardian 🥇', 'Platinum'),
  ('USR-101', 'Aarav Sharma (You)', 540, 11, 'Ward Hero 🥈', 'Gold'),
  ('USR-102', 'Priya Nair', 460, 9, 'Civic Sentinel 🥉', 'Silver'),
  ('USR-106', 'Dr. Manpreet Singh', 390, 8, 'Green Scout', 'Bronze')
ON CONFLICT (user_id) DO NOTHING;

