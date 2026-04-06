import { useState, useCallback, useRef } from 'react';
import { Upload, FileWarning } from 'lucide-react';
import { ingestionService } from '../services';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
}

export function UploadDropzone({ onFilesSelected, accept, maxFiles = 10 }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const fileArray = Array.from(files).slice(0, maxFiles);
    const invalidFiles: string[] = [];

    for (const f of fileArray) {
      const result = ingestionService.validateFile(f);
      if (!result.valid) invalidFiles.push(`${f.name}: ${result.reason}`);
    }

    if (invalidFiles.length > 0) {
      setError(invalidFiles[0]);
      return;
    }

    onFilesSelected(fileArray);
  }, [onFilesSelected, maxFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`relative w-full border-2 border-dashed rounded-sm p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 min-h-[160px] ${
        dragOver
          ? 'border-primary bg-primary/5'
          : error
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-border hover:border-primary/30 hover:bg-secondary/30'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? (
        <>
          <FileWarning className="w-8 h-8 text-destructive/60" />
          <p className="text-xs text-destructive text-center font-mono">{error}</p>
          <p className="text-[10px] text-muted-foreground">Tap to try again</p>
        </>
      ) : (
        <>
          <Upload className={`w-8 h-8 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="text-center">
            <p className="text-sm text-foreground font-medium">
              {dragOver ? 'Drop files here' : 'Upload files'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Drag & drop or tap to browse · MP4, MOV, MP3, WAV, M4A
            </p>
          </div>
        </>
      )}
    </div>
  );
}
