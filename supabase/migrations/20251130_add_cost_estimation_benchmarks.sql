-- Migration: Add cost estimation benchmark tables
-- Purpose: Enable LTI vs MTI cost comparison for workplace incidents
-- Based on Safe Work Australia 2024 data and Australian workers' compensation schemes

-- =====================================================
-- 1. INJURY BENCHMARKS TABLE
-- Stores median durations and medical costs by injury type and body region
-- =====================================================
CREATE TABLE IF NOT EXISTS injury_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_type TEXT NOT NULL,           -- 'Fracture', 'Laceration', 'Sprain', 'Contusion', 'Burn', 'Eye Injury'
  body_region TEXT NOT NULL,           -- 'Upper Limb', 'Lower Limb', 'Back/Spine', 'Head/Neck', 'Hand', 'Eye', 'General'
  median_weeks_lti DECIMAL(4,1) NOT NULL,      -- Median weeks off work if LTI
  median_weeks_mti DECIMAL(4,1) NOT NULL,      -- Median weeks on light duties if MTI
  medical_cost_lti DECIMAL(10,2) NOT NULL,     -- Typical medical costs for LTI
  medical_cost_mti DECIMAL(10,2) NOT NULL,     -- Typical medical costs for MTI (less intensive)
  severity_modifier_minor DECIMAL(3,2) DEFAULT 0.6,   -- Multiply duration by this for minor severity
  severity_modifier_moderate DECIMAL(3,2) DEFAULT 1.0,
  severity_modifier_severe DECIMAL(3,2) DEFAULT 1.5,
  source TEXT DEFAULT 'Safe Work Australia 2024',
  data_version TEXT DEFAULT '2024.1',
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(injury_type, body_region)
);

-- =====================================================
-- 2. ROLE COSTS TABLE
-- Stores weekly wage and replacement costs by worker role and state
-- =====================================================
CREATE TABLE IF NOT EXISTS role_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_category TEXT NOT NULL,         -- 'Labourer', 'Tradesperson', 'Supervisor', 'Operator', 'Administration'
  state TEXT NOT NULL,                 -- 'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'
  weekly_piawe DECIMAL(10,2) NOT NULL, -- Pre-Injury Average Weekly Earnings (typical)
  weekly_replacement DECIMAL(10,2) NOT NULL, -- Fully-loaded labour hire cost
  source TEXT DEFAULT 'Industry benchmarks 2024',
  data_version TEXT DEFAULT '2024.1',
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_category, state)
);

-- =====================================================
-- 3. SCHEME PARAMETERS TABLE
-- Stores workers' compensation scheme parameters by state
-- =====================================================
CREATE TABLE IF NOT EXISTS scheme_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT UNIQUE NOT NULL,
  weekly_comp_rate_first_13 DECIMAL(4,2) DEFAULT 0.95,  -- 95% of PIAWE for first 13 weeks
  weekly_comp_rate_after_13 DECIMAL(4,2) DEFAULT 0.80,  -- 80% of PIAWE after 13 weeks
  max_weekly_compensation DECIMAL(10,2) NOT NULL,       -- Weekly cap
  indirect_multiplier_lti DECIMAL(3,1) DEFAULT 2.0,     -- Apply to direct costs for LTI
  indirect_multiplier_mti DECIMAL(3,1) DEFAULT 1.5,     -- Apply to direct costs for MTI
  premium_impact_multiplier DECIMAL(3,1) DEFAULT 1.5,   -- 3-year premium impact factor
  source TEXT DEFAULT 'State workers compensation authority 2024',
  data_version TEXT DEFAULT '2024.1',
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_injury_benchmarks_lookup 
  ON injury_benchmarks(injury_type, body_region);
  
CREATE INDEX IF NOT EXISTS idx_role_costs_lookup 
  ON role_costs(role_category, state);

