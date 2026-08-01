export const CANONICAL_INCENTIVE_TYPES = [
  'performance_bonus',
  'referral_bonus',
  'festival_bonus',
  'spot_award',
  'retention_bonus',
  'other',
] as const;

export type IncentiveType = typeof CANONICAL_INCENTIVE_TYPES[number];

export const INCENTIVE_TYPE_LABELS: Record<IncentiveType, string> = {
  performance_bonus: 'Performance Bonus',
  referral_bonus: 'Referral Bonus',
  festival_bonus: 'Festival Bonus',
  spot_award: 'Spot Award',
  retention_bonus: 'Retention Bonus',
  other: 'Other Incentive',
};

export const CANONICAL_INCENTIVE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'paid',
  'reversed',
] as const;

export type IncentiveStatus = typeof CANONICAL_INCENTIVE_STATUSES[number];

export const INCENTIVE_STATUS_LABELS: Record<IncentiveStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved (Awaiting Payroll)',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  paid: 'Paid',
  reversed: 'Reversed',
};

export interface IncentiveCapabilities {
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canMarkPaid: boolean;
  canReverse: boolean;
  canViewAudit: boolean;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number | string): number {
  const num = typeof paise === 'string' ? parseInt(paise, 10) : paise;
  if (isNaN(num) || num <= 0) return 0;
  return num / 100;
}

export function formatPaiseToINR(paise: number | string): string {
  const rs = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rs);
}

export function calculateTeamPoolRounding(totalPaise: number, eligibleCount: number) {
  if (eligibleCount <= 0) {
    return { perPersonPaise: 0, remainderPaise: 0 };
  }
  const perPersonPaise = Math.floor(totalPaise / eligibleCount);
  const remainderPaise = totalPaise % eligibleCount;
  return { perPersonPaise, remainderPaise };
}

export function getIncentiveCapabilities(
  status: IncentiveStatus,
  role: string,
  createdBy: string | null,
  actorId: string,
  totalAmountPaise: number
): IncentiveCapabilities {
  const isPrivileged = ['hr_manager', 'admin', 'super_admin'].includes(role);
  const isAdmin = ['admin', 'super_admin'].includes(role);
  const isSelfCreator = createdBy === actorId;
  const isHighValue = totalAmountPaise > 10000000; // > ₹1,00,000

  const canApprove =
    isPrivileged &&
    status === 'pending' &&
    (!isSelfCreator || !isHighValue || isAdmin);

  const canReject = isPrivileged && status === 'pending';
  const canCancel = isPrivileged && (status === 'pending' || status === 'approved');
  const canMarkPaid = isPrivileged && status === 'approved';
  const canReverse = isAdmin && status === 'paid';
  const canViewAudit = isPrivileged;

  return {
    canApprove,
    canReject,
    canCancel,
    canMarkPaid,
    canReverse,
    canViewAudit,
  };
}
