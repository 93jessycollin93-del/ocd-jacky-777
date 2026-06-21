import { useRef, useState } from 'react';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/eru/api/base44Client';

/**
 * ScanCapture — image upload entry point. Uses the existing UploadFile
 * integration. Records image metadata so the scanner can audit what was
 * sent. Does NOT identify or price — the parent page kicks off those steps.
 */
export default function ScanCapture({ onUploaded, busy }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const meta = {
        size_bytes: file.size,
        mime_type: file.type || '',
      };
      // Best-effort dimensions
      try {
        const bitmap = await createImageBitmap(file);
        meta.width = bitmap.width;
        meta.height = bitmap.height;
        bitmap.close?.();
      } catch { /* not all browsers / files */ }

      const res = await base44.integrations.Core.UploadFile({ file });
      onUploaded?.({ image_url: res.file_url, image_meta: meta });
    } catch (e) {
      setError(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-foreground">Scan a Pokémon card</p>
        <p className="text-[11px] text-muted-foreground">
          Upload a clear photo or scan. Identification and pricing are tracked separately and only show real, verified data.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload image
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50"
        >
          <Camera className="h-4 w-4" /> Use camera
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </section>
  );
}