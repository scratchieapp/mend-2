import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';
import type { GeneratedReport } from '@/types/reports';
import { INDUSTRY_BENCHMARKS } from '@/types/reports';

// Register fonts (using system fonts for compatibility)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@canvas-fonts/helvetica@1.0.4/Helvetica-Bold.ttf', fontWeight: 'bold' },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#059669',
    paddingBottom: 20,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  reportMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  text: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  metricCard: {
    width: '31%',
    marginRight: '2%',
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    color: '#666',
  },
  metricGood: {
    color: '#059669',
  },
  metricWarning: {
    color: '#d97706',
  },
  metricBad: {
    color: '#dc2626',
  },
  incidentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  incidentCard: {
    width: '18%',
    marginRight: '2%',
    marginBottom: 10,
    padding: 10,
    textAlign: 'center',
    borderRadius: 4,
  },
  incidentLti: {
    backgroundColor: '#fef2f2',
  },
  incidentMti: {
    backgroundColor: '#fffbeb',
  },
  incidentFai: {
    backgroundColor: '#eff6ff',
  },
  incidentGeneric: {
    backgroundColor: '#f3f4f6',
  },
  incidentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  incidentLabel: {
    fontSize: 8,
    color: '#666',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellNarrow: {
    width: 60,
    fontSize: 9,
  },
  recommendation: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  recommendationNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333',
  },
  dataQualityBanner: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 15,
  },
  bannerGood: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  bannerWarning: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  bannerText: {
    fontSize: 9,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 10,
    fontSize: 8,
    color: '#999',
  },
  pageNumber: {
    fontSize: 8,
    color: '#999',
  },
});

interface ReportPDFDocumentProps {
  report: GeneratedReport;
  siteName?: string;
  employerName?: string;
  month: string;
  reportType: 'site' | 'employer';
}

const formatMonth = (month: string): string => {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
};

const getPerformanceColor = (rate: number, benchmark: number): 'metricGood' | 'metricWarning' | 'metricBad' => {
  const ratio = rate / benchmark;
  if (ratio < 0.8) return 'metricGood';
  if (ratio > 1.2) return 'metricBad';
  return 'metricWarning';
};

