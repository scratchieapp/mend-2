/**
 * Lookup Employer Edge Function
 *
 * Real-time employer lookup for Retell AI voice agent.
 * Called during inbound calls to validate employer name against database.
 *
 * SMART MATCHING LOGIC:
 * - Auto-selects if search term is contained within a company name
 *   (e.g., "Urban Development" → "Urban Development Pty Ltd")
 * - Auto-selects if only one fuzzy match found
 * - Scores matches and auto-selects best match if clearly better than others
 * - Only asks for clarification when genuinely ambiguous
 *
 * Returns:
 * - found: boolean
 * - employer_id: number (if found)
 * - employer_name: string (confirmed name)
 * - suggestions: string[] (if not found, similar names to offer)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface LookupEmployerRequest {
  employer_name: string;
}

interface LookupEmployerResponse {
  found: boolean;
  employer_id?: number;
  employer_name?: string;
  manager_name?: string;
  manager_phone?: string;
  suggestions?: string[];
  message: string;
}

interface EmployerMatch {
  employer_id: number;
  employer_name: string;
  manager_name?: string;
  manager_phone?: string;
  score?: number;
}

/**
 * Calculate match score between search term and employer name
 * Higher score = better match
 */
function calculateMatchScore(searchTerm: string, employerName: string): number {
  const search = searchTerm.toLowerCase().trim();
  const employer = employerName.toLowerCase().trim();

  // Exact match = 100
  if (search === employer) return 100;

  // Search term is the start of employer name = 90
  // e.g., "Urban Development" matches "Urban Development Pty Ltd"
  if (employer.startsWith(search)) return 90;

  // Employer name starts with search term after removing common suffixes
  const suffixes = [' pty ltd', ' pty. ltd.', ' ltd', ' limited', ' inc', ' incorporated', ' corp', ' corporation', ' co', ' company', ' group', ' holdings', ' australia', ' aust'];
  let employerBase = employer;
  for (const suffix of suffixes) {
    if (employerBase.endsWith(suffix)) {
      employerBase = employerBase.slice(0, -suffix.length).trim();
    }
  }
  if (search === employerBase) return 95;
  if (employerBase.startsWith(search)) return 85;

  // Search term is contained within employer name = 70
  if (employer.includes(search)) return 70;

  // All words from search term are in employer name = 60
  const searchWords = search.split(/\s+/).filter(w => w.length > 2);
  const employerWords = employer.split(/\s+/);
  const allWordsMatch = searchWords.every(sw =>
    employerWords.some(ew => ew.includes(sw) || sw.includes(ew))
  );
  if (allWordsMatch && searchWords.length > 0) return 60;

  // Some words match = 40
  const someWordsMatch = searchWords.some(sw =>
    employerWords.some(ew => ew.includes(sw) || sw.includes(ew))
  );
  if (someWordsMatch) return 40;

  return 0;
}

