'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Discrepancy } from '@/lib/types/discrepancy';
import { format } from 'date-fns';

interface ResolveDiscrepancySheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    discrepancy: Discrepancy | null;
    initialNote?: string;
    onResolved?: () => void;
    onSubmit?: (note: string) => Promise<void>;
}

const RESOLUTION_REASONS = [
    { value: 'approved_exception', label: 'Approved Exception' },
    { value: 'remote_work', label: 'Remote Work Approved' },
    { value: 'field_work', label: 'Field Work / Client Meeting' },
    { value: 'data_error', label: 'Data Entry Error' },
    { value: 'system_glitch', label: 'System/ClickUp Glitch' },
    { value: 'other', label: 'Other (specify in notes)' }
];

export function ResolveDiscrepancySheet({
    open,
    onOpenChange,
    discrepancy,
    initialNote = '',
    onResolved,
    onSubmit
}: ResolveDiscrepancySheetProps) {
    const onClose = () => onOpenChange(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [notes, setNotes] = useState(initialNote);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Update notes if initialNote changes when opening
    useEffect(() => {
        if (open && initialNote) {
            setNotes(initialNote);
        } else if (open && !initialNote) {
            setNotes('');
        }
    }, [open, initialNote]);

    const handleSubmit = async () => {
        if (!selectedReason) {
            setError('Please select a resolution reason');
            return;
        }

        if (!discrepancy) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Use onSubmit prop if provided, otherwise use internal API call
            if (onSubmit) {
                const note = `${RESOLUTION_REASONS.find(r => r.value === selectedReason)?.label}: ${notes.trim()}`;
                await onSubmit(note);
            } else {
                const response = await fetch('/api/discrepancies/resolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        discrepancyId: discrepancy.id,
                        reason: selectedReason,
                        note: notes.trim() || undefined
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to resolve discrepancy');
                }
            }

            setSuccess(true);

            // Reset form and close after delay
            setTimeout(() => {
                setSelectedReason('');
                setNotes('');
                setSuccess(false);
                onResolved?.();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRuleTitle = (rule: string) => {
        const titles: Record<string, string> = {
            'LOG_AFTER_EXIT': 'Logged During OUT Period',
            'NO_ATTENDANCE': 'Logged Without Attendance',
            'OUTSIDE_HOURS': 'After-Hours Logging',
            'ZERO_PRESENCE': 'High Logging with Minimal Presence'
        };
        return titles[rule] || rule;
    };

    const getSeverityBadge = (severity: string) => {
        const styles = {
            high: 'bg-red-100 text-red-700 border-red-300',
            medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            low: 'bg-blue-100 text-blue-700 border-blue-300'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[severity as keyof typeof styles]}`}>
                {severity.toUpperCase()}
            </span>
        );
    };

    if (!discrepancy) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Resolve Discrepancy</SheetTitle>
                    <SheetDescription>
                        Provide context for why this discrepancy is being resolved
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Discrepancy Details */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div>
                            <div className="text-sm font-medium text-gray-500">Rule Type</div>
                            <div className="text-base font-semibold mt-1">{getRuleTitle(discrepancy.rule)}</div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div>
                                <div className="text-sm font-medium text-gray-500">Date</div>
                                <div className="text-base mt-1">
                                    {discrepancy.date ? format(new Date(discrepancy.date), 'MMM dd, yyyy') : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-500">Severity</div>
                                <div className="mt-1">{getSeverityBadge(discrepancy.severity)}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-medium text-gray-500">Minutes Involved</div>
                            <div className="text-base mt-1">{discrepancy.minutesInvolved} minutes</div>
                        </div>

                        {discrepancy.metadata && (
                            <div>
                                <div className="text-sm font-medium text-gray-500">Details</div>
                                <div className="text-sm mt-1 text-gray-600">
                                    {(() => {
                                        try {
                                            const meta = typeof discrepancy.metadata === 'string'
                                                ? JSON.parse(discrepancy.metadata)
                                                : discrepancy.metadata;

                                            if (meta.logTime) {
                                                return `Logged at ${meta.logTime}${meta.taskName ? ` - ${meta.taskName}` : ''}`;
                                            }
                                            if (meta.logCount) {
                                                return `${meta.logCount} log entries`;
                                            }
                                            return 'See metadata for details';
                                        } catch {
                                            return 'Details available';
                                        }
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resolution Form */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold">Resolution Reason *</Label>
                            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="mt-3">
                                {RESOLUTION_REASONS.map((reason) => (
                                    <div key={reason.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={reason.value} id={reason.value} />
                                        <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                                            {reason.label}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div>
                            <Label htmlFor="note" className="text-base font-semibold">
                                Additional Notes (Optional)
                            </Label>
                            <Textarea
                                id="note"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any context or explanation..."
                                className="mt-2 min-h-[100px]"
                            />
                        </div>
                    </div>

                    {/* Error/Success Messages */}
                    {
                        error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )
                    }

                    {
                        success && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Discrepancy resolved successfully!
                                </AlertDescription>
                            </Alert>
                        )
                    }

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !selectedReason}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Resolving...
                                </>
                            ) : (
                                'Resolve Discrepancy'
                            )}
                        </Button>
                    </div>
                </div >
            </SheetContent >
        </Sheet >
    );
}
