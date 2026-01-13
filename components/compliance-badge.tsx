import { Badge } from '@/components/ui/badge';

type ComplianceStatus = 'FULLY_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';

interface ComplianceBadgeProps {
  status: ComplianceStatus;
}

export function ComplianceBadge({ status }: ComplianceBadgeProps) {
  const variants: Record<ComplianceStatus, { label: string; className: string }> = {
    FULLY_COMPLIANT: {
      label: 'Fully Compliant',
      className: 'bg-green-100 text-green-800 hover:bg-green-100',
    },
    PARTIALLY_COMPLIANT: {
      label: 'Partially Compliant',
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    },
    NON_COMPLIANT: {
      label: 'Non-Compliant',
      className: 'bg-red-100 text-red-800 hover:bg-red-100',
    },
  };

  const variant = variants[status];

  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  );
}

