import MobileSelect from '@/eru/components/mobile/MobileSelect';

const CONDITIONS = [
  { value: 'unknown',  label: 'Unknown Condition (default — needs review)' },
  { value: 'raw_nm',   label: 'Raw · Near Mint (NM)' },
  { value: 'raw_lp',   label: 'Raw · Lightly Played (LP)' },
  { value: 'raw_mp',   label: 'Raw · Moderately Played (MP)' },
  { value: 'raw_hp',   label: 'Raw · Heavily Played (HP)' },
  { value: 'raw_dmg',  label: 'Raw · Damaged' },
  { value: 'graded',   label: 'Graded (PSA / BGS / CGC / ACE)' },
  { value: 'sealed',   label: 'Sealed Product' },
];

/**
 * ConditionPicker — explicit, manual condition selection. We refuse to infer
 * condition from the photo unless a real grading model is wired up.
 */
export default function ConditionPicker({ value = 'unknown', grade = '', onChange }) {
  const showGradeInput = value === 'graded';
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <div>
        <p className="text-xs font-semibold text-foreground">Condition</p>
        <p className="text-[11px] text-muted-foreground">
          Default is Unknown — ERU will not guess condition from a photo. Set the real condition to unlock matching prices.
        </p>
      </div>
      <MobileSelect
        value={value}
        onChange={(next) => onChange?.({ condition: next, grade: next === 'graded' ? grade : '' })}
        title="Condition"
        options={CONDITIONS}
      />
      {showGradeInput && (
        <input
          value={grade}
          onChange={(e) => onChange?.({ condition: 'graded', grade: e.target.value })}
          placeholder="Grade label, e.g. PSA 9, BGS 9.5, CGC 10"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-mono text-foreground outline-none"
        />
      )}
    </section>
  );
}