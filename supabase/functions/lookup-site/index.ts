/**
 * Lookup Site Edge Function
 *
 * Real-time site lookup for Retell AI voice agent.
 * Called when employer lookup fails - finds site by name and returns employer info.
 *
 * SMART MATCHING LOGIC:
 * - Auto-selects if search term is contained within a site name
 *   (e.g., "Metro Station" → "Metro Station - Sydney")
 * - Auto-selects if only one fuzzy match found
 * - Scores matches and auto-selects best match if clearly better than others
 * - Only asks for clarification when genuinely ambiguous
 *
 * Returns:
 * - found: boolean
 * - site_id: number (if found)
 * - site_name: string (confirmed name)
 * - employer_id: number (linked employer)
 * - employer_name: string (linked employer name)
 * - suggestions: string[] (if not found, similar site names)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface LookupSiteRequest {
  site_name: string;
  employer_id?: number; // Filter sites by employer (IMPORTANT: pass this after employer is identified)
  city?: string; // Optional city/suburb for disambiguation
}

interface LookupSiteResponse {
  found: boolean;
  site_id?: number;
  site_name?: string;
  site_address?: string;
  site_city?: string;
  employer_id?: number;
  employer_name?: string;
  supervisor_name?: string;
  supervisor_phone?: string;
  suggestions?: string[];
  message: string;
}

interface SiteMatch {
  site_id: number;
  site_name: string;
  street_address?: string;
  city?: string;
  supervisor_name?: string;
  supervisor_telephone?: string;
  employer_id?: number;
  employers?: any;
  aliases?: string[];
  score?: number;
}

/**
 * Calculate match score between search term and site name (or alias)
 * Higher score = better match
 */
function calculateSingleMatchScore(searchTerm: string, targetName: string): number {
  const search = searchTerm.toLowerCase().trim();
  const target = targetName.toLowerCase().trim();

  // Exact match = 100
  if (search === target) return 100;

  // Search term is the start of target name = 90
  // e.g., "Metro Station" matches "Metro Station - Sydney"
  if (target.startsWith(search)) return 90;

  // Target name contains search term as a distinct part = 85
  // e.g., "Central Tower" matches "Central Tower Building"
  const targetWords = target.split(/[\s\-]+/);
  const searchWords = search.split(/[\s\-]+/);

  // Check if all search words appear at start of target words
  let allWordsMatchStart = true;
  for (let i = 0; i < searchWords.length && i < targetWords.length; i++) {
    if (!targetWords[i].startsWith(searchWords[i])) {
      allWordsMatchStart = false;
      break;
    }
  }
  if (allWordsMatchStart && searchWords.length > 0) return 85;

  // Search term is contained within target name = 70
  if (target.includes(search)) return 70;

  // All words from search term are in target name = 60
  const allWordsMatch = searchWords.filter(w => w.length > 2).every(sw =>
    targetWords.some(targetw => targetw.includes(sw) || sw.includes(targetw))
  );
  if (allWordsMatch && searchWords.length > 0) return 60;

  // Some significant words match = 40
  const someWordsMatch = searchWords.filter(w => w.length > 2).some(sw =>
    targetWords.some(targetw => targetw.includes(sw) || sw.includes(targetw))
  );
  if (someWordsMatch) return 40;

  return 0;
}

/**
 * Calculate match score between search term and site (including aliases)
 * Higher score = better match
 */