-- =====================================================
-- 5. SEED DATA - INJURY BENCHMARKS
-- Based on Safe Work Australia Key WHS Statistics 2024
-- Construction-specific data from icare NSW, WorkSafe QLD/VIC
-- RTW timeframes from WorkSafe Queensland research
-- =====================================================
INSERT INTO injury_benchmarks (injury_type, body_region, median_weeks_lti, median_weeks_mti, medical_cost_lti, medical_cost_mti) VALUES
-- Fractures - Construction median $19,199
-- Lower limb fractures require 1.3x time (mobility loss prevents RTW)
('Fracture', 'Upper Limb', 8.0, 4.0, 19200, 8000),           -- Arm/wrist - standard benchmark
('Fracture', 'Lower Limb', 12.0, 7.0, 23500, 10000),         -- Foot/ankle/leg - HIGH COST due to mobility
('Fracture', 'Back/Spine', 14.0, 8.0, 25000, 12000),         -- Spinal fractures - highest cost
('Fracture', 'Head/Neck', 12.0, 7.0, 22000, 10000),
('Fracture', 'Hand', 6.5, 3.5, 13500, 6000),                 -- Hand/finger - $12k-15k median
('Fracture', 'General', 8.5, 4.5, 18500, 8000),              -- Overall construction median

-- Lacerations - High frequency, low severity
-- Hand accounts for 50%+ of all lacerations
('Laceration', 'Hand', 3.8, 1.5, 9600, 3500),                -- Fast RTW possible
('Laceration', 'Upper Limb', 4.0, 1.5, 11000, 4000),
('Laceration', 'Lower Limb', 4.0, 1.5, 11000, 4000),
('Laceration', 'Eye', 3.0, 1.0, 8000, 3000),
('Laceration', 'Head/Neck', 4.0, 1.5, 11000, 4000),
('Laceration', 'General', 4.0, 1.5, 11000, 4000),

-- Sprains - Most common musculoskeletal (41% of claims)
-- Shoulder highest cost ($22.4k), knee comparable ($19.5k)
('Sprain', 'Back/Spine', 8.8, 3.0, 13350, 5000),             -- Back: high freq, lower median cost
('Sprain', 'Upper Limb', 10.0, 5.0, 22400, 9000),            -- Shoulder: HIGHEST severity, often surgery
('Sprain', 'Lower Limb', 9.5, 4.5, 19500, 8000),             -- Knee: ACL/MCL involvement
('Sprain', 'Hand', 5.0, 2.0, 8000, 3500),
('Sprain', 'Head/Neck', 7.0, 3.5, 12000, 5000),              -- Neck strain
('Sprain', 'General', 8.5, 3.5, 15000, 6000),

-- Strains - Muscle/tendon injuries (back strain most common)
('Strain', 'Back/Spine', 6.0, 2.5, 13350, 5000),             -- WorkSafe: 4-8 weeks unmanaged
('Strain', 'Upper Limb', 9.5, 5.0, 22400, 9000),             -- Rotator cuff: 6-12 weeks unmanaged
('Strain', 'Lower Limb', 6.0, 3.0, 12000, 5000),
('Strain', 'Hand', 4.0, 2.0, 8000, 3500),
('Strain', 'Head/Neck', 6.0, 3.0, 12000, 5000),
('Strain', 'General', 6.0, 3.0, 12000, 5000),

-- Contusions/Crush - $11,000 median
('Contusion', 'General', 5.0, 2.0, 11000, 4500),
('Contusion', 'Back/Spine', 5.5, 2.5, 12000, 5000),
('Contusion', 'Upper Limb', 4.5, 2.0, 10000, 4000),
('Contusion', 'Lower Limb', 5.0, 2.0, 11000, 4500),
('Contusion', 'Head/Neck', 5.5, 2.5, 13000, 5500),
('Contusion', 'Hand', 4.0, 1.5, 9000, 3500),

