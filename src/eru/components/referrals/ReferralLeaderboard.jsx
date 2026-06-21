export default function ReferralLeaderboard({ items = [] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Top referrers</p>
        <p className="text-[11px] text-muted-foreground">Based on successful signups and total rewards earned.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">No referral activity yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.user_email} className="rounded-xl border border-border bg-secondary/20 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">#{index + 1} · {item.user_email}</p>
                <p className="text-[11px] text-muted-foreground">{item.successful_referrals} successful signups</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">{item.reputation_reward_total}</p>
                <p className="text-[10px] text-muted-foreground">rep points</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}