export const ReportPDFDocument = ({
  report,
  siteName,
  employerName,
  month,
  reportType,
}: ReportPDFDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>MEND</Text>
        <Text style={styles.subtitle}>Safety Intelligence Platform</Text>
        <Text style={styles.reportTitle}>
          {reportType === 'site' ? 'Site Safety Report' : 'Company Safety Report'}
        </Text>
        <Text style={styles.reportMeta}>
          {reportType === 'site' ? siteName : employerName} | {formatMonth(month)}
        </Text>
      </View>

      {/* Data Quality Banner */}
      <View style={[
        styles.dataQualityBanner,
        report.dataQuality.hasEstimatedHours ? styles.bannerWarning : styles.bannerGood
      ]}>
        <Text style={styles.bannerText}>
          {report.dataQuality.hasEstimatedHours
            ? '⚠ Some hours data is estimated. Frequency rates may be approximate.'
            : `✓ ${report.dataQuality.sitesWithHours} of ${report.dataQuality.totalSites} sites have verified hours data.`
          }
        </Text>
      </View>

      {/* Executive Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.text}>{report.executiveSummary}</Text>
      </View>

      {/* Frequency Rates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles[getPerformanceColor(report.metrics.ltifr, INDUSTRY_BENCHMARKS.ltifr)]]}>
              {report.metrics.ltifr.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>LTIFR (benchmark: {INDUSTRY_BENCHMARKS.ltifr})</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles[getPerformanceColor(report.metrics.trifr, INDUSTRY_BENCHMARKS.trifr)]]}>
              {report.metrics.trifr.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>TRIFR (benchmark: {INDUSTRY_BENCHMARKS.trifr})</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles[getPerformanceColor(report.metrics.mtifr, INDUSTRY_BENCHMARKS.mtifr)]]}>
              {report.metrics.mtifr.toFixed(1)}
            </Text>
            <Text style={styles.metricLabel}>MTIFR</Text>
          </View>
        </View>
      </View>

      {/* Incident Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Incident Summary</Text>
        <View style={styles.incidentGrid}>
          <View style={[styles.incidentCard, styles.incidentLti]}>
            <Text style={[styles.incidentValue, { color: '#dc2626' }]}>{report.metrics.lti}</Text>
            <Text style={styles.incidentLabel}>Lost Time Injuries</Text>
          </View>
          <View style={[styles.incidentCard, styles.incidentMti]}>
            <Text style={[styles.incidentValue, { color: '#d97706' }]}>{report.metrics.mti}</Text>
            <Text style={styles.incidentLabel}>Medical Treatment</Text>
          </View>
          <View style={[styles.incidentCard, styles.incidentFai]}>
            <Text style={[styles.incidentValue, { color: '#2563eb' }]}>{report.metrics.fai}</Text>
            <Text style={styles.incidentLabel}>First Aid</Text>
          </View>
          <View style={[styles.incidentCard, styles.incidentGeneric]}>
            <Text style={styles.incidentValue}>{report.metrics.totalIncidents}</Text>
            <Text style={styles.incidentLabel}>Total Incidents</Text>
          </View>
          <View style={[styles.incidentCard, styles.incidentGeneric]}>
            <Text style={styles.incidentValue}>{(report.metrics.totalHours / 1000).toFixed(0)}k</Text>
            <Text style={styles.incidentLabel}>Hours Worked</Text>
          </View>
        </View>
      </View>

      {/* Incident Type Breakdown */}
      {report.incidentBreakdown.byType.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incidents by Type</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Type</Text>
              <Text style={styles.tableCellNarrow}>Count</Text>
            </View>
            {report.incidentBreakdown.byType.slice(0, 6).map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.type}</Text>
                <Text style={styles.tableCellNarrow}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Jurisdictional Comparison (for employer reports) */}
      {reportType === 'employer' && report.incidentBreakdown.byState && report.incidentBreakdown.byState.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jurisdictional Analysis</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>State</Text>
              <Text style={styles.tableCellNarrow}>Incidents</Text>
              <Text style={styles.tableCellNarrow}>LTIFR</Text>
            </View>
            {report.incidentBreakdown.byState.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.state}</Text>
                <Text style={styles.tableCellNarrow}>{item.count}</Text>
                <Text style={styles.tableCellNarrow}>{item.ltifr.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Generated by MEND Safety Intelligence Platform</Text>
        <Text>{new Date(report.generatedAt).toLocaleDateString('en-AU', { dateStyle: 'long' })}</Text>
      </View>
    </Page>

    {/* Page 2: Recommendations */}
    {report.recommendations.length > 0 && (
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>MEND</Text>
          <Text style={styles.reportTitle}>AI-Generated Recommendations</Text>
          <Text style={styles.reportMeta}>
            {reportType === 'site' ? siteName : employerName} | {formatMonth(month)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Action Items</Text>
          {report.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendation}>
              <Text style={styles.recommendationNumber}>{index + 1}</Text>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Comparison with Previous Period */}
        {report.comparison.previousMonth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Month-on-Month Comparison</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Previous LTIFR</Text>
                <Text style={[styles.metricValue, { fontSize: 18 }]}>
                  {report.comparison.previousMonth.ltifr.toFixed(1)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>LTIFR Change</Text>
                <Text style={[
                  styles.metricValue,
                  { fontSize: 18 },
                  report.comparison.previousMonth.ltiChange < 0 ? styles.metricGood : styles.metricBad
                ]}>
                  {report.comparison.previousMonth.ltiChange > 0 ? '+' : ''}
                  {report.comparison.previousMonth.ltiChange.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TRIFR Change</Text>
                <Text style={[
                  styles.metricValue,
                  { fontSize: 18 },
                  report.comparison.previousMonth.trifrChange < 0 ? styles.metricGood : styles.metricBad
                ]}>
                  {report.comparison.previousMonth.trifrChange > 0 ? '+' : ''}
                  {report.comparison.previousMonth.trifrChange.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Industry Benchmark */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Industry Benchmark Comparison</Text>
          <Text style={styles.text}>
            Your {reportType === 'site' ? 'site' : 'organisation'}'s LTIFR of {report.metrics.ltifr.toFixed(1)} is{' '}
            {report.comparison.industryBenchmark?.performance === 'above'
              ? `below the industry benchmark of ${INDUSTRY_BENCHMARKS.ltifr}, indicating strong safety performance.`
              : report.comparison.industryBenchmark?.performance === 'below'
                ? `above the industry benchmark of ${INDUSTRY_BENCHMARKS.ltifr}, indicating areas for improvement.`
                : `near the industry benchmark of ${INDUSTRY_BENCHMARKS.ltifr}.`
            }
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Generated by MEND Safety Intelligence Platform</Text>
          <Text style={styles.pageNumber}>Page 2</Text>
        </View>
      </Page>
    )}
  </Document>
);

// Helper function to generate PDF blob
export const generateReportPDF = async (
  report: GeneratedReport,
  siteName: string | undefined,
  employerName: string | undefined,
  month: string,
  reportType: 'site' | 'employer'
): Promise<Blob> => {
  const doc = (
    <ReportPDFDocument
      report={report}
      siteName={siteName}
      employerName={employerName}
      month={month}
      reportType={reportType}
    />
  );
  
  const blob = await pdf(doc).toBlob();
  return blob;
};

// Helper function to download PDF
export const downloadReportPDF = async (
  report: GeneratedReport,
  siteName: string | undefined,
  employerName: string | undefined,
  month: string,
  reportType: 'site' | 'employer'
): Promise<void> => {
  const blob = await generateReportPDF(report, siteName, employerName, month, reportType);
  
  const filename = reportType === 'site'
    ? `${siteName?.replace(/\s+/g, '-')}-Safety-Report-${month}.pdf`
    : `${employerName?.replace(/\s+/g, '-')}-Safety-Report-${month}.pdf`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

