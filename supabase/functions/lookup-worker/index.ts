/**
 * Worker Lookup Function for Retell Voice Agent
 * 
 * Searches for a worker by name within a specific employer.
 * Uses fuzzy matching to handle phonetic variations.
 * 
 * Returns:
 * - Exact match: worker details with found: true
 * - Possible matches (1-2): suggests names to confirm with caller
 * - No match: found: false, allows agent to just record the name
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WorkerLookupRequest {
  worker_name: string;
  employer_id: number | null;
  execution_message?: string;
}

interface WorkerMatch {
  worker_id: number;
  given_name: string;
  family_name: string;
  full_name: string;
  mobile_number: string | null;
  occupation: string | null;
  confidence: number;
}

interface WorkerLookupResponse {
  found: boolean;
  worker_id?: number;
  given_name?: string;
  family_name?: string;
  full_name?: string;
  mobile_number?: string;
  occupation?: string;
  possible_matches?: WorkerMatch[];
  needs_confirmation?: boolean;
  message: string;
}

// Calculate similarity between two strings (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

// Generate phonetic code for fuzzy matching
function getPhoneticCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/wr/g, 'r')
    .replace(/kn/g, 'n')
    .replace(/wh/g, 'w')
    .replace(/[aeiou]/g, '')
    .substring(0, 6);
}

// Parse full name into given and family names
function parseWorkerName(fullName: string): { given: string; family: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { given: parts[0], family: '' };
  }
  return {
    given: parts[0],
    family: parts.slice(1).join(' ')
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawData = await req.json();
    console.log('Raw request data:', JSON.stringify(rawData));

    // Retell might send data in different formats:
    // 1. Direct: { worker_name: "...", employer_id: 123 }
    // 2. Nested in args: { args: { worker_name: "...", employer_id: 123 } }
    // 3. Nested in arguments: { arguments: { worker_name: "...", employer_id: 123 } }
    let worker_name: string | undefined;
    let employer_id: number | undefined;

    if (typeof rawData === 'object' && rawData !== null) {
      // Try direct access first
      worker_name = rawData.worker_name;
      employer_id = rawData.employer_id ? Number(rawData.employer_id) : undefined;

      // Try nested in 'args'
      if (!worker_name && rawData.args) {
        worker_name = rawData.args.worker_name;
        employer_id = rawData.args.employer_id ? Number(rawData.args.employer_id) : employer_id;
      }

      // Try nested in 'arguments'
      if (!worker_name && rawData.arguments) {
        // Arguments might be a string that needs parsing
        let args = rawData.arguments;
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (e) {
            console.log('Failed to parse arguments string:', e);
          }
        }
        if (typeof args === 'object' && args !== null) {
          worker_name = args.worker_name;
          employer_id = args.employer_id ? Number(args.employer_id) : employer_id;
        }
      }

      // Try nested in 'input'
      if (!worker_name && rawData.input) {
        worker_name = rawData.input.worker_name;
        employer_id = rawData.input.employer_id ? Number(rawData.input.employer_id) : employer_id;
      }
    }

    console.log('Extracted worker_name:', worker_name, 'employer_id:', employer_id);

    if (!worker_name || worker_name.trim().length === 0) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'No worker name provided'
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the provided name
    const { given: searchGiven, family: searchFamily } = parseWorkerName(worker_name);
    const searchFullName = worker_name.toLowerCase().trim();

    // Build query - filter by employer if provided, only active workers
    let query = supabase
      .from('workers')
      .select('worker_id, given_name, family_name, mobile_number, occupation, employer_id, is_active')
      .eq('is_active', true);
    
    if (employer_id) {
      query = query.eq('employer_id', employer_id);
    }

    const { data: workers, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Error searching for worker'
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!workers || workers.length === 0) {
      return new Response(
        JSON.stringify({
          found: false,
          message: `No workers found${employer_id ? ' for this employer' : ''}. I'll record the name for now.`
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Score each worker
    const scoredWorkers: WorkerMatch[] = workers
      .filter(w => w.given_name || w.family_name)
      .map(worker => {
        const workerGiven = (worker.given_name || '').toLowerCase();
        const workerFamily = (worker.family_name || '').toLowerCase();
        const workerFullName = `${workerGiven} ${workerFamily}`.trim();

        // Calculate various similarity scores
        let score = 0;

        // Exact full name match
        if (workerFullName === searchFullName) {
          score = 1.0;
        } else {
          // Full name similarity
          const fullNameSim = calculateSimilarity(workerFullName, searchFullName);
          
          // Given name similarity
          const givenSim = searchGiven ? calculateSimilarity(workerGiven, searchGiven.toLowerCase()) : 0;
          
          // Family name similarity  
          const familySim = searchFamily ? calculateSimilarity(workerFamily, searchFamily.toLowerCase()) : 0;

          // Phonetic matching
          const workerPhonetic = getPhoneticCode(workerFullName);
          const searchPhonetic = getPhoneticCode(searchFullName);
          const phoneticMatch = workerPhonetic === searchPhonetic ? 0.3 : 0;

          // Combine scores - weight full name match highest
          score = Math.max(
            fullNameSim,
            (givenSim * 0.4 + familySim * 0.6), // Family name more important
            (givenSim + familySim) / 2 + phoneticMatch
          );

          // Bonus for exact given name match
          if (workerGiven === searchGiven.toLowerCase()) {
            score = Math.min(1.0, score + 0.2);
          }
        }

        return {
          worker_id: worker.worker_id,
          given_name: worker.given_name || '',
          family_name: worker.family_name || '',
          full_name: `${worker.given_name || ''} ${worker.family_name || ''}`.trim(),
          mobile_number: worker.mobile_number,
          occupation: worker.occupation,
          confidence: score
        };
      })
      .filter(w => w.confidence > 0.5) // Only consider matches above 50%
      .sort((a, b) => b.confidence - a.confidence);

    console.log('Scored workers:', scoredWorkers.slice(0, 5));

    // Decision logic
    if (scoredWorkers.length === 0) {
      // No matches found
      return new Response(
        JSON.stringify({
          found: false,
          message: `I couldn't find ${worker_name} in our system. I'll record their name and our team can add their details later.`
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bestMatch = scoredWorkers[0];

    // High confidence match (>= 90%)
    if (bestMatch.confidence >= 0.9) {
      return new Response(
        JSON.stringify({
          found: true,
          worker_id: bestMatch.worker_id,
          given_name: bestMatch.given_name,
          family_name: bestMatch.family_name,
          full_name: bestMatch.full_name,
          mobile_number: bestMatch.mobile_number || undefined,
          occupation: bestMatch.occupation || undefined,
          message: `Found ${bestMatch.full_name} in our system.`
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Medium confidence - return possible matches for confirmation
    const possibleMatches = scoredWorkers
      .filter(w => w.confidence >= 0.6)
      .slice(0, 3);

    if (possibleMatches.length === 1) {
      // Single possible match - ask to confirm
      return new Response(
        JSON.stringify({
          found: false,
          needs_confirmation: true,
          possible_matches: possibleMatches,
          message: `I found someone who might be a match: ${possibleMatches[0].full_name}. Is that the injured worker?`
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (possibleMatches.length >= 2) {
      // Multiple possible matches - list them
      const names = possibleMatches.map(m => m.full_name).join(', or ');
      return new Response(
        JSON.stringify({
          found: false,
          needs_confirmation: true,
          possible_matches: possibleMatches,
          message: `I found a few people with similar names: ${names}. Which one is the injured worker?`
        } as WorkerLookupResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No good matches
    return new Response(
      JSON.stringify({
        found: false,
        message: `I couldn't find ${worker_name} in our records. I'll note down their name and our team will add their details.`
      } as WorkerLookupResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-worker:', error);
    return new Response(
      JSON.stringify({
        found: false,
        message: 'Sorry, there was an error checking our records. I\'ll just note down the name.'
      } as WorkerLookupResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

