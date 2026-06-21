import { COLLECTOR_STATUS_LABELS, COLLECTOR_STATUS_ICONS } from '../../lib/collectorRewards';

export default function CollectorReputationPill({ statusIcon = 'seed', size = 'md' }) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 font-medium text-primary ${sizeClasses[size]}`}>
      <span>{COLLECTOR_STATUS_ICONS[statusIcon] || COLLECTOR_STATUS_ICONS.seed}</span>
      <span>{COLLECTOR_STATUS_LABELS[statusIcon] || COLLECTOR_STATUS_LABELS.seed}</span>
    </span>
  );
}