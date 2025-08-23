import { supabase } from '@/integrations/supabase/client';

export interface MedicalProfessional {
  doctor_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  specialty: string | null;
  phone_number: string | null;
  email: string | null;
  registration_number: string | null;
}

/**
 * Fetch all medical professionals from the database
 */
export async function getAllMedicalProfessionals(): Promise<MedicalProfessional[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_all_medical_professionals');

    if (error) {
      console.error('Error fetching medical professionals:', error);
      throw new Error(`Failed to fetch medical professionals: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllMedicalProfessionals:', error);
    throw error;
  }
}

/**
 * Search medical professionals by name
 */
export async function searchMedicalProfessionals(searchTerm: string): Promise<MedicalProfessional[]> {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return getAllMedicalProfessionals();
    }

    const { data, error } = await supabase
      .rpc('search_medical_professionals', { search_term: searchTerm.trim() });

    if (error) {
      console.error('Error searching medical professionals:', error);
      throw new Error(`Failed to search medical professionals: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchMedicalProfessionals:', error);
    throw error;
  }
}

/**
 * Get a single medical professional by ID
 */
export async function getMedicalProfessionalById(doctorId: number): Promise<MedicalProfessional | null> {
  try {
    const { data, error } = await supabase
      .from('medical_professionals')
      .select(`
        doctor_id,
        first_name,
        last_name,
        specialty,
        phone_number,
        email,
        registration_number
      `)
      .eq('doctor_id', doctorId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching medical professional:', error);
      throw new Error(`Failed to fetch medical professional: ${error.message}`);
    }

    if (!data) return null;

    return {
      ...data,
      full_name: `${data.first_name} ${data.last_name}`
    };
  } catch (error) {
    console.error('Error in getMedicalProfessionalById:', error);
    throw error;
  }
}

/**
 * Create a new medical professional
 */
export async function createMedicalProfessional(professional: {
  first_name: string;
  last_name: string;
  specialty?: string;
  phone_number?: string;
  email?: string;
  registration_number?: string;
  address?: string;
  suburb?: string;
  state?: string;
  post_code?: string;
}): Promise<MedicalProfessional> {
  try {
    const { data, error } = await supabase
      .from('medical_professionals')
      .insert([professional])
      .select()
      .single();

    if (error) {
      console.error('Error creating medical professional:', error);
      throw new Error(`Failed to create medical professional: ${error.message}`);
    }

    return {
      ...data,
      full_name: `${data.first_name} ${data.last_name}`
    };
  } catch (error) {
    console.error('Error in createMedicalProfessional:', error);
    throw error;
  }
}

/**
 * Update a medical professional
 */
export async function updateMedicalProfessional(
  doctorId: number,
  updates: Partial<{
    first_name: string;
    last_name: string;
    specialty: string;
    phone_number: string;
    email: string;
    registration_number: string;
    address: string;
    suburb: string;
    state: string;
    post_code: string;
  }>
): Promise<MedicalProfessional> {
  try {
    const { data, error } = await supabase
      .from('medical_professionals')
      .update(updates)
      .eq('doctor_id', doctorId)
      .select()
      .single();

    if (error) {
      console.error('Error updating medical professional:', error);
      throw new Error(`Failed to update medical professional: ${error.message}`);
    }

    return {
      ...data,
      full_name: `${data.first_name} ${data.last_name}`
    };
  } catch (error) {
    console.error('Error in updateMedicalProfessional:', error);
    throw error;
  }
}