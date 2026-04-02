import { useState, useEffect } from "react";
import { Download, FileText, Film, Image } from "lucide-react";
import { type Attachment, getAttachmentUrl, isImageType, isVideoType, formatFileSize } from "@/lib/jackie-attachments";

interface AttachmentDisplayProps {
  attachments: Attachment[];
}

function AttachmentItem({ att }: { att: Attachment }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    getAttachmentUrl(att.storage_path).then(setUrl);
  }, [att.storage_path]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!url) return null;

  if (isImageType(att.file_type)) {
    return (
      <div className="relative group rounded-sm overflow-hidden border border-border">
        <img
          src={url}
          alt={att.file_name}
          className="max-w-[200px] max-h-[200px] object-cover cursor-pointer"
          onClick={() => window.open(url, "_blank")}
        />
        <button
          onClick={handleDownload}
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
      <div className="relative group rounded-sm overflow-hidden border border-border">
        <video
          src={url}
          className="max-w-[250px] max-h-[200px] rounded-sm"
          controls
          preload="metadata"
        />
        <button
          onClick={handleDownload}
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
      onClick={handleDownload}
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
}

export const AttachmentDisplay = ({ attachments }: AttachmentDisplayProps) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => (
        <AttachmentItem key={att.id} att={att} />
      ))}
    </div>
  );
};
