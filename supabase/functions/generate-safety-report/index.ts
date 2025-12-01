/**
 * Generate Safety Report Edge Function
 *
 * Generates AI-powered safety reports for sites or employers.
 * Model-agnostic design supports OpenAI, Anthropic (Claude), or other LLM providers.
 *
 * Input:
 * - siteId?: number (required for site-level reports)
 * - employerId: number (required)
 * - month: string (format: YYYY-MM)
 * - reportType: 'site' | 'employer'
 *
 * Returns:
 * - executiveSummary: string (AI-generated)
 * - metrics: { lti, mti, fai, ltifr, trifr, mtifr, totalHours, employeeHours, subcontractorHours }
 * - incidentBreakdown: { byType, byMechanism, byBodyPart }
 * - recommendations: string[]
 * - dataQuality: { hasEstimatedHours, dataSources }
 * - comparison: { previousMonth, industryBenchmark }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Types
interface GenerateReportRequest {
  siteId?: number;
  employerId: number;
  month: string;
  reportType: 'site' | 'employer';
}

interface IncidentMetrics {
  lti: number;
  mti: number;
  fai: number;
  totalIncidents: number;
  ltifr: number;
  trifr: number;
  mtifr: number;
  totalHours: number;
  employeeHours: number;
  subcontractorHours: number;
}

interface IncidentBreakdown {
  byType: { type: string; count: number }[];
  byMechanism: { mechanism: string; count: number }[];
  byBodyPart: { bodyPart: string; count: number }[];
  byState?: { state: string; count: number; ltifr: number }[];
}

interface DataQuality {
  hasEstimatedHours: boolean;
  dataSources: string[];
  totalSites: number;
  sitesWithHours: number;
}

interface ReportComparison {
  previousMonth?: {
    ltifr: number;
    trifr: number;
    ltiChange: number;
    trifrChange: number;
  };
  industryBenchmark?: {
    ltifr: number;
    trifr: number;
    performance: 'above' | 'at' | 'below';
  };
}

interface GeneratedReport {
  executiveSummary: string;
  metrics: IncidentMetrics;
  incidentBreakdown: IncidentBreakdown;
  recommendations: string[];
  dataQuality: DataQuality;
  comparison: ReportComparison;
  generatedAt: string;
}

// Australian construction industry benchmarks (approximate)
const INDUSTRY_BENCHMARKS = {
  ltifr: 4.0, // Lost Time Injury Frequency Rate per million hours
  trifr: 10.0, // Total Recordable Injury Frequency Rate per million hours
};

/**
 * Calculate frequency rate per million hours worked
 */
function calculateFrequencyRate(incidents: number, hours: number): number {
  if (hours <= 0) return 0;
  return Number(((incidents / hours) * 1000000).toFixed(2));
}

/**
 * Get start and end dates for a month
 */
function getMonthDateRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`;
  return { startDate, endDate };
}

/**
 * Generate AI executive summary using configured LLM provider
 * 
 * Supported providers (set LLM_PROVIDER env var):
 * - "openai" (default) - Uses OpenAI GPT-4o-mini
 * - "anthropic" or "claude" - Uses Anthropic Claude 3.5 Sonnet
 * - "openrouter" - Uses OpenRouter (set LLM_MODEL for specific model)
 */
async function generateExecutiveSummary(
  metrics: IncidentMetrics,
  breakdown: IncidentBreakdown,
  comparison: ReportComparison,
  dataQuality: DataQuality,
  reportType: 'site' | 'employer',
  month: string
): Promise<{ summary: string; recommendations: string[] }> {
  const provider = Deno.env.get('LLM_PROVIDER') || 'openai';
  const apiKey = Deno.env.get('LLM_API_KEY') || Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPENROUTER_API_KEY');

  if (!apiKey) {
    console.warn('No LLM API key configured, using template-based summary');
    return generateTemplateSummary(metrics, breakdown, comparison, dataQuality, reportType, month);
  }

  const prompt = buildPrompt(metrics, breakdown, comparison, dataQuality, reportType, month);

  try {
    let result: { summary: string; recommendations: string[] };

    switch (provider.toLowerCase()) {
      case 'anthropic':
      case 'claude':
        result = await callAnthropicAPI(apiKey, prompt);
        break;
      case 'openrouter':
        result = await callOpenRouterAPI(apiKey, prompt);
        break;
      case 'openai':
      default:
        result = await callOpenAIAPI(apiKey, prompt);
        break;
    }

    return result;
  } catch (error) {
    console.error('LLM API error:', error);
    return generateTemplateSummary(metrics, breakdown, comparison, dataQuality, reportType, month);
  }
}

/**
 * Build the prompt for the LLM
 */
function buildPrompt(
  metrics: IncidentMetrics,
  breakdown: IncidentBreakdown,
  comparison: ReportComparison,
  dataQuality: DataQuality,
  reportType: 'site' | 'employer',
  month: string
): string {
  const monthName = new Date(month + '-01').toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  const scope = reportType === 'site' ? 'site' : 'organisation';

  return `You are a workplace safety analyst for the Australian construction industry. Generate an executive summary and actionable recommendations for the following safety report.