-- Burns - workplace specific
('Burn', 'Hand', 4.0, 2.0, 10000, 4000),
('Burn', 'Upper Limb', 5.0, 2.5, 12000, 5000),
('Burn', 'Lower Limb', 4.5, 2.0, 11000, 4500),
('Burn', 'Eye', 3.5, 1.5, 8000, 3000),
('Burn', 'General', 4.0, 2.0, 10000, 4000),

-- Eye Injuries - Very short duration
-- Foreign body: 1.5 weeks, $2.5k-4k (59% of eye injuries)
-- Chemical/trauma: 3-4 weeks, $8k+
('Eye Injury', 'Eye', 2.5, 1.0, 5000, 2000),

-- Crushing - Higher severity than contusion
('Crushing', 'Hand', 6.5, 3.5, 15000, 7000),
('Crushing', 'Upper Limb', 7.5, 4.0, 17000, 8000),
('Crushing', 'Lower Limb', 8.5, 4.5, 19000, 9000),
('Crushing', 'General', 7.0, 3.5, 15000, 7000),

-- Dislocation
('Dislocation', 'Upper Limb', 8.0, 4.0, 18000, 8000),
('Dislocation', 'Lower Limb', 10.0, 5.0, 22000, 10000),
('Dislocation', 'Hand', 6.0, 3.0, 12000, 5500),
('Dislocation', 'General', 7.0, 3.5, 16000, 7000)
ON CONFLICT (injury_type, body_region) DO UPDATE SET
  median_weeks_lti = EXCLUDED.median_weeks_lti,
  median_weeks_mti = EXCLUDED.median_weeks_mti,
  medical_cost_lti = EXCLUDED.medical_cost_lti,
  medical_cost_mti = EXCLUDED.medical_cost_mti,
  last_updated = CURRENT_DATE,
  updated_at = NOW();

-- =====================================================
-- 6. SEED DATA - ROLE COSTS
-- Based on Fair Work awards and labour hire market rates 2024
-- =====================================================
INSERT INTO role_costs (role_category, state, weekly_piawe, weekly_replacement) VALUES
-- Labourer rates by state
('Labourer', 'NSW', 2000, 2100),
('Labourer', 'VIC', 2000, 2200),
('Labourer', 'QLD', 1900, 2000),
('Labourer', 'WA', 2100, 2300),
('Labourer', 'SA', 1850, 1950),
('Labourer', 'TAS', 1800, 1900),
('Labourer', 'NT', 2150, 2350),
('Labourer', 'ACT', 2050, 2150),

-- Tradesperson rates by state (carpenters, electricians, plumbers)
('Tradesperson', 'NSW', 2400, 4200),
('Tradesperson', 'VIC', 2400, 4400),
('Tradesperson', 'QLD', 2300, 4000),
('Tradesperson', 'WA', 2600, 4800),
('Tradesperson', 'SA', 2200, 3800),
('Tradesperson', 'TAS', 2150, 3700),
('Tradesperson', 'NT', 2700, 5000),
('Tradesperson', 'ACT', 2500, 4300),

-- Supervisor rates by state
('Supervisor', 'NSW', 2800, 3500),
('Supervisor', 'VIC', 2800, 3600),
('Supervisor', 'QLD', 2700, 3400),
('Supervisor', 'WA', 3000, 3800),
('Supervisor', 'SA', 2600, 3200),
('Supervisor', 'TAS', 2500, 3100),
('Supervisor', 'NT', 3100, 3900),
('Supervisor', 'ACT', 2900, 3600),

-- Plant/Equipment Operator rates by state
('Operator', 'NSW', 2200, 3200),
('Operator', 'VIC', 2200, 3300),
('Operator', 'QLD', 2100, 3100),
('Operator', 'WA', 2400, 3600),
('Operator', 'SA', 2050, 3000),
('Operator', 'TAS', 2000, 2900),
('Operator', 'NT', 2500, 3700),
('Operator', 'ACT', 2300, 3400),

