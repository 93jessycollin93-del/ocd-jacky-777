import { FolderOpen, Loader2, Plus } from 'lucide-react';

export default function WebsiteGeneratorProjectList({ projects, loading, selectedProjectId, onSelect, onCreateNew }) {
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Saved Projects</p>
          </div>
          <button onClick={onCreateNew} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
        <div className="rounded-xl bg-secondary/50 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            {selectedProject ? `Open: ${selectedProject.name}` : 'Select a saved project or start a new one.'}
          </p>
        </div>
      </div>
      <div className="max-h-[28rem] overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No website projects yet.</p>
        ) : projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedProjectId === project.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40 hover:border-primary/30'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{project.name}</p>
              <span className="rounded-full bg-card px-2 py-1 text-[10px] uppercase text-muted-foreground">{project.status}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{project.description || 'No description yet.'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}