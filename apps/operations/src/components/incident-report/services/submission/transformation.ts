import { supabase } from "@/integrations/supabase/client";
import { errorLogger } from "@/lib/monitoring/errorLogger";
import type { Database } from '@/integrations/supabase/types';
import type { IncidentFormData } from './types';
import { fetchWeatherForIncident, type WeatherData } from '@/services/weatherService';

type SiteUpdate = Database['public']['Tables']['sites']['Update'];
type IncidentInsert = Database['public']['Tables']['incidents']['Insert'] & { weather_data?: WeatherData | null };

/**
 * Transformation service to map form field values to database IDs
 * This handles the conversion from string values to proper foreign key IDs
 */

interface TransformationCache {
  employers: Map<string, number>;
  sites: Map<string, number>;
  workers: Map<string, number>;
  bodyParts: Map<string, number>;
  bodySides: Map<string, number>;
  departments: Map<string, number>;
  doctors: Map<string, number>;
  noiCodes: Map<string, number>;
  aoiCodes: Map<string, number>;
  moiCodes: Map<string, number>;
  blCodes: Map<string, number>;
  claimTypes: Map<string, number>;
}

// Cache to avoid repeated database queries
const cache: TransformationCache = {
  employers: new Map(),
  sites: new Map(),
  workers: new Map(),
  bodyParts: new Map(),
  bodySides: new Map(),
  departments: new Map(),
  doctors: new Map(),
  noiCodes: new Map(),
  aoiCodes: new Map(),
  moiCodes: new Map(),
  blCodes: new Map(),
  claimTypes: new Map(),
};

/**
 * Get or create employer ID from name
 */
async function getEmployerId(employerName: string | null | undefined): Promise<number | null> {
  if (!employerName) return null;

  // Check cache first
  if (cache.employers.has(employerName)) {
    return cache.employers.get(employerName)!;
  }

  try {
    // Use RPC to get or create employer bypassing RLS
    const { data: employerId, error } = await supabase
      .rpc('create_employer_bypassing_rls', { p_employer_name: employerName });

    if (error) {
      errorLogger.error('Error getting/creating employer', error);
      return null;
    }

    if (employerId) {
      cache.employers.set(employerName, employerId);
      return employerId;
    }
  } catch (error) {
    errorLogger.error('Error getting employer ID', error);
  }

  return null;
}

/**
 * Get or create site ID from name and employer
 */
async function getSiteId(siteName: string | null | undefined, employerId: number | null): Promise<number | null> {
  if (!siteName) return null;

  const cacheKey = `${siteName}_${employerId}`;
  if (cache.sites.has(cacheKey)) {
    return cache.sites.get(cacheKey)!;
  }

  try {
    // Use RPC to get or create site bypassing RLS
    const { data: siteId, error } = await supabase
      .rpc('create_site_bypassing_rls', { 
        p_site_name: siteName, 
        p_employer_id: employerId 
      });

    if (error) {
      errorLogger.error('Error getting/creating site', error);
      return null;
    }

    if (siteId) {
      cache.sites.set(cacheKey, siteId);
      return siteId;
    }
  } catch (error) {
    errorLogger.error('Error getting site ID', error);
  }

  return null;
}

/**
 * Get or create worker ID from name
 */
async function getWorkerId(workerName: string | null | undefined, employerId: number | null): Promise<number | null> {
  if (!workerName) return null;

  const cacheKey = `${workerName}_${employerId}`;
  if (cache.workers.has(cacheKey)) {
    return cache.workers.get(cacheKey)!;
  }

  try {
    // Parse worker name (assuming format: "FirstName LastName")
    const nameParts = workerName.trim().split(' ');
    const givenName = nameParts[0] || workerName;
    const familyName = nameParts.slice(1).join(' ') || '';

    // Use RPC to get or create worker bypassing RLS
    const { data: workerId, error } = await supabase
      .rpc('create_worker_bypassing_rls', { 
        p_given_name: givenName,
        p_family_name: familyName,
        p_employer_id: employerId
      });

    if (error) {
      errorLogger.error('Error getting/creating worker', error);
      return null;
    }

    if (workerId) {
      cache.workers.set(cacheKey, workerId);
      return workerId;
    }
  } catch (error) {
    errorLogger.error('Error getting worker ID', error);
  }

  return null;
}

/**
 * Update site with supervisor information
 */
async function updateSiteSupervisor(
  siteId: number, 
  supervisorName: string | null | undefined, 
  supervisorPhone: string | null | undefined
): Promise<void> {
  if (!siteId || (!supervisorName && !supervisorPhone)) return;

  try {
    const updateData: SiteUpdate = {};
    if (supervisorName) updateData.supervisor_name = supervisorName;
    if (supervisorPhone) updateData.supervisor_telephone = supervisorPhone;

    await supabase
      .from('sites')
      .update(updateData)
      .eq('site_id', siteId);
  } catch (error) {
    errorLogger.error('Error updating site supervisor', error);
  }
}

/**
 * Update worker employment type
 */
async function updateWorkerEmploymentType(
  workerId: number,
  employmentType: string | null | undefined
): Promise<void> {
  if (!workerId || !employmentType) return;

  try {
    await supabase
      .from('workers')
      .update({ employment_type: employmentType })
      .eq('worker_id', workerId);
  } catch (error) {
    errorLogger.error('Error updating worker employment type', error);
  }
}

/**
 * Main transformation function
 * Transforms form data to match database schema
 */
