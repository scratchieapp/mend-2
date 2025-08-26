-- =====================================================================
-- INCIDENT COST ESTIMATION SYSTEM
-- Date: 2025-08-28
-- Purpose: Implement comprehensive cost estimation for workplace incidents
-- 
-- This migration:
-- 1. Adds estimated_cost and psychosocial_factors columns to incidents
-- 2. Creates cost_assumptions table for configurable rates
-- 3. Creates calculation functions and audit logging
-- 4. Populates initial cost estimates based on research
-- =====================================================================

-- =============================================================================
-- STEP 1: ADD COST-RELATED COLUMNS TO INCIDENTS TABLE
-- =============================================================================
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS cost_override DECIMAL(12, 2), -- Manual override value
ADD COLUMN IF NOT EXISTS cost_calculation_method VARCHAR(50) DEFAULT 'automatic',
ADD COLUMN IF NOT EXISTS cost_last_calculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS psychosocial_factors JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS indirect_costs JSONB DEFAULT '{}'; -- Breakdown of indirect costs

-- Add comments for documentation
COMMENT ON COLUMN public.incidents.estimated_cost IS 'Automatically calculated estimated cost based on incident factors';
COMMENT ON COLUMN public.incidents.cost_override IS 'Manual override for estimated cost - takes precedence over calculated value';
COMMENT ON COLUMN public.incidents.cost_calculation_method IS 'Method used: automatic, manual, hybrid';
COMMENT ON COLUMN public.incidents.psychosocial_factors IS 'JSON data for psychosocial impact factors';
COMMENT ON COLUMN public.incidents.indirect_costs IS 'Breakdown of indirect costs (productivity, replacement, admin, etc.)';

