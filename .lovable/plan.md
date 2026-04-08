

# Enhanced Jackie Output Visualization + FORGE Link + Testing

## Summary

Three things to build:

1. **Rich markdown/code output rendering** — upgrade Jackie's message display from basic `ReactMarkdown` to a proper REPL-style output with syntax-highlighted code blocks, copy buttons, collapsible sections, and table rendering.

2. **FORGE link in sidebar** — add a link to `https://eru-1.base44.app` in the sidebar navigation.

3. **Testing** — demo login, tag deletion, and FORGE link verification.

---

## Step 1: Enhanced Output Visualization

Currently, Jackie renders responses via `<ReactMarkdown>{message.content}</ReactMarkdown>` with basic CSS prose styling (lines 420-422). This needs upgrading to a proper REPL-quality output.

**Changes:**
- Install `react-syntax-highlighter` for code block highlighting
- Create a `MarkdownRenderer` component that provides custom renderers to `ReactMarkdown`:
  - **Code blocks**: syntax-highlighted with language label, copy-to-clipboard button, line numbers for blocks > 5 lines
  - **Inline code**: styled pill with monospace font
  - **Tables**: styled with borders and alternating row colors
  - **Blockquotes**: styled as callout panels
  - **Lists**: properly spaced with custom markers
- Replace the raw `<ReactMarkdown>` call in `JackieMessage` with the new component

**New file:** `src/components/MarkdownRenderer.tsx`

**Modified file:** `src/pages/Index.tsx` — swap `ReactMarkdown` usage in `JackieMessage`

## Step 2: FORGE Link in Sidebar

Add a link below the "Game Design Hub" link in the sidebar (around line 332):
```
<a href="https://eru-1.base44.app" target="_blank" rel="noopener noreferrer">
  🔥 FORGE
</a>
```
Same styling as the Game Design Hub link.

**Modified file:** `src/pages/Index.tsx` — sidebar footer section

## Step 3: Testing (manual)

After implementation, the user should test:
- Demo login flow
- Tag creation, assignment, filtering, and deletion
- FORGE link opens correctly
- Code blocks in Jackie responses render with syntax highlighting and copy button

---

## Technical Details

| Item | File | Change |
|------|------|--------|
| MarkdownRenderer component | `src/components/MarkdownRenderer.tsx` | New file — custom ReactMarkdown with syntax highlighting, copy buttons, table styling |
| JackieMessage update | `src/pages/Index.tsx` (line ~420) | Replace `<ReactMarkdown>` with `<MarkdownRenderer>` |
| FORGE sidebar link | `src/pages/Index.tsx` (line ~333) | Add external link |
| Package | `package.json` | Add `react-syntax-highlighter` + types |

