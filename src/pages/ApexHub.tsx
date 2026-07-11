import { Link } from "react-router-dom";
import { ArrowLeft, Mountain, Sparkles } from "lucide-react";

export default function ApexHub() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex items-center gap-3 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <Mountain className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-mono text-sm tracking-wider">APEX INTELLIGENCE HUB</h1>
            <p className="text-[10px] text-muted-foreground">Imported placeholder · awaiting content</p>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-semibold">Apex Intelligence Hub is a blank slate</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            The source project was an unedited Lovable starter — nothing functional to import. This page is reserved as the mount point. When Apex gets real screens, they land here at <code className="text-primary">/apex</code>.
          </p>
          <div className="mt-6 grid gap-2 text-left text-xs text-muted-foreground">
            <div className="rounded border border-border bg-muted/30 px-3 py-2">Route reserved: <span className="text-foreground font-mono">/apex</span></div>
            <div className="rounded border border-border bg-muted/30 px-3 py-2">Sidebar entry installed under <span className="text-foreground">More tools</span></div>
            <div className="rounded border border-border bg-muted/30 px-3 py-2">Ready to receive components when the source project ships content</div>
          </div>
        </div>
      </main>
    </div>
  );
}
