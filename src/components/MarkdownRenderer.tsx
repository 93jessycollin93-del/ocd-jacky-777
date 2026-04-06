import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Play, RotateCcw, Maximize2, Minimize2, Eye, Code } from "lucide-react";

// ─── Copy Button ──────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Live HTML/CSS/JS Preview ─────────────────────────────

function LivePreview({ code, language }: { code: string; language: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const htmlContent = useMemo(() => {
    if (language === "html") {
      // Wrap in full HTML if it's a fragment
      if (!code.includes("<html") && !code.includes("<!DOCTYPE")) {
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:#1a1a2e;color:#e0e0e0;}</style></head><body>${code}</body></html>`;
      }
      return code;
    }
    if (language === "css") {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${code}</style></head><body><div class="demo"><h2>CSS Preview</h2><p>Styled content</p><button>Button</button><div class="box">Box</div></div></body></html>`;
    }
    if (language === "javascript" || language === "js") {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:monospace;background:#1a1a2e;color:#00ff88;font-size:14px;white-space:pre-wrap;}#output{}</style></head><body><div id="output"></div><script>
const _log = console.log;
const out = document.getElementById('output');
console.log = (...args) => { out.textContent += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\\n'; _log(...args); };
try { ${code} } catch(e) { out.textContent += '❌ ' + e.message + '\\n'; }
</script></body></html>`;
    }
    return null;
  }, [code, language]);

  if (!htmlContent) return null;

  return (
    <div className={`mt-2 rounded-md border border-border overflow-hidden transition-all ${expanded ? "fixed inset-4 z-50 bg-background" : ""}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/60 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Live Preview
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowCode(!showCode)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={showCode ? "Show preview" : "Show code"}>
            {showCode ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              if (iframeRef.current) {
                iframeRef.current.srcdoc = htmlContent;
              }
            }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Re-run"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title={expanded ? "Minimize" : "Expand"}>
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {showCode ? (
        <SyntaxHighlighter style={oneDark} language={language} customStyle={{ margin: 0, borderRadius: 0, fontSize: "12px", background: "hsl(var(--secondary) / 0.3)" }}>
          {code}
        </SyntaxHighlighter>
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className={`w-full border-0 bg-background ${expanded ? "flex-1 h-[calc(100%-36px)]" : "h-48"}`}
          sandbox="allow-scripts"
          title="Live preview"
        />
      )}
    </div>
  );
}

// ─── Mermaid Diagram Renderer ─────────────────────────────

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useMemo(() => `mermaid-${Math.random().toString(36).slice(2, 9)}`, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });

        // Create an offscreen container with real dimensions for mermaid to render into
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "absolute";
        tempDiv.style.left = "-9999px";
        tempDiv.style.top = "-9999px";
        tempDiv.style.width = "800px";
        tempDiv.style.height = "600px";
        tempDiv.id = id;
        document.body.appendChild(tempDiv);

        try {
          const { svg: rendered } = await mermaid.render(id, code);
          if (!cancelled) setSvg(rendered);
        } finally {
          // Clean up: remove temp container and any leftover mermaid elements
          tempDiv.remove();
          document.getElementById("d" + id)?.remove();
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to render diagram");
      }
    }, 50); // Small delay to ensure DOM is ready
    return () => { cancelled = true; clearTimeout(timer); };
  }, [code, id]);

  if (error) {
    return (
      <div className="my-3 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs font-mono">
        Diagram error: {error}
      </div>
    );
  }

  return (
    <div className={`my-3 rounded-md border border-border overflow-hidden ${expanded ? "fixed inset-4 z-50 bg-background flex flex-col" : ""}`}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/60 border-b border-border">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          📊 Diagram
        </span>
        <div className="flex items-center gap-1">
          <CopyButton text={code} />
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div
        className={`p-4 flex items-center justify-center overflow-auto ${expanded ? "flex-1" : "max-h-96"}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

// ─── JSON Visualizer ──────────────────────────────────────

function JsonTree({ data, depth = 0 }: { data: any; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (data === null) return <span className="text-orange-400">null</span>;
  if (typeof data === "boolean") return <span className="text-yellow-400">{String(data)}</span>;
  if (typeof data === "number") return <span className="text-cyan-400">{data}</span>;
  if (typeof data === "string") return <span className="text-green-400">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
          {collapsed ? "▶" : "▼"} [{data.length}]
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/50 pl-2">
            {data.map((item, i) => (
              <div key={i}><span className="text-muted-foreground text-xs">{i}: </span><JsonTree data={item} depth={depth + 1} /></div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground">
          {collapsed ? "▶" : "▼"} {`{${keys.length}}`}
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-border/50 pl-2">
            {keys.map((key) => (
              <div key={key}><span className="text-primary text-xs">{key}: </span><JsonTree data={data[key]} depth={depth + 1} /></div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

function JsonVisualizer({ code }: { code: string }) {
  const parsed = useMemo(() => {
    try { return { data: JSON.parse(code), error: null }; }
    catch (e: any) { return { data: null, error: e.message }; }
  }, [code]);

  const [showTree, setShowTree] = useState(true);

  if (parsed.error) return null; // Fall through to normal code block

  return (
    <div className="my-3 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/60 border-b border-border">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          🔍 JSON Explorer
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowTree(!showTree)} className="px-2 py-0.5 text-[10px] rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            {showTree ? "Raw" : "Tree"}
          </button>
          <CopyButton text={code} />
        </div>
      </div>
      <div className="p-3 font-mono text-xs max-h-80 overflow-auto bg-secondary/20">
        {showTree ? <JsonTree data={parsed.data} /> : <pre className="whitespace-pre-wrap">{JSON.stringify(parsed.data, null, 2)}</pre>}
      </div>
    </div>
  );
}

// ─── Chart Visualizer (for ```chart blocks) ───────────────

function ChartVisualizer({ code }: { code: string }) {
  const [error, setError] = useState<string>("");

  const chartData = useMemo(() => {
    try {
      const parsed = JSON.parse(code);
      if (!parsed.data || !Array.isArray(parsed.data)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [code]);

  if (!chartData) return null;

  // Render as a simple bar chart using CSS
  const maxVal = Math.max(...chartData.data.map((d: any) => d.value || 0), 1);

  return (
    <div className="my-3 rounded-md border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/60 border-b border-border">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          📈 {chartData.title || "Chart"}
        </span>
        <CopyButton text={code} />
      </div>
      <div className="p-4 space-y-2">
        {chartData.data.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground w-24 truncate text-right">{item.label || item.name}</span>
            <div className="flex-1 h-6 bg-secondary/30 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded transition-all duration-500"
                style={{ width: `${(item.value / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-foreground w-16">{item.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Collapsible Details Block ────────────────────────────

function CollapsibleBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-3 rounded-md border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
      >
        <span className="font-mono text-xs text-foreground">{open ? "▼" : "▶"} {title}</span>
      </button>
      {open && <div className="p-3 text-sm">{children}</div>}
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────

const LIVE_PREVIEW_LANGS = new Set(["html", "css", "javascript", "js"]);

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");

            if (match) {
              const lang = match[1].toLowerCase();

              // Mermaid diagrams
              if (lang === "mermaid") {
                return <MermaidDiagram code={codeString} />;
              }

              // Chart data blocks
              if (lang === "chart") {
                const chart = <ChartVisualizer code={codeString} />;
                if (chart) return chart;
              }

              // JSON explorer
              if (lang === "json") {
                try {
                  JSON.parse(codeString);
                  return <JsonVisualizer code={codeString} />;
                } catch { /* fall through to normal code block */ }
              }

              const lineCount = codeString.split("\n").length;
              const showLivePreview = LIVE_PREVIEW_LANGS.has(lang);

              return (
                <div className="relative group my-3">
                  <div className="rounded-md overflow-hidden border border-border">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/60 border-b border-border">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {lang}
                      </span>
                      <div className="flex items-center gap-1">
                        <CopyButton text={codeString} />
                      </div>
                    </div>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={lang}
                      showLineNumbers={lineCount > 5}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: "12px",
                        background: "hsl(var(--secondary) / 0.3)",
                      }}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                  {showLivePreview && <LivePreview code={codeString} language={lang} />}
                </div>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-sm bg-secondary text-primary font-mono text-xs"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Detect <details> blocks for collapsible sections
          details({ children, ...props }) {
            return <CollapsibleBlock title="Details">{children}</CollapsibleBlock>;
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs font-mono">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-secondary/60">{children}</thead>;
          },
          tr({ children, ...props }) {
            return (
              <tr className="border-b border-border even:bg-secondary/20" {...props}>
                {children}
              </tr>
            );
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="px-3 py-2 text-foreground">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-2 border-primary bg-secondary/30 rounded-r-md px-4 py-3 text-sm text-muted-foreground italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
