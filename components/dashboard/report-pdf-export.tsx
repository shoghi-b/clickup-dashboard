'use client';

import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import type { MemberComplianceReport, ReportSummary, DateDetail } from '@/lib/types/report';

// PDF Styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottom: 2,
        borderBottomColor: '#2563eb',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
    },
    logo: {
        width: 80,
        height: 'auto',
        marginLeft: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 3,
    },
    metadata: {
        fontSize: 10,
        color: '#475569',
    },
    summarySection: {
        marginTop: 20,
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f1f5f9',
        borderRadius: 4,
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1e293b',
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    summaryLabel: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 3,
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        padding: 8,
        fontWeight: 'bold',
        borderBottom: 1,
        borderBottomColor: '#cbd5e1',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 8,
        borderBottom: 1,
        borderBottomColor: '#e2e8f0',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    colMember: {
        width: '20%',
    },
    colMetric: {
        width: '10%',
        textAlign: 'center',
        fontSize: 8,
    },
    memberName: {
        fontWeight: 'bold',
        color: '#1e293b',
    },
    metricGood: {
        color: '#16a34a',
    },
    metricWarning: {
        color: '#ea580c',
    },
    metricBad: {
        color: '#dc2626',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 8,
        borderTop: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
    },
    // Detail page styles
    detailPage: {
        padding: 40,
        fontSize: 10,
    },
    detailHeader: {
        marginBottom: 15,
        borderBottom: 2,
        borderBottomColor: '#2563eb',
        paddingBottom: 10,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e40af',
        marginBottom: 5,
    },
    detailSubtitle: {
        fontSize: 11,
        color: '#64748b',
    },
    metricSection: {
        marginBottom: 15,
    },
    metricSectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        padding: 6,
        backgroundColor: '#f1f5f9',
        borderLeft: 3,
        borderLeftColor: '#2563eb',
        paddingLeft: 10,
    },
    detailItem: {
        flexDirection: 'row',
        padding: 6,
        borderBottom: 1,
        borderBottomColor: '#e2e8f0',
        marginBottom: 2,
    },
    detailDate: {
        width: '30%',
        fontWeight: 'bold',
        color: '#334155',
    },
    detailValue: {
        width: '70%',
        color: '#64748b',
    },
    noDataText: {
        fontSize: 9,
        color: '#94a3b8',
        fontStyle: 'italic',
        padding: 6,
    },
});

interface PDFDocumentProps {
    reports: MemberComplianceReport[];
    summary: ReportSummary;
    periodLabel: string;
}

