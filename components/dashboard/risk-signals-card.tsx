'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { RiskSignalSummary } from '@/lib/services/risk-signals-service';

interface RiskSignalsCardProps {
  signals: RiskSignalSummary[];
  insights?: {
    title: string;
    description: string;
  };
}

export function RiskSignalsCard({ signals, insights }: RiskSignalsCardProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'LOW':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk Signals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.length === 0 ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No risk signals detected</p>
            <p className="text-xs text-gray-500 mt-1">Team logging discipline looks good</p>
          </div>
        ) : (
          <>
            {signals.map((signal, index) => (
              <div
                key={signal.signalId}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(
                  signal.severity
                )}`}
              >
                {getSeverityIcon(signal.severity)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    ⚠️ {signal.affectedMemberCount} {signal.description}
                  </p>
                  {signal.totalOccurrences > signal.affectedMemberCount && (
                    <p className="text-xs text-gray-600 mt-1">
                      {signal.totalOccurrences} total occurrences this week
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Insights Section */}
            {insights && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    💡 {insights.title}
                  </p>
                  <p className="text-xs text-blue-800">{insights.description}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