-- =============================================================================
-- STEP 2: CREATE COST ASSUMPTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cost_assumptions (
    assumption_id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    key VARCHAR(100) NOT NULL,
    value DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(50), -- e.g., 'per_day', 'per_incident', 'percentage'
    description TEXT,
    source TEXT, -- Research source or reference
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(user_id),
    updated_by UUID REFERENCES public.users(user_id),
    
    -- Ensure unique active assumptions per key
    CONSTRAINT unique_active_assumption UNIQUE (category, key, effective_from)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cost_assumptions_category ON public.cost_assumptions(category);
CREATE INDEX IF NOT EXISTS idx_cost_assumptions_active ON public.cost_assumptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cost_assumptions_key ON public.cost_assumptions(key);

-- =============================================================================
-- STEP 3: CREATE COST CALCULATION AUDIT TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.incident_cost_calculations (
    calculation_id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES public.incidents(incident_id) ON DELETE CASCADE,
    calculated_cost DECIMAL(12, 2) NOT NULL,
    calculation_breakdown JSONB NOT NULL, -- Detailed breakdown of calculation
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculated_by UUID REFERENCES public.users(user_id),
    calculation_version VARCHAR(20) DEFAULT '1.0',
    notes TEXT,
    
    -- Index for performance
    CONSTRAINT fk_incident FOREIGN KEY (incident_id) REFERENCES public.incidents(incident_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_calculations_incident ON public.incident_cost_calculations(incident_id);
CREATE INDEX IF NOT EXISTS idx_cost_calculations_date ON public.incident_cost_calculations(calculation_date DESC);

-- =============================================================================
-- STEP 4: INSERT INITIAL COST ASSUMPTIONS
-- Based on Safe Work Australia and industry research
-- =============================================================================

-- Base costs by incident classification
INSERT INTO public.cost_assumptions (category, key, value, unit, description, source) VALUES
-- Incident type base costs (Australian averages)
('incident_type', 'FAT', 2500000.00, 'per_incident', 'Average cost of workplace fatality', 'Safe Work Australia 2024'),
('incident_type', 'LTI', 85000.00, 'per_incident', 'Average cost of Lost Time Injury', 'Safe Work Australia 2024'),
('incident_type', 'MTI', 15000.00, 'per_incident', 'Average cost of Medical Treatment Injury', 'Safe Work Australia 2024'),
('incident_type', 'FAI', 2500.00, 'per_incident', 'Average cost of First Aid Injury', 'Safe Work Australia 2024'),
('incident_type', 'NM', 500.00, 'per_incident', 'Average cost of Near Miss investigation', 'Industry benchmark'),
('incident_type', 'PD', 25000.00, 'per_incident', 'Average cost of Property Damage', 'Industry benchmark'),

-- Daily costs for lost time
('daily_costs', 'lost_time_day', 1500.00, 'per_day', 'Cost per day of lost time (includes replacement worker)', 'Safe Work Australia 2024'),
('daily_costs', 'restricted_duty_day', 750.00, 'per_day', 'Cost per day of restricted/light duty', 'Industry benchmark'),
('daily_costs', 'productivity_loss', 2000.00, 'per_day', 'Team productivity loss per day', 'Industry research'),

-- Body part multipliers (severity factors)
('body_part_multiplier', 'head', 2.5, 'multiplier', 'Head injuries typically more severe', 'Medical cost analysis'),
('body_part_multiplier', 'neck', 2.2, 'multiplier', 'Neck injuries often have long recovery', 'Medical cost analysis'),
('body_part_multiplier', 'back', 2.0, 'multiplier', 'Back injuries common and costly', 'Medical cost analysis'),
('body_part_multiplier', 'eye', 1.8, 'multiplier', 'Eye injuries require specialist care', 'Medical cost analysis'),
('body_part_multiplier', 'hand', 1.5, 'multiplier', 'Hand injuries impact work ability', 'Medical cost analysis'),
('body_part_multiplier', 'knee', 1.7, 'multiplier', 'Knee injuries often require surgery', 'Medical cost analysis'),
('body_part_multiplier', 'shoulder', 1.6, 'multiplier', 'Shoulder injuries have long recovery', 'Medical cost analysis'),
('body_part_multiplier', 'ankle', 1.4, 'multiplier', 'Ankle injuries moderate severity', 'Medical cost analysis'),
('body_part_multiplier', 'arm', 1.3, 'multiplier', 'Arm injuries variable severity', 'Medical cost analysis'),
('body_part_multiplier', 'leg', 1.3, 'multiplier', 'Leg injuries variable severity', 'Medical cost analysis'),
('body_part_multiplier', 'foot', 1.2, 'multiplier', 'Foot injuries moderate impact', 'Medical cost analysis'),
('body_part_multiplier', 'chest', 1.8, 'multiplier', 'Chest injuries potentially severe', 'Medical cost analysis'),
('body_part_multiplier', 'multiple', 3.0, 'multiplier', 'Multiple body parts injured', 'Medical cost analysis'),

-- Indirect cost multipliers
('indirect_costs', 'administration', 0.15, 'percentage', 'Administrative overhead (15% of direct costs)', 'Industry benchmark'),
('indirect_costs', 'investigation', 0.10, 'percentage', 'Incident investigation costs (10% of direct costs)', 'Industry benchmark'),
('indirect_costs', 'legal_compliance', 0.08, 'percentage', 'Legal and compliance costs (8% of direct costs)', 'Industry benchmark'),
('indirect_costs', 'reputation', 0.05, 'percentage', 'Reputation and morale impact (5% of direct costs)', 'Industry research'),
('indirect_costs', 'training_replacement', 0.12, 'percentage', 'Training replacement workers (12% of direct costs)', 'Industry benchmark'),

-- Psychosocial factors
('psychosocial', 'witness_trauma', 2500.00, 'per_incident', 'Cost of witness trauma support', 'Mental health research'),
('psychosocial', 'team_counseling', 5000.00, 'per_incident', 'Team counseling after serious incident', 'Mental health research'),
('psychosocial', 'morale_impact', 0.10, 'percentage', 'Productivity loss from morale impact', 'Workplace research');

-- =============================================================================
-- STEP 5: CREATE COST CALCULATION FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_incident_cost(p_incident_id INTEGER)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_incident RECORD;
    v_base_cost DECIMAL(12, 2) := 0;
    v_days_lost_cost DECIMAL(12, 2) := 0;
    v_body_part_multiplier DECIMAL(4, 2) := 1.0;
    v_indirect_costs DECIMAL(12, 2) := 0;
    v_psychosocial_costs DECIMAL(12, 2) := 0;
    v_total_cost DECIMAL(12, 2) := 0;
    v_calculation_breakdown JSONB;
    v_body_part_name VARCHAR(100);
BEGIN
    -- Get incident details
    SELECT 
        i.*,
        bp.body_part_name
    INTO v_incident
    FROM public.incidents i
    LEFT JOIN public.body_parts bp ON i.body_part_id = bp.body_part_id
    WHERE i.incident_id = p_incident_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- If there's a manual override, return that
    IF v_incident.cost_override IS NOT NULL THEN
        RETURN v_incident.cost_override;
    END IF;
    
    -- Get base cost based on classification
    SELECT value INTO v_base_cost
    FROM public.cost_assumptions
    WHERE category = 'incident_type' 
    AND key = v_incident.classification
    AND is_active = true
    ORDER BY effective_from DESC
    LIMIT 1;
    
    IF v_base_cost IS NULL THEN
        v_base_cost := 1000.00; -- Default if classification not found
    END IF;
    
    -- Calculate days lost cost
    IF v_incident.total_days_lost > 0 THEN
        SELECT value * v_incident.total_days_lost INTO v_days_lost_cost
        FROM public.cost_assumptions
        WHERE category = 'daily_costs' 
        AND key = 'lost_time_day'
        AND is_active = true
        ORDER BY effective_from DESC
        LIMIT 1;
    END IF;
    
    -- Get body part multiplier
    IF v_incident.body_part_name IS NOT NULL THEN
        -- Try to match specific body part
        SELECT value INTO v_body_part_multiplier
        FROM public.cost_assumptions
        WHERE category = 'body_part_multiplier' 
        AND (
            LOWER(v_incident.body_part_name) LIKE '%' || LOWER(key) || '%'
            OR LOWER(key) LIKE '%' || LOWER(v_incident.body_part_name) || '%'
        )
        AND is_active = true
        ORDER BY effective_from DESC
        LIMIT 1;
        
        -- Default to 1.0 if no match found
        IF v_body_part_multiplier IS NULL THEN
            v_body_part_multiplier := 1.0;
        END IF;
    END IF;
    
    -- Apply body part multiplier to base cost
    v_base_cost := v_base_cost * v_body_part_multiplier;
    
    -- Calculate indirect costs (as percentage of direct costs)
    WITH indirect_percentages AS (
        SELECT SUM(value) as total_percentage
        FROM public.cost_assumptions
        WHERE category = 'indirect_costs'
        AND is_active = true
    )
    SELECT (v_base_cost + v_days_lost_cost) * (total_percentage / 100) 
    INTO v_indirect_costs
    FROM indirect_percentages;
    
    -- Add psychosocial costs for serious incidents
    IF v_incident.classification IN ('FAT', 'LTI') OR v_incident.fatality = true THEN
        SELECT COALESCE(SUM(value), 0) INTO v_psychosocial_costs
        FROM public.cost_assumptions
        WHERE category = 'psychosocial'
        AND key IN ('witness_trauma', 'team_counseling')
        AND is_active = true;
    END IF;
    
    -- Calculate total
    v_total_cost := v_base_cost + v_days_lost_cost + v_indirect_costs + v_psychosocial_costs;
    
    -- Build calculation breakdown
    v_calculation_breakdown := jsonb_build_object(
        'base_cost', v_base_cost,
        'days_lost_cost', v_days_lost_cost,
        'body_part_multiplier', v_body_part_multiplier,
        'indirect_costs', v_indirect_costs,
        'psychosocial_costs', v_psychosocial_costs,
        'total_cost', v_total_cost,
        'classification', v_incident.classification,
        'days_lost', v_incident.total_days_lost,
        'body_part', v_incident.body_part_name,
        'calculation_date', NOW()
    );
    
    -- Store the calculation for audit
    INSERT INTO public.incident_cost_calculations (
        incident_id, 
        calculated_cost, 
        calculation_breakdown,
        calculation_version
    ) VALUES (
        p_incident_id,
        v_total_cost,
        v_calculation_breakdown,
        '1.0'
    );
    
    -- Update the incident record
    UPDATE public.incidents
    SET 
        estimated_cost = v_total_cost,
        cost_last_calculated_at = NOW(),
        indirect_costs = jsonb_build_object(
            'administration', v_base_cost * 0.15,
            'investigation', v_base_cost * 0.10,
            'legal_compliance', v_base_cost * 0.08,
            'reputation', v_base_cost * 0.05,
            'training_replacement', v_base_cost * 0.12
        )
    WHERE incident_id = p_incident_id;
    
    RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 6: CREATE BATCH RECALCULATION FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION recalculate_all_incident_costs()
RETURNS TABLE (
    incidents_processed INTEGER,
    total_estimated_cost DECIMAL(12, 2),
    average_cost DECIMAL(12, 2)
) AS $$
DECLARE
    v_count INTEGER := 0;
    v_total DECIMAL(12, 2) := 0;
    v_incident RECORD;
BEGIN
    -- Process all incidents that don't have manual overrides
    FOR v_incident IN 
        SELECT incident_id 
        FROM public.incidents 
        WHERE cost_override IS NULL
        ORDER BY incident_id
    LOOP
        PERFORM calculate_incident_cost(v_incident.incident_id);
        v_count := v_count + 1;
    END LOOP;
    
    -- Get summary statistics
    SELECT 
        COUNT(*),
        SUM(COALESCE(cost_override, estimated_cost)),
        AVG(COALESCE(cost_override, estimated_cost))
    INTO v_count, v_total, average_cost
    FROM public.incidents
    WHERE estimated_cost IS NOT NULL OR cost_override IS NOT NULL;
    
    incidents_processed := v_count;
    total_estimated_cost := v_total;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 7: CREATE TRIGGER FOR AUTOMATIC RECALCULATION
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_incident_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate if relevant fields changed and no manual override
    IF (
        NEW.cost_override IS NULL AND (
            NEW.classification IS DISTINCT FROM OLD.classification OR
            NEW.total_days_lost IS DISTINCT FROM OLD.total_days_lost OR
            NEW.body_part_id IS DISTINCT FROM OLD.body_part_id OR
            NEW.fatality IS DISTINCT FROM OLD.fatality
        )
    ) THEN
        PERFORM calculate_incident_cost(NEW.incident_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_recalculate_incident_cost ON public.incidents;
CREATE TRIGGER auto_recalculate_incident_cost
    AFTER UPDATE ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_incident_cost();

-- =============================================================================
-- STEP 8: CREATE VIEW FOR COST ANALYSIS
-- =============================================================================
CREATE OR REPLACE VIEW public.incident_cost_analysis AS
SELECT 
    i.incident_id,
    i.incident_number,
    i.date_of_injury,
    i.classification,
    i.injury_type,
    i.total_days_lost,
    i.fatality,
    bp.body_part_name,
    e.employer_name,
    s.site_name,
    COALESCE(i.cost_override, i.estimated_cost) as total_cost,
    CASE 
        WHEN i.cost_override IS NOT NULL THEN 'Manual Override'
        ELSE 'Calculated'
    END as cost_source,
    i.cost_last_calculated_at,
    i.indirect_costs,
    i.psychosocial_factors,
    -- Cost breakdown
    (i.indirect_costs->>'administration')::DECIMAL as admin_cost,
    (i.indirect_costs->>'investigation')::DECIMAL as investigation_cost,
    (i.indirect_costs->>'legal_compliance')::DECIMAL as legal_cost,
    (i.indirect_costs->>'reputation')::DECIMAL as reputation_cost,
    (i.indirect_costs->>'training_replacement')::DECIMAL as training_cost
FROM public.incidents i
LEFT JOIN public.body_parts bp ON i.body_part_id = bp.body_part_id
LEFT JOIN public.employers e ON i.employer_id = e.employer_id
LEFT JOIN public.sites s ON i.site_id = s.site_id;

-- Grant appropriate permissions
GRANT SELECT ON public.incident_cost_analysis TO authenticated;

-- =============================================================================
-- STEP 9: POPULATE INITIAL COST ESTIMATES FOR EXISTING INCIDENTS
-- =============================================================================
DO $$
DECLARE
    v_result RECORD;
BEGIN
    -- Calculate costs for all existing incidents
    SELECT * INTO v_result FROM recalculate_all_incident_costs();
    
    RAISE NOTICE 'Processed % incidents with total estimated cost of $% (average: $%)', 
        v_result.incidents_processed, 
        v_result.total_estimated_cost,
        v_result.average_cost;
END;
$$;

-- =============================================================================
-- STEP 10: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_incidents_estimated_cost ON public.incidents(estimated_cost);
CREATE INDEX IF NOT EXISTS idx_incidents_cost_override ON public.incidents(cost_override) WHERE cost_override IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_cost_calculation_date ON public.incidents(cost_last_calculated_at);

-- Add table comments
COMMENT ON TABLE public.cost_assumptions IS 'Configurable cost assumptions for incident cost calculations';
COMMENT ON TABLE public.incident_cost_calculations IS 'Audit log of all incident cost calculations';
COMMENT ON VIEW public.incident_cost_analysis IS 'Comprehensive view of incident costs with breakdowns';
COMMENT ON FUNCTION calculate_incident_cost IS 'Calculate estimated cost for a single incident based on configurable assumptions';
COMMENT ON FUNCTION recalculate_all_incident_costs IS 'Batch recalculate costs for all incidents without manual overrides';