// PDF Document Component
const ComplianceReportDocument = ({ reports, summary, periodLabel }: PDFDocumentProps) => {
    const getMetricColor = (value: number, metricType: string): any => {
        if (value === 0) return styles.metricGood;
        if (metricType === 'noDataDays') {
            return value > 2 ? styles.metricBad : styles.metricWarning;
        }
        return value > 3 ? styles.metricBad : styles.metricWarning;
    };

    const renderDetailItem = (detail: DateDetail | string, index: number) => {
        if (typeof detail === 'string') {
            // Simple date string (for no-data days)
            return (
                <View key={index} style={styles.detailItem}>
                    <Text style={styles.detailDate}>{format(parseISO(detail), 'EEE, MMM dd, yyyy')}</Text>
                    <Text style={styles.detailValue}>No attendance or ClickUp data</Text>
                </View>
            );
        } else {
            // DateDetail object with additional info
            return (
                <View key={index} style={styles.detailItem}>
                    <Text style={styles.detailDate}>{format(parseISO(detail.date), 'EEE, MMM dd, yyyy')}</Text>
                    <Text style={styles.detailValue}>
                        {detail.value}
                        {detail.attendanceHours !== undefined && detail.clickupHours !== undefined &&
                            ` | Attendance: ${detail.attendanceHours.toFixed(1)}h, ClickUp: ${detail.clickupHours.toFixed(1)}h`
                        }
                    </Text>
                </View>
            );
        }
    };

    return (
        <Document>
            {/* Summary Page */}
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Tcules | Attendance & ClickUp - Compliance Report</Text>
                        <Text style={styles.subtitle}>Team Member Attendance & ClickUp Compliance</Text>
                        <Text style={styles.metadata}>
                            Period: {format(summary.periodStart, 'MMM dd, yyyy')} - {format(summary.periodEnd, 'MMM dd, yyyy')}
                        </Text>
                        <Text style={styles.metadata}>
                            Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
                        </Text>
                    </View>
                    <Image src="/tcules-logo.png" style={styles.logo} />
                </View>

                {/* Summary Section */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Summary</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{summary.totalMembers}</Text>
                            <Text style={styles.summaryLabel}>Members</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#ea580c' }]}>
                                {summary.aggregateMetrics.totalLateCheckins}
                            </Text>
                            <Text style={styles.summaryLabel}>Late Check-ins</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                                {summary.aggregateMetrics.totalSuperLateCheckins}
                            </Text>
                            <Text style={styles.summaryLabel}>Super Late</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#f97316' }]}>
                                {summary.aggregateMetrics.totalInsufficientHoursBoth}
                            </Text>
                            <Text style={styles.summaryLabel}>Insufficient Hours</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
                                {summary.aggregateMetrics.totalOutsideOfficeWork}
                            </Text>
                            <Text style={styles.summaryLabel}>Outside Work</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#64748b' }]}>
                                {summary.aggregateMetrics.totalNoDataDays}
                            </Text>
                            <Text style={styles.summaryLabel}>No Data Days</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#9333ea' }]}>
                                {summary.aggregateMetrics.totalSuperLateWithOfficeButLowWork}
                            </Text>
                            <Text style={styles.summaryLabel}>SL+8h Office &lt;8h Work</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
                                {summary.aggregateMetrics.totalSuperLateWithOfficeAndGoodWork}
                            </Text>
                            <Text style={styles.summaryLabel}>SL+8h Office 8h+ Work</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#d97706' }]}>
                                {summary.aggregateMetrics.totalLessThan8hOffice}
                            </Text>
                            <Text style={styles.summaryLabel}>&lt;8h Office</Text>
                        </View>
                    </View>
                </View>

                {/* Compliance Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colMember}>Member</Text>
                        <Text style={styles.colMetric}>Late</Text>
                        <Text style={styles.colMetric}>SL</Text>
                        <Text style={styles.colMetric}>Insuf</Text>
                        <Text style={styles.colMetric}>Out</Text>
                        <Text style={styles.colMetric}>NoData</Text>
                        <Text style={styles.colMetric}>SL+8h&lt;8</Text>
                        <Text style={styles.colMetric}>SL+8h8+</Text>
                        <Text style={styles.colMetric}>&lt;8hOff</Text>
                    </View>

                    {reports.map((report, index) => (
                        <View
                            key={report.memberId}
                            style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                        >
                            <Text style={[styles.colMember, styles.memberName]}>{report.memberName}</Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.lateCheckins, 'late')]}>
                                {report.metrics.lateCheckins}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.superLateCheckins, 'superLate')]}>
                                {report.metrics.superLateCheckins}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.insufficientHoursBoth, 'insufficient')]}>
                                {report.metrics.insufficientHoursBoth}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.outsideOfficeWork, 'outside')]}>
                                {report.metrics.outsideOfficeWork}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.noDataDays, 'noDataDays')]}>
                                {report.metrics.noDataDays}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.superLateWithOfficeButLowWork, 'superLateOffice')]}>
                                {report.metrics.superLateWithOfficeButLowWork}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.superLateWithOfficeAndGoodWork, 'superLateOfficeGood')]}>
                                {report.metrics.superLateWithOfficeAndGoodWork}
                            </Text>
                            <Text style={[styles.colMetric, getMetricColor(report.metrics.lessThan8hOffice, 'lessThan8hOffice')]}>
                                {report.metrics.lessThan8hOffice}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        Tcules | Attendance & ClickUp - Compliance Report - Page 1 of {reports.length + 1}
                    </Text>
                </View>
            </Page>

            {/* Detail Pages - One per member */}
            {reports.map((report, reportIndex) => (
                <Page key={report.memberId} size="A4" style={styles.detailPage}>
                    {/* Detail Header */}
                    <View style={styles.detailHeader}>
                        <Text style={styles.detailTitle}>
                            Detailed Report: {report.memberName}
                        </Text>
                        <Text style={styles.detailSubtitle}>
                            Period: {format(summary.periodStart, 'MMM dd, yyyy')} - {format(summary.periodEnd, 'MMM dd, yyyy')}
                        </Text>
                    </View>

                    {/* Late Check-ins Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Late Check-ins (after 10:30 AM) - {report.metrics.lateCheckins} instances
                        </Text>
                        {report.metrics.lateCheckinDates.length > 0 ? (
                            report.metrics.lateCheckinDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No late check-ins recorded</Text>
                        )}
                    </View>

                    {/* Super Late Check-ins Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Super Late Check-ins (after 10:45 AM) - {report.metrics.superLateCheckins} instances
                        </Text>
                        {report.metrics.superLateCheckinDates.length > 0 ? (
                            report.metrics.superLateCheckinDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No super late check-ins recorded</Text>
                        )}
                    </View>

                    {/* Insufficient Hours Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Insufficient Hours (Both &lt;8h) - {report.metrics.insufficientHoursBoth} days
                        </Text>
                        {report.metrics.insufficientHoursDates.length > 0 ? (
                            report.metrics.insufficientHoursDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No days with insufficient hours</Text>
                        )}
                    </View>

                    {/* Outside Office Work Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Outside Office Work (&lt;8h office, ≥8h ClickUp) - {report.metrics.outsideOfficeWork} days
                        </Text>
                        {report.metrics.outsideWorkDates.length > 0 ? (
                            report.metrics.outsideWorkDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No outside office work recorded</Text>
                        )}
                    </View>

                    {/* No Data Days Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            No Data Days (Potential Leave) - {report.metrics.noDataDays} days
                        </Text>
                        {report.metrics.noDataDates.length > 0 ? (
                            report.metrics.noDataDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No days without data</Text>
                        )}
                    </View>

                    {/* Super Late + 8h Office + <8h Work Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Super Late + 8h Office + &lt;8h Work - {report.metrics.superLateWithOfficeButLowWork} days
                        </Text>
                        {report.metrics.superLateWithOfficeButLowWorkDates.length > 0 ? (
                            report.metrics.superLateWithOfficeButLowWorkDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No instances recorded</Text>
                        )}
                    </View>

                    {/* Super Late + 8h Office + 8h+ Work Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Super Late + 8h Office + 8h+ Work - {report.metrics.superLateWithOfficeAndGoodWork} days
                        </Text>
                        {report.metrics.superLateWithOfficeAndGoodWorkDates.length > 0 ? (
                            report.metrics.superLateWithOfficeAndGoodWorkDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No instances recorded</Text>
                        )}
                    </View>

                    {/* Less than 8h Office Section */}
                    <View style={styles.metricSection}>
                        <Text style={styles.metricSectionTitle}>
                            Less than 8h Office - {report.metrics.lessThan8hOffice} days
                        </Text>
                        {report.metrics.lessThan8hOfficeDates.length > 0 ? (
                            report.metrics.lessThan8hOfficeDates.map((detail, idx) => renderDetailItem(detail, idx))
                        ) : (
                            <Text style={styles.noDataText}>No instances recorded</Text>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text>
                            Tcules | Attendance & ClickUp - Detailed Report - Page {reportIndex + 2} of {reports.length + 1}
                        </Text>
                    </View>
                </Page>
            ))}
        </Document>
    );
};

/**
 * Generate and download PDF report
 */
export async function generatePDF(
    reports: MemberComplianceReport[],
    summary: ReportSummary,
    periodLabel: string
): Promise<void> {
    try {
        // Create PDF document
        const doc = <ComplianceReportDocument reports={reports} summary={summary} periodLabel={periodLabel} />;

        // Generate PDF blob
        const asPdf = pdf(doc);
        const blob = await asPdf.toBlob();

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        link.download = `Compliance_Report_${periodLabel.replace(/\s+/g, '_')}_${dateStr}.pdf`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw new Error('Failed to generate PDF');
    }
}