REPORT PERIOD: ${monthName}
REPORT SCOPE: ${scope}-level analysis

SAFETY METRICS:
- Lost Time Injuries (LTI): ${metrics.lti}
- Medical Treatment Injuries (MTI): ${metrics.mti}
- First Aid Injuries (FAI): ${metrics.fai}
- Total Recordable Incidents: ${metrics.totalIncidents}
- Total Hours Worked: ${metrics.totalHours.toLocaleString()}
- Employee Hours: ${metrics.employeeHours.toLocaleString()}
- Subcontractor Hours: ${metrics.subcontractorHours.toLocaleString()}

FREQUENCY RATES (per million hours):
- LTIFR: ${metrics.ltifr} (Industry benchmark: ${INDUSTRY_BENCHMARKS.ltifr})
- TRIFR: ${metrics.trifr} (Industry benchmark: ${INDUSTRY_BENCHMARKS.trifr})
- MTIFR: ${metrics.mtifr}

${comparison.previousMonth ? `
MONTH-ON-MONTH COMPARISON:
- Previous LTIFR: ${comparison.previousMonth.ltifr}
- LTIFR Change: ${comparison.previousMonth.ltiChange > 0 ? '+' : ''}${comparison.previousMonth.ltiChange.toFixed(1)}%
- Previous TRIFR: ${comparison.previousMonth.trifr}
- TRIFR Change: ${comparison.previousMonth.trifrChange > 0 ? '+' : ''}${comparison.previousMonth.trifrChange.toFixed(1)}%
` : ''}

INCIDENT BREAKDOWN BY TYPE:
${breakdown.byType.map(t => `- ${t.type}: ${t.count}`).join('\n') || '- No incidents recorded'}

INCIDENT BREAKDOWN BY MECHANISM:
${breakdown.byMechanism.map(m => `- ${m.mechanism}: ${m.count}`).join('\n') || '- No data available'}

${breakdown.byState && breakdown.byState.length > 0 ? `
JURISDICTIONAL BREAKDOWN:
${breakdown.byState.map(s => `- ${s.state}: ${s.count} incidents, LTIFR: ${s.ltifr}`).join('\n')}
` : ''}

DATA QUALITY NOTES:
- Sites with hours data: ${dataQuality.sitesWithHours}/${dataQuality.totalSites}
- Contains estimated hours: ${dataQuality.hasEstimatedHours ? 'Yes (some metrics may be approximate)' : 'No'}

Please provide:
1. An executive summary (2-3 paragraphs) that:
   - Highlights key safety performance trends
   - Compares to industry benchmarks
   - Identifies areas of concern
   - Notes any data quality considerations

2. 3-5 specific, actionable recommendations based on the data

