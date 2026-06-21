import { useRef, useState } from 'react';
import { Send, Zap, Mic, MicOff, ImagePlus, Video, FileCode, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';
import VoiceSelector from './VoiceSelector.jsx';

export default function InputBar({ input, setInput, onSend, loading, mode, onToggleCommands, showCommands, voice, setVoice, onFilesReady }) {
  const [listening, setListening] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const recognitionRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  const placeholders = {
    chat: 'Ask Jackie anything...',
    code: 'Describe what to build or paste code...',
    visual: 'Describe a layout, flow or system...',
    builder: 'What system should we build?',
    conversion: 'Paste copy to rewrite for English, Ukrainian, and Simplified Chinese...',
  };

  // Speech to text
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in this browser'); return; }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (e) => { setInput(prev => prev + ' ' + e.results[0][0].transcript); };
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  const uploadFile = async (file) => {
    const tempId = Date.now() + Math.random();
    setUploadingFiles(prev => [...prev, { id: tempId, name: file.name, uploading: true }]);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadingFiles(prev => prev.filter(f => f.id !== tempId));
    const attachment = { name: file.name, url: file_url, type: file.type };
    setAttachments(prev => {
      const next = [...prev, attachment];
      onFilesReady(next);
      return next;
    });
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(uploadFile);
  };

  const removeAttachment = (url) => {
    const updated = attachments.filter(a => a.url !== url);
    setAttachments(updated);
    onFilesReady(updated);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSend = () => {
    if (uploadingFiles.length > 0) return;
    onSend(attachments);
    setAttachments([]);
    onFilesReady([]);
  };

  return (
    <div
      className={`jackie-input-bar fixed left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-[90] transition-all ${dragOver ? 'border-primary/50 bg-primary/5' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <div className="max-w-md mx-auto px-4 pt-2 pb-2">
        <div className="flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <VoiceSelector voice={voice} setVoice={setVoice} />
            {collapsed && (
              <p className="text-[11px] text-muted-foreground truncate">Chat collapsed</p>
            )}
          </div>
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {collapsed ? 'Open chat' : 'Collapse'}
          </button>
        </div>

        {!collapsed && (
          <>
            <div className="mb-2 space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setInput('Rewrite and optimize this for conversion in English, Ukrainian, and Simplified Chinese:\n')}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl border bg-primary/10 text-primary border-primary/30 text-xs font-medium"
                >
                  Multilingual CTA
                </button>
                <button
                  onClick={() => setInput('Recommend educational resources to help me understand this investment topic better:\n')}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl border bg-secondary text-muted-foreground border-border text-xs font-medium"
                >
                  Learn
                </button>
                <button onClick={onToggleCommands}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${showCommands ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-muted-foreground border-border'}`}>
                  <Zap className="w-3 h-3" /> Commands
                </button>
              </div>
            </div>

            {(attachments.length > 0 || uploadingFiles.length > 0) && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {uploadingFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="max-w-[100px] truncate">{f.name}</span>
                  </div>
                ))}
                {attachments.map(a => (
                  <div key={a.url} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                    {a.type?.startsWith('video') ? <Video className="w-3 h-3" /> : a.type?.startsWith('image') ? <ImagePlus className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
                    <span className="max-w-[100px] truncate">{a.name}</span>
                    <button onClick={() => removeAttachment(a.url)}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {dragOver && (
              <div className="border-2 border-dashed border-primary/50 rounded-xl p-4 text-center text-xs text-primary mb-2">
                Drop files here
              </div>
            )}

            <div className="flex items-end gap-2 min-w-0">
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => imageRef.current?.click()} className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-primary transition-colors">
                  <ImagePlus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => videoRef.current?.click()} className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-primary transition-colors">
                  <Video className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-primary transition-colors">
                  <FileCode className="w-3.5 h-3.5" />
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={dragOver ? 'Drop files here...' : placeholders[mode]}
                rows={2}
                style={{ fontSize: '16px' }}
                className="min-w-0 flex-1 bg-secondary border border-border rounded-2xl px-4 py-2.5 outline-none text-foreground placeholder:text-muted-foreground resize-none max-h-28"
              />

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={toggleMic}
                  className={`p-2 rounded-xl border transition-all ${listening ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' : 'bg-secondary border-border text-muted-foreground hover:text-primary'}`}>
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button onClick={handleSend} disabled={(!input?.trim() && attachments.length === 0) || loading || uploadingFiles.length > 0}
                  className="bg-primary text-primary-foreground rounded-xl p-2 disabled:opacity-40 transition-opacity">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input ref={imageRef} type="file" accept="image/*" className="hidden" capture="environment" onChange={e => handleFiles(e.target.files)} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" capture="environment" onChange={e => handleFiles(e.target.files)} />
      <input ref={fileRef} type="file" accept=".js,.ts,.jsx,.tsx,.py,.json,.md,.txt,.html,.css,.zip" className="hidden" onChange={e => handleFiles(e.target.files)} multiple />
    </div>
  );
}