function calculateMatchScore(searchTerm: string, siteName: string, aliases?: string[]): number {
  // Get score for main site name
  const siteNameScore = calculateSingleMatchScore(searchTerm, siteName);
  
  // If no aliases, return site name score
  if (!aliases || aliases.length === 0) {
    return siteNameScore;
  }
  
  // Check each alias and get the best score
  let bestAliasScore = 0;
  for (const alias of aliases) {
    const aliasScore = calculateSingleMatchScore(searchTerm, alias);
    if (aliasScore > bestAliasScore) {
      bestAliasScore = aliasScore;
    }
  }
  
  // Return the best score from site name or aliases
  return Math.max(siteNameScore, bestAliasScore);
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
    // 1. Direct: { site_name: "...", employer_id: 123, city: "..." }
    // 2. Nested in args: { args: { site_name: "...", employer_id: 123 } }
    // 3. Nested in arguments: { arguments: { site_name: "...", employer_id: 123 } }
    let site_name: string | undefined;
    let employer_id: number | undefined;
    let city: string | undefined;

    if (typeof rawData === 'object' && rawData !== null) {
      // Try direct access first
      site_name = rawData.site_name;
      employer_id = rawData.employer_id ? Number(rawData.employer_id) : undefined;
      city = rawData.city;

      // Try nested in 'args'
      if (!site_name && rawData.args) {
        site_name = rawData.args.site_name;
        employer_id = rawData.args.employer_id ? Number(rawData.args.employer_id) : employer_id;
        city = rawData.args.city;
      }

      // Try nested in 'arguments'
      if (!site_name && rawData.arguments) {
        site_name = rawData.arguments.site_name;
        employer_id = rawData.arguments.employer_id ? Number(rawData.arguments.employer_id) : employer_id;
        city = rawData.arguments.city;
      }

      // Try nested in 'input'
      if (!site_name && rawData.input) {
        site_name = rawData.input.site_name;
        employer_id = rawData.input.employer_id ? Number(rawData.input.employer_id) : employer_id;
        city = rawData.input.city;
      }
    }

    console.log('Extracted site_name:', site_name, 'employer_id:', employer_id, 'city:', city);

    if (!site_name || site_name.trim().length < 2) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Please provide a site or location name',
          suggestions: [],
        } as LookupSiteResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const searchTerm = site_name.trim().toLowerCase();
    console.log('Looking up site:', searchTerm, employer_id ? `for employer ${employer_id}` : '', city ? `in ${city}` : '');

    // Build query - join with employers to get employer info
    // First try site_name match
    let query = supabase
      .from('sites')
      .select(
        `
        site_id,
        site_name,
        street_address,
        city,
        supervisor_name,
        supervisor_telephone,
        employer_id,
        aliases,
        employers (
          employer_id,
          employer_name,
          manager_name,
          manager_phone
        )
      `
      )
      .ilike('site_name', `%${searchTerm}%`);

    // IMPORTANT: Filter by employer_id if provided (should be passed after employer is identified)
    if (employer_id) {
      query = query.eq('employer_id', employer_id);
      console.log('Filtering sites by employer_id:', employer_id);
    }

    // Add city filter if provided
    if (city) {
      query = query.ilike('city', `%${city.trim()}%`);
    }

    const { data: siteMatches, error } = await query.limit(10);

    if (error) {
      console.error('Site lookup error:', error);
      throw error;
    }

    // Also search aliases array (Supabase RPC for case-insensitive array search)
    // Use a raw SQL query via RPC to search aliases
    let aliasQuery = supabase
      .from('sites')
      .select(
        `
        site_id,
        site_name,
        street_address,
        city,
        supervisor_name,
        supervisor_telephone,
        employer_id,
        aliases,
        employers (
          employer_id,
          employer_name,
          manager_name,
          manager_phone
        )
      `
      )
      .not('aliases', 'is', null);

    // Filter by employer if provided
    if (employer_id) {
      aliasQuery = aliasQuery.eq('employer_id', employer_id);
    }

    const { data: sitesWithAliases } = await aliasQuery.limit(50);

    // Filter sites where any alias matches the search term (case-insensitive)
    const aliasMatches = (sitesWithAliases || []).filter((site: any) => {
      if (!site.aliases || !Array.isArray(site.aliases)) return false;
      return site.aliases.some((alias: string) =>
        alias.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(alias.toLowerCase())
      );
    });

    // Combine matches and deduplicate
    const allMatches = [...(siteMatches || []), ...aliasMatches];
    const uniqueMatches = allMatches.filter(
      (match, index, self) =>
        index === self.findIndex((m) => m.site_id === match.site_id)
    );

    if (uniqueMatches.length > 0) {
      // Score all matches (including alias matching)
      const scoredMatches: SiteMatch[] = uniqueMatches.map((m) => ({
        ...m,
        score: calculateMatchScore(searchTerm, m.site_name, m.aliases),
      }));

      // Sort by score descending
      scoredMatches.sort((a, b) => (b.score || 0) - (a.score || 0));

    const bestMatch = scoredMatches[0];
    const secondBest = scoredMatches[1];
    const employer = bestMatch.employers as any;

    console.log('Scored site matches:', scoredMatches.map(m => `${m.site_name}: ${m.score}`));

      // Auto-select if:
      // 1. Only one match, OR
      // 2. Best match score >= 70 (search term is contained in name), OR
      // 3. Best match is significantly better than second best (20+ point gap)
      const shouldAutoSelect =
        scoredMatches.length === 1 ||
        (bestMatch.score || 0) >= 70 ||
        (secondBest && (bestMatch.score || 0) - (secondBest.score || 0) >= 20);

      if (shouldAutoSelect) {
        console.log('Auto-selecting best site match:', bestMatch.site_name, 'score:', bestMatch.score);
        return new Response(
          JSON.stringify({
            found: true,
            site_id: bestMatch.site_id,
            site_name: bestMatch.site_name,
            site_address: bestMatch.street_address,
            site_city: bestMatch.city,
            employer_id: employer?.employer_id || bestMatch.employer_id,
            employer_name: employer?.employer_name || 'Unknown',
            supervisor_name: bestMatch.supervisor_name,
            supervisor_phone: bestMatch.supervisor_telephone,
            message: `Found ${bestMatch.site_name} in ${bestMatch.city}, which belongs to ${employer?.employer_name || 'your company'}`,
          } as LookupSiteResponse),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Multiple similar matches - return suggestions with location for disambiguation
      console.log('Multiple similar site matches, asking for clarification');
      const suggestions = scoredMatches.slice(0, 5).map(
        (s) => `${s.site_name} in ${s.city || 'unknown location'}`
      );

      return new Response(
        JSON.stringify({
          found: false,
          suggestions,
          message: `I found a few sites with similar names. Did you mean ${bestMatch.site_name} in ${bestMatch.city}, or one of the others?`,
        } as LookupSiteResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // No direct matches - try word matching
    const words = searchTerm.split(/\s+/).filter((w) => w.length > 2);
    let fuzzyMatches: SiteMatch[] = [];

    for (const word of words) {
      let wordQuery = supabase
        .from('sites')
        .select(
          `
          site_id,
          site_name,
          street_address,
          city,
          supervisor_name,
          supervisor_telephone,
          employer_id,
          aliases,
          employers (
            employer_id,
            employer_name
          )
        `
        )
        .ilike('site_name', `%${word}%`);

      // Filter by employer_id if provided
      if (employer_id) {
        wordQuery = wordQuery.eq('employer_id', employer_id);
      }

      const { data: wordMatches } = await wordQuery.limit(5);

      if (wordMatches) {
        fuzzyMatches = [...fuzzyMatches, ...wordMatches];
      }
    }

    // Also try matching by city/suburb
    if (city || searchTerm.includes('sydney') || searchTerm.includes('melbourne')) {
      const citySearch = city || searchTerm;
      let cityQuery = supabase
        .from('sites')
        .select(
          `
          site_id,
          site_name,
          street_address,
          city,
          supervisor_name,
          supervisor_telephone,
          employer_id,
          aliases,
          employers (
            employer_id,
            employer_name
          )
        `
        )
        .ilike('city', `%${citySearch}%`);

      // Filter by employer_id if provided
      if (employer_id) {
        cityQuery = cityQuery.eq('employer_id', employer_id);
      }

      const { data: cityMatches } = await cityQuery.limit(5);

      if (cityMatches) {
        fuzzyMatches = [...fuzzyMatches, ...cityMatches];
      }
    }

    // Deduplicate and score
    const uniqueFuzzyMatches = fuzzyMatches
      .filter(
        (match, index, self) =>
          index === self.findIndex((m) => m.site_id === match.site_id)
      )
      .map((m) => ({
        ...m,
        score: calculateMatchScore(searchTerm, m.site_name, m.aliases),
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (uniqueFuzzyMatches.length > 0) {
      const bestFuzzy = uniqueFuzzyMatches[0];
      const employer = bestFuzzy.employers as any;
      console.log('Fuzzy site matches found:', uniqueFuzzyMatches.length, 'best:', bestFuzzy.site_name, 'score:', bestFuzzy.score);

      // Auto-select if only one match OR score is good enough
      if (uniqueFuzzyMatches.length === 1 || (bestFuzzy.score || 0) >= 60) {
        console.log('Auto-selecting fuzzy site match:', bestFuzzy.site_name);
        return new Response(
          JSON.stringify({
            found: true,
            site_id: bestFuzzy.site_id,
            site_name: bestFuzzy.site_name,
            site_address: bestFuzzy.street_address,
            site_city: bestFuzzy.city,
            employer_id: employer?.employer_id || bestFuzzy.employer_id,
            employer_name: employer?.employer_name || 'Unknown',
            supervisor_name: bestFuzzy.supervisor_name,
            supervisor_phone: bestFuzzy.supervisor_telephone,
            message: `Found ${bestFuzzy.site_name} in ${bestFuzzy.city}, which belongs to ${employer?.employer_name || 'your company'}`,
          } as LookupSiteResponse),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const suggestions = uniqueFuzzyMatches
        .slice(0, 5)
        .map((s) => `${s.site_name} in ${s.city || 'unknown'}`);

      return new Response(
        JSON.stringify({
          found: false,
          suggestions,
          message: `I found some sites that might match. Did you mean ${bestFuzzy.site_name} in ${bestFuzzy.city}?`,
        } as LookupSiteResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // No matches found at all
    console.log('No site matches found for:', searchTerm);
    return new Response(
      JSON.stringify({
        found: false,
        suggestions: [],
        message:
          "I couldn't find that site in our system. Let me take down the details and we'll verify the company information.",
      } as LookupSiteResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Lookup site error:', error);
    return new Response(
      JSON.stringify({
        found: false,
        message: "Sorry, I had trouble looking that up. Let's continue and I'll take down the company details.",
        suggestions: [],
      } as LookupSiteResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
