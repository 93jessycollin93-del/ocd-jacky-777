import Editor from '@monaco-editor/react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-tomorrow_night';

export default function EditorSwitcher({ editor, code, onChange }) {
  if (editor === 'monaco') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <Editor
          height="320px"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => onChange(value || '')}
          options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
        />
      </div>
    );
  }

  if (editor === 'codemirror') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-background [&_.cm-editor]:min-h-[320px] [&_.cm-editor]:text-xs [&_.cm-gutters]:bg-card [&_.cm-gutters]:border-r-border">
        <CodeMirror
          value={code}
          height="320px"
          extensions={[javascript({ jsx: true })]}
          theme="dark"
          onChange={(value) => onChange(value)}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <AceEditor
        mode="javascript"
        theme="tomorrow_night"
        name="jackie-ace-editor"
        width="100%"
        height="320px"
        value={code}
        onChange={onChange}
        fontSize={12}
        setOptions={{ useWorker: false, showPrintMargin: false }}
      />
    </div>
  );
}