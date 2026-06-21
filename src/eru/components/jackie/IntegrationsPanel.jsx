import { Database, Link as LinkIcon } from 'lucide-react';

const INTEGRATIONS = [
  'Google Analytics',
  'Airtable',
  'HubSpot',
  'Google Sheets',
  'Supabase',
  'Salesforce'
];

export default function IntegrationsPanel() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">API Integrations</h3>
        <p className="text-xs text-muted-foreground mt-1">Jackie can work alongside connected data and financial platforms for broader analysis.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {INTEGRATIONS.map((item) => (
          <div key={item} className="bg-secondary border border-border rounded-lg px-3 py-2 flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs">{item}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <LinkIcon className="w-3 h-3" /> Existing app connectors can be used to expand Jackie with external financial data sources.
        </p>
        <p className="text-[10px] text-muted-foreground">Jackie Foundry can now prepare preview-first bot and API key setups before applying them.</p>
      </div>
    </div>
  );
}