-- Administration/Office rates by state
('Administration', 'NSW', 1800, 2400),
('Administration', 'VIC', 1800, 2500),
('Administration', 'QLD', 1700, 2300),
('Administration', 'WA', 1900, 2600),
('Administration', 'SA', 1650, 2200),
('Administration', 'TAS', 1600, 2100),
('Administration', 'NT', 1950, 2700),
('Administration', 'ACT', 1850, 2500)
ON CONFLICT (role_category, state) DO UPDATE SET
  weekly_piawe = EXCLUDED.weekly_piawe,
  weekly_replacement = EXCLUDED.weekly_replacement,
  last_updated = CURRENT_DATE,
  updated_at = NOW();

-- =====================================================
-- 7. SEED DATA - SCHEME PARAMETERS
-- Based on icare NSW 2024-25 and WorkSafe Victoria 2024
-- =====================================================
INSERT INTO scheme_parameters (state, max_weekly_compensation, indirect_multiplier_lti, indirect_multiplier_mti, premium_impact_multiplier, source) VALUES
('NSW', 2523, 2.0, 1.5, 1.8, 'icare NSW Premium Rates 2024-25'),
('VIC', 2800, 2.0, 1.5, 1.6, 'WorkSafe Victoria Gazette 2024'),
('QLD', 2700, 2.0, 1.5, 1.5, 'WorkCover Queensland 2024'),
('WA', 2600, 2.0, 1.5, 1.5, 'WorkCover WA 2024'),
('SA', 2500, 2.0, 1.5, 1.5, 'ReturnToWorkSA 2024'),
('TAS', 2400, 2.0, 1.5, 1.5, 'WorkCover Tasmania 2024'),
('NT', 2550, 2.0, 1.5, 1.5, 'NT WorkSafe 2024'),
('ACT', 2523, 2.0, 1.5, 1.7, 'ACT Workers Compensation 2024')
ON CONFLICT (state) DO UPDATE SET
  max_weekly_compensation = EXCLUDED.max_weekly_compensation,
  indirect_multiplier_lti = EXCLUDED.indirect_multiplier_lti,
  indirect_multiplier_mti = EXCLUDED.indirect_multiplier_mti,
  premium_impact_multiplier = EXCLUDED.premium_impact_multiplier,
  source = EXCLUDED.source,
  last_updated = CURRENT_DATE,
  updated_at = NOW();

-- =====================================================
-- 8. RLS POLICIES - Allow read access for authenticated users
-- =====================================================

-- Enable RLS
ALTER TABLE injury_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_parameters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to injury_benchmarks" ON injury_benchmarks;
DROP POLICY IF EXISTS "Allow read access to role_costs" ON role_costs;
DROP POLICY IF EXISTS "Allow read access to scheme_parameters" ON scheme_parameters;

-- Create read policies - benchmark data is public/reference data
CREATE POLICY "Allow read access to injury_benchmarks" 
  ON injury_benchmarks FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow read access to role_costs" 
  ON role_costs FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow read access to scheme_parameters" 
  ON scheme_parameters FOR SELECT 
  TO authenticated 
  USING (true);

