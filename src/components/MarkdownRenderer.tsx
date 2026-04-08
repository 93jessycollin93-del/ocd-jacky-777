import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            if (match) {
              const lineCount = codeString.split("\n").length;
              return (
                <div className="relative group my-3 rounded-md overflow-hidden border border-border">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/60 border-b border-border">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {match[1]}
                    </span>
                  </div>
                  <CopyButton text={codeString} />
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
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
