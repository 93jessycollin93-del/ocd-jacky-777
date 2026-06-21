import { Code2 } from 'lucide-react';

function SnippetField({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[110px] w-full rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-mono outline-none resize-y"
      />
    </div>
  );
}

export default function WebsiteGeneratorCodeInjectionPanel({ value, onChange }) {
  const injections = value || {};

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Code2 className="w-4 h-4 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Code Injection</p>
          <p className="text-[11px] text-muted-foreground">Add per-project snippets for fonts, tracking pixels, analytics, or custom scripts.</p>
        </div>
      </div>

      <div className="grid gap-3">
        <SnippetField
          label="Head HTML"
          value={injections.head_html}
          onChange={(next) => onChange('head_html', next)}
          placeholder={'<link rel="preconnect" href="https://fonts.googleapis.com" />'}
        />
        <SnippetField
          label="Body Start HTML"
          value={injections.body_start_html}
          onChange={(next) => onChange('body_start_html', next)}
          placeholder={'<noscript>Your tracking pixel or tag manager fallback</noscript>'}
        />
        <SnippetField
          label="Body End HTML / Scripts"
          value={injections.body_end_html}
          onChange={(next) => onChange('body_end_html', next)}
          placeholder={'<script>console.log("analytics loaded")</script>'}
        />
        <SnippetField
          label="Custom CSS"
          value={injections.custom_css}
          onChange={(next) => onChange('custom_css', next)}
          placeholder={'.hero-title { letter-spacing: -0.04em; }'}
        />
        <SnippetField
          label="Custom JavaScript"
          value={injections.custom_js}
          onChange={(next) => onChange('custom_js', next)}
          placeholder={'window.dataLayer = window.dataLayer || [];'}
        />
      </div>

      <div className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground">
        These snippets are saved with this website project so you can manage different tracking, font, or analytics code per project.
      </div>
    </div>
  );
}