Format your response as JSON:
{
  "summary": "Your executive summary here...",
  "recommendations": ["Recommendation 1", "Recommendation 2", ...]
}`;
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(apiKey: string, prompt: string): Promise<{ summary: string; recommendations: string[] }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a workplace safety analyst. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  try {
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('Failed to parse OpenAI response as JSON');
  }

  return { summary: content, recommendations: [] };
}

/**
 * Call Anthropic (Claude) API
 */
async function callAnthropicAPI(apiKey: string, prompt: string): Promise<{ summary: string; recommendations: string[] }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('Failed to parse Anthropic response as JSON');
  }

  return { summary: content, recommendations: [] };
}

/**
 * Call OpenRouter API - provides access to many models (GPT-4, Claude, Llama, Mistral, etc.)
 * Set LLM_MODEL env var to choose model, e.g.:
 * - anthropic/claude-3.5-sonnet
 * - openai/gpt-4o
 * - openai/gpt-4o-mini
 * - meta-llama/llama-3.1-70b-instruct
 * - mistralai/mistral-large
 * See https://openrouter.ai/models for full list
 */
async function callOpenRouterAPI(apiKey: string, prompt: string): Promise<{ summary: string; recommendations: string[] }> {
  const model = Deno.env.get('LLM_MODEL') || 'anthropic/claude-3.5-sonnet';
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://mendplatform.au',
      'X-Title': 'Mend Safety Reports',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a workplace safety analyst for the Australian construction industry. Respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error('Failed to parse OpenRouter response as JSON');
  }

  return { summary: content, recommendations: [] };
}

/**
 * Generate template-based summary when LLM is unavailable
 */
function generateTemplateSummary(
  metrics: IncidentMetrics,
  breakdown: IncidentBreakdown,
  comparison: ReportComparison,
  dataQuality: DataQuality,
  reportType: 'site' | 'employer',
  month: string
): { summary: string; recommendations: string[] } {
  const monthName = new Date(month + '-01').toLocaleString('en-AU', { month: 'long', year: 'numeric' });
  const scope = reportType === 'site' ? 'This site' : 'The organisation';

  let performanceStatement = '';
  if (metrics.ltifr < INDUSTRY_BENCHMARKS.ltifr) {
    performanceStatement = `${scope} is performing better than the industry benchmark for LTIFR (${metrics.ltifr} vs ${INDUSTRY_BENCHMARKS.ltifr}).`;
  } else if (metrics.ltifr > INDUSTRY_BENCHMARKS.ltifr * 1.5) {
    performanceStatement = `${scope}'s LTIFR of ${metrics.ltifr} significantly exceeds the industry benchmark of ${INDUSTRY_BENCHMARKS.ltifr}, indicating elevated safety risk.`;
  } else {
    performanceStatement = `${scope}'s LTIFR of ${metrics.ltifr} is near the industry benchmark of ${INDUSTRY_BENCHMARKS.ltifr}.`;
  }

  let trendStatement = '';
  if (comparison.previousMonth) {
    if (comparison.previousMonth.ltiChange < -10) {
      trendStatement = ` Safety performance has improved from the previous month, with LTIFR decreasing by ${Math.abs(comparison.previousMonth.ltiChange).toFixed(1)}%.`;
    } else if (comparison.previousMonth.ltiChange > 10) {
      trendStatement = ` There has been a concerning increase in LTIFR of ${comparison.previousMonth.ltiChange.toFixed(1)}% compared to last month.`;
    } else {
      trendStatement = ' Safety performance has remained relatively stable compared to the previous month.';
    }
  }

  const topInjuryType = breakdown.byType[0]?.type || 'N/A';
  const topMechanism = breakdown.byMechanism[0]?.mechanism || 'N/A';

  const summary = `During ${monthName}, ${metrics.totalIncidents} recordable incidents were reported across ${metrics.totalHours.toLocaleString()} hours worked. ${performanceStatement}${trendStatement}

The most common injury type was "${topInjuryType}" and the primary mechanism of injury was "${topMechanism}". ${metrics.mti > metrics.lti ? 'Medical treatment injuries outnumbered lost time injuries, suggesting effective early intervention.' : metrics.lti > 0 ? 'The occurrence of lost time injuries indicates opportunity for preventive measures.' : 'No lost time injuries were recorded this period.'}

${dataQuality.hasEstimatedHours ? 'Note: Some hours data is estimated. Frequency rates should be interpreted with this in mind.' : ''}`.trim();

  const recommendations: string[] = [];

  if (metrics.ltifr > INDUSTRY_BENCHMARKS.ltifr) {
    recommendations.push('Conduct a comprehensive safety audit to identify root causes of elevated injury rates.');
  }

  if (breakdown.byMechanism[0]?.mechanism?.toLowerCase().includes('manual') ||
      breakdown.byMechanism[0]?.mechanism?.toLowerCase().includes('handling')) {
    recommendations.push('Review and enhance manual handling training programs with focus on high-risk tasks.');
  }

  if (metrics.subcontractorHours > metrics.employeeHours * 0.3) {
    recommendations.push('Implement enhanced safety induction and monitoring for subcontractor personnel.');
  }

  if (comparison.previousMonth?.ltiChange > 10) {
    recommendations.push('Investigate recent changes in work activities or conditions that may have contributed to increased incident rates.');
  }

  if (recommendations.length < 3) {
    recommendations.push('Maintain current safety protocols and continue regular toolbox talks.');
    recommendations.push('Ensure all near-misses are being reported to enable proactive risk management.');
  }

  return { summary, recommendations };
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { siteId, employerId, month, reportType } = await req.json() as GenerateReportRequest;

    if (!employerId || !month || !reportType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employerId, month, reportType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (reportType === 'site' && !siteId) {
      return new Response(
        JSON.stringify({ error: 'siteId is required for site-level reports' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { startDate, endDate } = getMonthDateRange(month);
    console.log(`Generating ${reportType} report for month ${month} (${startDate} to ${endDate})`);

    // Build site filter based on report type
    let siteIds: number[] = [];
    if (reportType === 'site' && siteId) {
      siteIds = [siteId];
    } else {
      // Get all sites for the employer
      const { data: sites } = await supabase
        .from('sites')
        .select('site_id')
        .eq('employer_id', employerId);
      siteIds = sites?.map(s => s.site_id) || [];
    }

    // Fetch incidents for the period
    let incidentsQuery = supabase
      .from('incidents')
      .select(`
        incident_id,
        classification,
        injury_type,
        site_id,
        sites!inner (state)
      `)
      .gte('date_of_injury', startDate)
      .lte('date_of_injury', endDate);

    if (reportType === 'site' && siteId) {
      incidentsQuery = incidentsQuery.eq('site_id', siteId);
    } else {
      incidentsQuery = incidentsQuery.eq('employer_id', employerId);
    }

    const { data: incidents, error: incidentsError } = await incidentsQuery;
    if (incidentsError) {
      console.error('Error fetching incidents:', incidentsError);
    }

    // Fetch mechanism of injury codes for breakdown
    const { data: moiCodes } = await supabase
      .from('mechanism_of_injury_codes')
      .select('moi_code_id, moi_description');

    // Fetch body part codes for breakdown
    const { data: bodyParts } = await supabase
      .from('body_parts')
      .select('body_part_id, body_part_name');

    // Fetch hours worked for the period
    let hoursQuery = supabase
      .from('hours_worked')
      .select('site_id, employer_hours, subcontractor_hours, is_estimated, data_source')
      .eq('month', `${month}-01`);

    if (reportType === 'site' && siteId) {
      hoursQuery = hoursQuery.eq('site_id', siteId);
    } else {
      hoursQuery = hoursQuery.in('site_id', siteIds);
    }

    const { data: hoursData, error: hoursError } = await hoursQuery;
    if (hoursError) {
      console.error('Error fetching hours:', hoursError);
    }

    // Calculate totals
    const employeeHours = hoursData?.reduce((sum, h) => sum + Number(h.employer_hours || 0), 0) || 0;
    const subcontractorHours = hoursData?.reduce((sum, h) => sum + Number(h.subcontractor_hours || 0), 0) || 0;
    const totalHours = employeeHours + subcontractorHours;

    // Count incidents by classification
    const ltiCount = incidents?.filter(i => i.classification === 'LTI').length || 0;
    const mtiCount = incidents?.filter(i => i.classification === 'MTI').length || 0;
    const faiCount = incidents?.filter(i => i.classification === 'FAI').length || 0;
    const totalIncidents = ltiCount + mtiCount + faiCount;

    // Calculate frequency rates
    const ltifr = calculateFrequencyRate(ltiCount, totalHours);
    const trifr = calculateFrequencyRate(ltiCount + mtiCount, totalHours);
    const mtifr = calculateFrequencyRate(mtiCount, totalHours);

    const metrics: IncidentMetrics = {
      lti: ltiCount,
      mti: mtiCount,
      fai: faiCount,
      totalIncidents,
      ltifr,
      trifr,
      mtifr,
      totalHours,
      employeeHours,
      subcontractorHours,
    };

    // Build incident breakdown
    const typeCountMap = new Map<string, number>();
    incidents?.forEach(i => {
      const type = i.injury_type || 'Unknown';
      typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
    });
    const byType = Array.from(typeCountMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // State breakdown (for employer reports)
    let byState: { state: string; count: number; ltifr: number }[] | undefined;
    if (reportType === 'employer') {
      const stateCountMap = new Map<string, { count: number; hours: number }>();
      incidents?.forEach(i => {
        const state = (i.sites as any)?.state || 'Unknown';
        const current = stateCountMap.get(state) || { count: 0, hours: 0 };
        current.count += 1;
        stateCountMap.set(state, current);
      });

      // Add hours by state
      const { data: siteStates } = await supabase
        .from('sites')
        .select('site_id, state')
        .in('site_id', siteIds);

      hoursData?.forEach(h => {
        const site = siteStates?.find(s => s.site_id === h.site_id);
        const state = site?.state || 'Unknown';
        const current = stateCountMap.get(state) || { count: 0, hours: 0 };
        current.hours += Number(h.employer_hours || 0) + Number(h.subcontractor_hours || 0);
        stateCountMap.set(state, current);
      });

      byState = Array.from(stateCountMap.entries())
        .map(([state, data]) => ({
          state,
          count: data.count,
          ltifr: calculateFrequencyRate(data.count, data.hours),
        }))
        .filter(s => s.state !== 'Unknown')
        .sort((a, b) => b.ltifr - a.ltifr);
    }

    const incidentBreakdown: IncidentBreakdown = {
      byType,
      byMechanism: [], // Would need moi_code_id in incidents query
      byBodyPart: [], // Would need body_part_id in incidents query
      byState,
    };

    // Data quality assessment
    const hasEstimatedHours = hoursData?.some(h => h.is_estimated) || false;
    const dataSources = [...new Set(hoursData?.map(h => h.data_source || 'Manual Input'))];
    const dataQuality: DataQuality = {
      hasEstimatedHours,
      dataSources,
      totalSites: siteIds.length,
      sitesWithHours: hoursData?.length || 0,
    };

    // Fetch previous month for comparison
    const prevMonth = new Date(month + '-01');
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStr = prevMonth.toISOString().slice(0, 7);
    const { startDate: prevStartDate, endDate: prevEndDate } = getMonthDateRange(prevMonthStr);

    let prevIncidentsQuery = supabase
      .from('incidents')
      .select('classification')
      .gte('date_of_injury', prevStartDate)
      .lte('date_of_injury', prevEndDate);

    if (reportType === 'site' && siteId) {
      prevIncidentsQuery = prevIncidentsQuery.eq('site_id', siteId);
    } else {
      prevIncidentsQuery = prevIncidentsQuery.eq('employer_id', employerId);
    }

    const { data: prevIncidents } = await prevIncidentsQuery;

    let prevHoursQuery = supabase
      .from('hours_worked')
      .select('employer_hours, subcontractor_hours')
      .eq('month', `${prevMonthStr}-01`);

    if (reportType === 'site' && siteId) {
      prevHoursQuery = prevHoursQuery.eq('site_id', siteId);
    } else {
      prevHoursQuery = prevHoursQuery.in('site_id', siteIds);
    }

    const { data: prevHoursData } = await prevHoursQuery;

    let comparison: ReportComparison = {};

    if (prevIncidents && prevHoursData && prevHoursData.length > 0) {
      const prevTotalHours = prevHoursData.reduce(
        (sum, h) => sum + Number(h.employer_hours || 0) + Number(h.subcontractor_hours || 0),
        0
      );
      const prevLtiCount = prevIncidents.filter(i => i.classification === 'LTI').length;
      const prevMtiCount = prevIncidents.filter(i => i.classification === 'MTI').length;
      const prevLtifr = calculateFrequencyRate(prevLtiCount, prevTotalHours);
      const prevTrifr = calculateFrequencyRate(prevLtiCount + prevMtiCount, prevTotalHours);

      comparison.previousMonth = {
        ltifr: prevLtifr,
        trifr: prevTrifr,
        ltiChange: prevLtifr > 0 ? ((ltifr - prevLtifr) / prevLtifr) * 100 : 0,
        trifrChange: prevTrifr > 0 ? ((trifr - prevTrifr) / prevTrifr) * 100 : 0,
      };
    }

    // Industry benchmark comparison
    let benchmarkPerformance: 'above' | 'at' | 'below' = 'at';
    if (ltifr < INDUSTRY_BENCHMARKS.ltifr * 0.8) {
      benchmarkPerformance = 'above';
    } else if (ltifr > INDUSTRY_BENCHMARKS.ltifr * 1.2) {
      benchmarkPerformance = 'below';
    }

    comparison.industryBenchmark = {
      ltifr: INDUSTRY_BENCHMARKS.ltifr,
      trifr: INDUSTRY_BENCHMARKS.trifr,
      performance: benchmarkPerformance,
    };

    // Generate AI summary and recommendations
    const { summary, recommendations } = await generateExecutiveSummary(
      metrics,
      incidentBreakdown,
      comparison,
      dataQuality,
      reportType,
      month
    );

    const generatedReport: GeneratedReport = {
      executiveSummary: summary,
      metrics,
      incidentBreakdown,
      recommendations,
      dataQuality,
      comparison,
      generatedAt: new Date().toISOString(),
    };

    // Store in generated_reports table
    const { error: insertError } = await supabase.from('generated_reports').upsert(
      {
        employer_id: employerId,
        site_id: reportType === 'site' ? siteId : null,
        report_month: `${month}-01`,
        summary_month: `${month}-01`,
        report_data: generatedReport,
        executive_summary: summary,
        current_summary: summary,
        ai_recommendations: recommendations.join('\n'),
        last_summary_generated: new Date().toISOString(),
      },
      {
        onConflict: reportType === 'site' ? 'site_id,report_month' : 'employer_id,report_month',
      }
    );

    if (insertError) {
      console.error('Error storing report:', insertError);
    }

    return new Response(JSON.stringify(generatedReport), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate report', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

