const MODULES = [
  { id: 'faq', label: 'FAQ Answers', desc: 'Handles common support and product questions' },
  { id: 'lead_capture', label: 'Lead Capture', desc: 'Collects buyer intent and follow-up details' },
  { id: 'listing_guidance', label: 'Listing Guidance', desc: 'Helps users understand listings and policies' },
  { id: 'order_support', label: 'Order Support', desc: 'Answers order and delivery related questions' },
  { id: 'memory_personalization', label: 'Memory Personalization', desc: 'Uses saved context for tailored replies' },
  { id: 'escalation', label: 'Human Escalation', desc: 'Escalates complex or risky requests' },
];

export default function ToolModulePicker({ value = [], onChange }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Tool modules</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {MODULES.map((module) => {
          const active = value.includes(module.id);
          return (
            <button
              key={module.id}
              type="button"
              onClick={() => toggle(module.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${active ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}
            >
              <p className="text-sm font-medium">{module.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{module.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}