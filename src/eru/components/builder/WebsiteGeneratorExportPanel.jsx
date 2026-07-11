import { Copy, FileJson, FileText } from 'lucide-react';
import { buildCmsPageContent, buildWebsiteExportJson, buildWebsiteExportMarkdown } from './websiteExportUtils';

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/30">
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

export default function WebsiteGeneratorExportPanel({ draft, activePageType, activePageName }) {
  if (!draft?.site_blueprint) return null;

  const handleCopy = async (value) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Export & CMS Copy</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Copy the full structure as JSON or Markdown, or copy the current page content for an external CMS.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ActionButton icon={FileJson} label="Copy JSON" onClick={() => handleCopy(buildWebsiteExportJson(draft))} />
        <ActionButton icon={FileText} label="Copy Markdown" onClick={() => handleCopy(buildWebsiteExportMarkdown(draft))} />
        <ActionButton icon={Copy} label={`Copy ${activePageName || 'Page'} Content`} onClick={() => handleCopy(buildCmsPageContent(draft, activePageType))} />
      </div>

      <div className="rounded-xl bg-secondary/50 p-3 text-[11px] text-muted-foreground">
        Export includes blueprint, generated copy, and saved theme settings. Page copy is formatted for easy pasting into CMS editors.
      </div>
    </div>
  );
}