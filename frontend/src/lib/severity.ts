export type Severity = 'critical' | 'high' | 'medium' | 'low';

export const severityText: Record<Severity, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
};

export const severityBg: Record<Severity, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
};

// Wazuh rule level → severity band, matching the dashboard legend
export const levelToSeverity = (level: number): Severity => {
  if (level >= 15) return 'critical';
  if (level >= 12) return 'high';
  if (level >= 7) return 'medium';
  return 'low';
};
