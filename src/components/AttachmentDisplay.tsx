import { Download, FileText, Film, Image } from "lucide-react";
import { type Attachment, getAttachmentUrl, isImageType, isVideoType, formatFileSize } from "@/lib/jackie-attachments";

interface AttachmentDisplayProps {
  attachments: Attachment[];
}

export const AttachmentDisplay = ({ attachments }: AttachmentDisplayProps) => {
  if (attachments.length === 0) return null;

  const handleDownload = (att: Attachment) => {
    const url = getAttachmentUrl(att.storage_path);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => {
        const url = getAttachmentUrl(att.storage_path);

        if (isImageType(att.file_type)) {
          return (
            <div key={att.id} className="relative group rounded-sm overflow-hidden border border-border">
              <img
                src={url}
                alt={att.file_name}
                className="max-w-[200px] max-h-[200px] object-cover cursor-pointer"
                onClick={() => window.open(url, "_blank")}
              />
              <button
                onClick={() => handleDownload(att)}
                className="absolute top-1 right-1 p-1 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Download"
              >
                <Download size={12} />
              </button>
            </div>
          );
        }

        if (isVideoType(att.file_type)) {
          return (
            <div key={att.id} className="relative group rounded-sm overflow-hidden border border-border">
              <video
                src={url}
                className="max-w-[250px] max-h-[200px] rounded-sm"
                controls
                preload="metadata"
              />
              <button
                onClick={() => handleDownload(att)}
                className="absolute top-1 right-1 p-1 rounded-sm bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Download"
              >
                <Download size={12} />
              </button>
            </div>
          );
        }

        return (
          <button
            key={att.id}
            onClick={() => handleDownload(att)}
            className="flex items-center gap-2 px-3 py-2 rounded-sm bg-secondary border border-border hover:bg-secondary/80 transition-colors"
          >
            <FileText size={14} className="text-muted-foreground" />
            <div className="text-left">
              <div className="font-mono text-xs text-foreground truncate max-w-[150px]">{att.file_name}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{formatFileSize(att.file_size)}</div>
            </div>
            <Download size={12} className="text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
};