export async function transformFormDataToDatabase(formData: IncidentFormData): Promise<IncidentInsert> {
  try {
    // Get or create employer ID (mend_client maps to employer)
    const employerId = await getEmployerId(formData.mend_client || formData.employer_name);

    // Get or create site ID
    const siteId = await getSiteId(formData.site_name || formData.location, employerId);

    // Update site with supervisor info if we have it
    if (siteId) {
      await updateSiteSupervisor(
        siteId,
        formData.supervisor_contact || formData.supervisor_name,
        formData.supervisor_phone || formData.supervisor_telephone
      );
    }

    // Get or create worker ID
    const workerId = await getWorkerId(formData.worker_name || formData.injured_worker, employerId);

    // Update worker with employment type if we have it
    if (workerId && formData.employment_type) {
      await updateWorkerEmploymentType(workerId, formData.employment_type);
    }

    // Fetch weather data for the incident location and time
    let weatherData: WeatherData | null = null;
    if (siteId && formData.date_of_injury) {
      try {
        // Get site coordinates
        const { data: siteData } = await supabase
          .from('sites')
          .select('latitude, longitude')
          .eq('site_id', siteId)
          .maybeSingle();

        if (siteData?.latitude && siteData?.longitude) {
          weatherData = await fetchWeatherForIncident(
            siteData.latitude,
            siteData.longitude,
            formData.date_of_injury,
            formData.time_of_injury || undefined
          );
          if (weatherData) {
            console.log('Weather data captured for incident:', weatherData.conditions, weatherData.temperature_c + '°C');
          }
        } else {
          console.log('Site coordinates not available for weather lookup');
        }
      } catch (error) {
        // Don't fail incident creation if weather fetch fails
        console.warn('Failed to fetch weather data:', error);
      }
    }

    // Transform the data for incidents table
    const transformedData: IncidentInsert = {
      // Date and time fields
      date_of_injury: formData.date_of_injury,
      time_of_injury: formData.time_of_injury,
      
      // Basic injury information
      injury_type: formData.injury_type,
      injury_description: formData.injury_description,
      classification: formData.classification,
      
      // IDs from relationships
      employer_id: employerId,
      site_id: siteId,
      worker_id: workerId,
      
      // Notifying person fields (correct column names in incidents table)
      notifying_person_name: formData.notifying_person_name,
      notifying_person_position: formData.notifying_person_position,
      notifying_person_telephone: formData.notifying_person_telephone,
      
      // Treatment fields
      treatment_provided: formData.type_of_first_aid || formData.treatment_provided,
      referral: formData.referred_to || formData.referral,
      doctor_details: formData.doctor_details,
      
      // Actions and notes
      actions: formData.actions_taken || formData.actions,
      case_notes: formData.case_notes,
      
      // Witness
      witness: formData.witness,
      
      // Handle lookup table IDs (convert string values to IDs if needed)
      body_part_id: formData.body_part ? parseInt(formData.body_part) : null,
      body_side_id: formData.body_side ? parseInt(formData.body_side) : null,
      department_id: formData.department_id ? parseInt(formData.department_id) : null,
      doctor_id: formData.doctor_id ? parseInt(formData.doctor_id) : null,
      
      // Handle mechanism of injury code
      moi_code_id: await getMechanismOfInjuryId(formData.mechanism_of_injury),
      
      // Handle bodily location code
      bl_code_id: formData.bodily_location ? parseInt(formData.bodily_location) : null,
      
      // Handle other code lookups
      noi_code_id: formData.nature_of_injury ? parseInt(formData.nature_of_injury) : null,
      aoi_code_id: formData.agency_of_injury ? parseInt(formData.agency_of_injury) : null,
      claim_type_id: formData.claim_type ? parseInt(formData.claim_type) : null,
      
      // Additional fields that might be in the form
      incident_summary: formData.incident_summary,
      shift_arrangement: formData.shift_arrangement,
      workers_employer: formData.workers_employer,
      fatality: formData.fatality || false,
      returned_to_work: formData.returned_to_work || false,
      total_days_lost: formData.total_days_lost ? parseInt(formData.total_days_lost) : null,
      
      // Dates for reporting
      date_reported_to_site: formData.date_reported_to_site,
      time_reported_to_site: formData.time_reported_to_site,
      date_report_received: formData.date_report_received,
      time_report_received: formData.time_report_received,
      date_report_responded: formData.date_report_responded,
      reported_to_insurer_date: formData.reported_to_insurer_date,
      
      // Email notification timestamp
      time_date_email_notification: formData.time_date_email_notification || new Date().toISOString(),
      
      // Weather data captured from Google Weather API
      weather_data: weatherData,
    };

    // Remove null/undefined values to avoid database errors
    Object.keys(transformedData).forEach(key => {
      if (transformedData[key] === undefined) {
        delete transformedData[key];
      }
    });

    return transformedData;
  } catch (error) {
    errorLogger.error('Error transforming form data', error);
    throw error;
  }
}

/**
 * Get mechanism of injury ID from the code string
 * The form sends mechanism as "main-sub" format
 */
async function getMechanismOfInjuryId(moiCode: string | null | undefined): Promise<number | null> {
  if (!moiCode) return null;

  // Check if it's already a number (ID)
  const numericId = parseInt(moiCode);
  if (!isNaN(numericId)) return numericId;

  // Parse the "main-sub" format
  const [main, sub] = moiCode.split('-');
  if (!main) return null;

  try {
    const query = supabase
      .from('mechanism_of_injury_codes')
      .select('moi_code_id')
      .eq('moi_code_main', main);
    
    if (sub) {
      query.eq('moi_code_sub', sub);
    }

    const { data } = await query.single();
    return data?.moi_code_id || null;
  } catch (error) {
    errorLogger.error('Error getting mechanism of injury ID', error);
    return null;
  }
}

/**
 * Clear the transformation cache
 * Useful for testing or when data might have changed
 */
export function clearTransformationCache(): void {
  Object.values(cache).forEach(map => map.clear());
}