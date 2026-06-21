export default function ConditionBadge({ score }) {
  const label = score >= 9 ? 'Mint' : score >= 7 ? 'Excellent' : score >= 5 ? 'Good' : score >= 3 ? 'Used' : 'Heavily Used';
  const color = score >= 9 ? 'bg-green-500/10 text-green-400' : score >= 7 ? 'bg-blue-500/10 text-blue-400' : score >= 5 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400';

  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${color}`}>Condition {score}/10 · {label}</span>;
}