-- =====================================================
-- 9. HELPER FUNCTION - Get cost estimation parameters
-- Returns all benchmark data needed for a cost calculation
-- =====================================================
CREATE OR REPLACE FUNCTION get_cost_estimation_params(
  p_injury_type TEXT,
  p_body_region TEXT,
  p_state TEXT DEFAULT 'NSW',
  p_role_category TEXT DEFAULT 'Labourer'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_injury_benchmark RECORD;
  v_role_cost RECORD;
  v_scheme_params RECORD;
BEGIN
  -- Get injury benchmark (with fallback to General body region)
  SELECT * INTO v_injury_benchmark
  FROM injury_benchmarks
  WHERE injury_type = p_injury_type
    AND body_region = p_body_region;
    
  -- Fallback to General if no specific match
  IF v_injury_benchmark IS NULL THEN
    SELECT * INTO v_injury_benchmark
    FROM injury_benchmarks
    WHERE injury_type = p_injury_type
      AND body_region = 'General';
  END IF;
  
  -- If still no match, use conservative defaults
  IF v_injury_benchmark IS NULL THEN
    v_injury_benchmark := ROW(
      NULL, p_injury_type, p_body_region, 
      6.0, 3.0, 4000, 2000,  -- median weeks and medical costs
      0.6, 1.0, 1.5,  -- severity modifiers
      'Default values', '2024.1', CURRENT_DATE, NOW(), NOW()
    );
  END IF;
  
  -- Get role costs (with fallback to Labourer)
  SELECT * INTO v_role_cost
  FROM role_costs
  WHERE role_category = p_role_category
    AND state = p_state;
    
  IF v_role_cost IS NULL THEN
    SELECT * INTO v_role_cost
    FROM role_costs
    WHERE role_category = 'Labourer'
      AND state = p_state;
  END IF;
  
  IF v_role_cost IS NULL THEN
    SELECT * INTO v_role_cost
    FROM role_costs
    WHERE role_category = 'Labourer'
      AND state = 'NSW';
  END IF;
  
  -- Get scheme parameters (with fallback to NSW)
  SELECT * INTO v_scheme_params
  FROM scheme_parameters
  WHERE state = p_state;
    
  IF v_scheme_params IS NULL THEN
    SELECT * INTO v_scheme_params
    FROM scheme_parameters
    WHERE state = 'NSW';
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'injury_benchmark', json_build_object(
      'injury_type', v_injury_benchmark.injury_type,
      'body_region', v_injury_benchmark.body_region,
      'median_weeks_lti', v_injury_benchmark.median_weeks_lti,
      'median_weeks_mti', v_injury_benchmark.median_weeks_mti,
      'medical_cost_lti', v_injury_benchmark.medical_cost_lti,
      'medical_cost_mti', v_injury_benchmark.medical_cost_mti,
      'severity_modifier_minor', v_injury_benchmark.severity_modifier_minor,
      'severity_modifier_moderate', v_injury_benchmark.severity_modifier_moderate,
      'severity_modifier_severe', v_injury_benchmark.severity_modifier_severe,
      'source', v_injury_benchmark.source
    ),
    'role_cost', json_build_object(
      'role_category', v_role_cost.role_category,
      'state', v_role_cost.state,
      'weekly_piawe', v_role_cost.weekly_piawe,
      'weekly_replacement', v_role_cost.weekly_replacement
    ),
    'scheme_params', json_build_object(
      'state', v_scheme_params.state,
      'weekly_comp_rate_first_13', v_scheme_params.weekly_comp_rate_first_13,
      'weekly_comp_rate_after_13', v_scheme_params.weekly_comp_rate_after_13,
      'max_weekly_compensation', v_scheme_params.max_weekly_compensation,
      'indirect_multiplier_lti', v_scheme_params.indirect_multiplier_lti,
      'indirect_multiplier_mti', v_scheme_params.indirect_multiplier_mti,
      'premium_impact_multiplier', v_scheme_params.premium_impact_multiplier,
      'source', v_scheme_params.source
    )
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cost_estimation_params TO authenticated;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE injury_benchmarks IS 'Benchmark data for injury durations and medical costs by injury type and body region. Based on Safe Work Australia statistics.';
COMMENT ON TABLE role_costs IS 'Weekly wage and replacement labour costs by worker role category and Australian state.';
COMMENT ON TABLE scheme_parameters IS 'Workers compensation scheme parameters by Australian state including weekly caps and multipliers.';
COMMENT ON FUNCTION get_cost_estimation_params IS 'Returns all benchmark parameters needed for incident cost estimation in a single call.';