serve(async (req: Request) => {
  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse request - handle various payload formats from Retell
    const rawData = await req.json();
    console.log('Raw request data:', JSON.stringify(rawData));

    // Retell might send data in different formats:
    // 1. Direct: { employer_name: "..." }
    // 2. Nested in args: { args: { employer_name: "..." } }
    // 3. Nested in arguments: { arguments: { employer_name: "..." } }
    let employer_name: string | undefined;

    if (typeof rawData === 'object' && rawData !== null) {
      // Try direct access first
      employer_name = rawData.employer_name;

      // Try nested in 'args'
      if (!employer_name && rawData.args) {
        employer_name = rawData.args.employer_name;
      }

      // Try nested in 'arguments'
      if (!employer_name && rawData.arguments) {
        employer_name = rawData.arguments.employer_name;
      }

      // Try nested in 'input'
      if (!employer_name && rawData.input) {
        employer_name = rawData.input.employer_name;
      }
    }

    console.log('Extracted employer_name:', employer_name);

    if (!employer_name || employer_name.trim().length < 2) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Please provide an employer or company name',
          suggestions: [],
        } as LookupEmployerResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const searchTerm = employer_name.trim().toLowerCase();
    console.log('Looking up employer:', searchTerm);

    // Step 1: Try exact match (case-insensitive)
    const { data: exactMatch } = await supabase
      .from('employers')
      .select('employer_id, employer_name, manager_name, manager_phone')
      .ilike('employer_name', searchTerm)
      .limit(1)
      .single();

    if (exactMatch) {
      console.log('Exact match found:', exactMatch.employer_name);
      return new Response(
        JSON.stringify({
          found: true,
          employer_id: exactMatch.employer_id,
          employer_name: exactMatch.employer_name,
          manager_name: exactMatch.manager_name,
          manager_phone: exactMatch.manager_phone,
          message: `Found ${exactMatch.employer_name}`,
        } as LookupEmployerResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Try partial match (contains search term)
    const { data: partialMatches } = await supabase
      .from('employers')
      .select('employer_id, employer_name, manager_name, manager_phone')
      .ilike('employer_name', `%${searchTerm}%`)
      .limit(10);

    if (partialMatches && partialMatches.length > 0) {
      // Score all matches
      const scoredMatches: EmployerMatch[] = partialMatches.map((m) => ({
        ...m,
        score: calculateMatchScore(searchTerm, m.employer_name),
      }));

      // Sort by score descending
      scoredMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

      const bestMatch = scoredMatches[0];
      const secondBest = scoredMatches[1];

      console.log('Scored matches:', scoredMatches.map(m => `${m.employer_name}: ${m.score}`));

      // Auto-select if:
      // 1. Only one match, OR
      // 2. Best match score >= 70 (search term is contained in name), OR
      // 3. Best match is significantly better than second best (20+ point gap)
      const shouldAutoSelect =
        scoredMatches.length === 1 ||
        (bestMatch.score || 0) >= 70 ||
        (secondBest && (bestMatch.score || 0) - (secondBest.score || 0) >= 20);

      if (shouldAutoSelect) {
        console.log('Auto-selecting best match:', bestMatch.employer_name, 'score:', bestMatch.score);
        return new Response(
          JSON.stringify({
            found: true,
            employer_id: bestMatch.employer_id,
            employer_name: bestMatch.employer_name,
            manager_name: bestMatch.manager_name,
            manager_phone: bestMatch.manager_phone,
            message: `Found ${bestMatch.employer_name}`,
          } as LookupEmployerResponse),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Multiple similar matches - return suggestions
      console.log('Multiple similar matches, asking for clarification');
      return new Response(
        JSON.stringify({
          found: false,
          suggestions: scoredMatches.slice(0, 5).map((e) => e.employer_name),
          message: `I found a few companies with similar names. Did you mean ${bestMatch.employer_name}, or one of the others?`,
        } as LookupEmployerResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Try fuzzy match using word matching
    // Split search term into words and look for any word match
    const words = searchTerm.split(/\s+/).filter((w) => w.length > 2);
    let fuzzyMatches: EmployerMatch[] = [];

    for (const word of words) {
      const { data: wordMatches } = await supabase
        .from('employers')
        .select('employer_id, employer_name, manager_name, manager_phone')
        .ilike('employer_name', `%${word}%`)
        .limit(5);

      if (wordMatches) {
        fuzzyMatches = [...fuzzyMatches, ...wordMatches];
      }
    }

    // Deduplicate and score
    const uniqueMatches = fuzzyMatches
      .filter(
        (match, index, self) =>
          index === self.findIndex((m) => m.employer_id === match.employer_id)
      )
      .map((m) => ({
        ...m,
        score: calculateMatchScore(searchTerm, m.employer_name),
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (uniqueMatches.length > 0) {
      const bestFuzzy = uniqueMatches[0];
      console.log('Fuzzy matches found:', uniqueMatches.length, 'best:', bestFuzzy.employer_name, 'score:', bestFuzzy.score);

      // Auto-select if only one match OR score is good enough
      if (uniqueMatches.length === 1 || (bestFuzzy.score || 0) >= 60) {
        console.log('Auto-selecting fuzzy match:', bestFuzzy.employer_name);
        return new Response(
          JSON.stringify({
            found: true,
            employer_id: bestFuzzy.employer_id,
            employer_name: bestFuzzy.employer_name,
            manager_name: bestFuzzy.manager_name,
            manager_phone: bestFuzzy.manager_phone,
            message: `Found ${bestFuzzy.employer_name}`,
          } as LookupEmployerResponse),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          found: false,
          suggestions: uniqueMatches.slice(0, 5).map((e) => e.employer_name),
          message: `I found some companies that might match. Did you mean ${bestFuzzy.employer_name}?`,
        } as LookupEmployerResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // No matches found
    console.log('No matches found for:', searchTerm);
    return new Response(
      JSON.stringify({
        found: false,
        suggestions: [],
        message:
          "I couldn't find that company in our system. Can you tell me the work site or location name instead?",
      } as LookupEmployerResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Lookup employer error:', error);
    return new Response(
      JSON.stringify({
        found: false,
        message: 'Sorry, I had trouble looking that up. Please continue with the site name.',
        suggestions: [],
      } as LookupEmployerResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
