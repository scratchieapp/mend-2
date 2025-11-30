import { supabase } from "@/integrations/supabase/client";
import { errorLogger } from "@/lib/monitoring/errorLogger";

/**
 * Service to fetch lookup values for form dropdowns
 * Provides centralized access to all lookup tables
 */

export interface LookupOption {
  value: string;
  label: string;
}

/**
 * Fetch all employers (mend_clients)
 */
export async function fetchEmployers(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('employers')
      .select('employer_id, employer_name')
      .order('employer_name');

    if (error) throw error;

    return (data || []).map(emp => ({
      value: emp.employer_id.toString(),
      label: emp.employer_name || 'Unknown Employer'
    }));
  } catch (error) {
    errorLogger.error('Error fetching employers', error);
    return [];
  }
}

/**
 * Fetch sites for a specific employer
 */
export async function fetchSites(employerId?: string): Promise<LookupOption[]> {
  try {
    let query = supabase
      .from('sites')
      .select('site_id, site_name')
      .order('site_name');

    if (employerId) {
      query = query.eq('employer_id', parseInt(employerId));
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(site => ({
      value: site.site_id.toString(),
      label: site.site_name || 'Unknown Site'
    }));
  } catch (error) {
    errorLogger.error('Error fetching sites', error);
    return [];
  }
}

/**
 * Fetch workers for a specific employer
 * Only returns active workers (is_active = true)
 */
export async function fetchWorkers(employerId?: string): Promise<LookupOption[]> {
  try {
    let query = supabase
      .from('workers')
      .select('worker_id, given_name, family_name')
      .eq('is_active', true)
      .order('family_name');

    if (employerId) {
      query = query.eq('employer_id', parseInt(employerId));
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(worker => ({
      value: worker.worker_id.toString(),
      label: `${worker.given_name || ''} ${worker.family_name || ''}`.trim() || 'Unknown Worker'
    }));
  } catch (error) {
    errorLogger.error('Error fetching workers', error);
    return [];
  }
}

/**
 * Fetch body parts
 */
export async function fetchBodyParts(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('body_parts')
      .select('body_part_id, body_part_name')
      .order('body_part_name');

    if (error) throw error;

    return (data || []).map(part => ({
      value: part.body_part_id.toString(),
      label: part.body_part_name || 'Unknown Body Part'
    }));
  } catch (error) {
    errorLogger.error('Error fetching body parts', error);
    return [];
  }
}

/**
 * Fetch body sides
 */
export async function fetchBodySides(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('body_sides')
      .select('body_side_id, body_side_name')
      .order('body_side_name');

    if (error) throw error;

    return (data || []).map(side => ({
      value: side.body_side_id.toString(),
      label: side.body_side_name || 'Unknown Side'
    }));
  } catch (error) {
    errorLogger.error('Error fetching body sides', error);
    return [];
  }
}

/**
 * Fetch departments
 */
export async function fetchDepartments(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('department_id, department_name')
      .order('department_name');

    if (error) throw error;

    return (data || []).map(dept => ({
      value: dept.department_id.toString(),
      label: dept.department_name || 'Unknown Department'
    }));
  } catch (error) {
    errorLogger.error('Error fetching departments', error);
    return [];
  }
}

/**
 * Fetch medical professionals
 */
export async function fetchMedicalProfessionals(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('medical_professionals')
      .select('doctor_id, first_name, last_name, specialty')
      .order('last_name');

    if (error) throw error;

    return (data || []).map(doc => ({
      value: doc.doctor_id.toString(),
      label: `Dr. ${doc.first_name || ''} ${doc.last_name || ''}${doc.specialty ? ` (${doc.specialty})` : ''}`.trim()
    }));
  } catch (error) {
    errorLogger.error('Error fetching medical professionals', error);
    return [];
  }
}

/**
 * Fetch mechanism of injury codes
 */
export async function fetchMechanismOfInjury(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('mechanism_of_injury_codes')
      .select('moi_code_id, moi_code_main, moi_code_sub, moi_description')
      .order('moi_description');

    if (error) throw error;

    return (data || []).map(moi => ({
      value: `${moi.moi_code_main}-${moi.moi_code_sub}`,
      label: moi.moi_description || 'Unknown Mechanism'
    }));
  } catch (error) {
    errorLogger.error('Error fetching mechanism of injury', error);
    return [];
  }
}

/**
 * Fetch nature of injury codes
 */
export async function fetchNatureOfInjury(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('nature_of_injury_codes')
      .select('noi_code_id, noi_description')
      .order('noi_description');

    if (error) throw error;

    return (data || []).map(noi => ({
      value: noi.noi_code_id.toString(),
      label: noi.noi_description || 'Unknown Nature'
    }));
  } catch (error) {
    errorLogger.error('Error fetching nature of injury', error);
    return [];
  }
}

/**
 * Fetch agency of injury codes
 */
export async function fetchAgencyOfInjury(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('agency_of_injury_codes')
      .select('aoi_code_id, aoi_description')
      .order('aoi_description');

    if (error) throw error;

    return (data || []).map(aoi => ({
      value: aoi.aoi_code_id.toString(),
      label: aoi.aoi_description || 'Unknown Agency'
    }));
  } catch (error) {
    errorLogger.error('Error fetching agency of injury', error);
    return [];
  }
}

/**
 * Fetch bodily location codes
 */
export async function fetchBodilyLocations(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('bodily_location_codes')
      .select('bl_code_id, bl_description')
      .order('bl_description');

    if (error) throw error;

    return (data || []).map(bl => ({
      value: bl.bl_code_id.toString(),
      label: bl.bl_description || 'Unknown Location'
    }));
  } catch (error) {
    errorLogger.error('Error fetching bodily locations', error);
    return [];
  }
}

/**
 * Fetch claim types
 */
export async function fetchClaimTypes(): Promise<LookupOption[]> {
  try {
    const { data, error } = await supabase
      .from('claim_types')
      .select('claim_type_id, claim_type_name')
      .order('claim_type_name');

    if (error) throw error;

    return (data || []).map(type => ({
      value: type.claim_type_id.toString(),
      label: type.claim_type_name || 'Unknown Claim Type'
    }));
  } catch (error) {
    errorLogger.error('Error fetching claim types', error);
    return [];
  }
}

/**
 * Employment type options (static list)
 */
export function getEmploymentTypes(): LookupOption[] {
  return [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'casual', label: 'Casual' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'subcontractor', label: 'Subcontractor' },
    { value: 'temporary', label: 'Temporary' },
    { value: 'apprentice', label: 'Apprentice' },
    { value: 'trainee', label: 'Trainee' },
  ];
}

/**
 * Referral options (static list)
 */
export function getReferralOptions(): LookupOption[] {
  return [
    { value: 'hospital', label: 'Hospital' },
    { value: 'medical-center', label: 'Medical Center' },
    { value: 'general-practitioner', label: 'General Practitioner' },
    { value: 'specialist', label: 'Specialist' },
    { value: 'physiotherapist', label: 'Physiotherapist' },
    { value: 'none', label: 'No Referral Required' },
  ];
}

/**
 * First aid type options (static list)
 */
export function getFirstAidTypes(): LookupOption[] {
  return [
    { value: 'none', label: 'No Treatment Required' },
    { value: 'first-aid-only', label: 'First Aid Only' },
    { value: 'medical-treatment', label: 'Medical Treatment' },
    { value: 'hospitalization', label: 'Hospitalization' },
    { value: 'lost-time-injury', label: 'Lost Time Injury' },
  ];
}