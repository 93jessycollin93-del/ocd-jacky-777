import { useState, useRef, useCallback } from "react";
import { Paperclip, Camera, Video, X, Image, FileText, Film } from "lucide-react";
import { isImageType, isVideoType, formatFileSize } from "@/lib/jackie-attachments";
import { toast } from "sonner";

export interface PendingFile {
  file: File;
  preview?: string;
  id: string;
}

interface ChatMediaBarProps {
  pendingFiles: PendingFile[];
  onFilesAdded: (files: PendingFile[]) => void;
  onFileRemoved: (id: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const ChatMediaBar = ({
  pendingFiles,
  onFilesAdded,
  onFileRemoved,
  disabled,
}: ChatMediaBarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const valid: PendingFile[] = [];

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds 20MB limit.`);
          continue;
        }
        const pf: PendingFile = {
          file,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
        if (isImageType(file.type) || isVideoType(file.type)) {
          pf.preview = URL.createObjectURL(file);
        }
        valid.push(pf);
      }

      if (valid.length > 0) onFilesAdded(valid);
    },
    [onFilesAdded]
  );

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error("Camera access denied or unavailable.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        processFiles([file]);
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], `video_${Date.now()}.webm`, { type: "video/webm" });
        processFiles([file]);
        closeCamera();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Camera/microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setShowCamera(false);
    setIsRecording(false);
  };

  return (
    <>
      {/* Camera/Video modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            className="max-w-full max-h-[60vh] rounded-sm"
            autoPlay
            playsInline
            muted
          />
          <div className="flex items-center gap-4 mt-4">
            {!isRecording && (
              <button
                onClick={capturePhoto}
                className="px-4 py-2 rounded-sm bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider"
              >
                Capture Photo
              </button>
            )}
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="px-4 py-2 rounded-sm bg-destructive text-destructive-foreground font-mono text-xs uppercase tracking-wider animate-pulse"
              >
                ■ Stop Recording
              </button>
            ) : null}
            <button
              onClick={closeCamera}
              className="px-4 py-2 rounded-sm bg-secondary text-secondary-foreground font-mono text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>
        <button
          onClick={openCamera}
          disabled={disabled}
          className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          title="Take photo"
        >
          <Camera size={16} />
        </button>
        <button
          onClick={startRecording}
          disabled={disabled}
          className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
          title="Record video"
        >
          <Video size={16} />
        </button>
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-2">
          {pendingFiles.map((pf) => (
            <div
              key={pf.id}
              className="relative group bg-secondary rounded-sm overflow-hidden border border-border"
            >
              {pf.preview && isImageType(pf.file.type) ? (
                <img src={pf.preview} alt={pf.file.name} className="w-16 h-16 object-cover" />
              ) : pf.preview && isVideoType(pf.file.type) ? (
                <div className="w-16 h-16 flex items-center justify-center bg-secondary">
                  <Film size={20} className="text-muted-foreground" />
                </div>
              ) : (
                <div className="w-16 h-16 flex flex-col items-center justify-center p-1">
                  <FileText size={16} className="text-muted-foreground" />
                  <span className="font-mono text-[8px] text-muted-foreground truncate max-w-full mt-0.5">
                    {pf.file.name.split(".").pop()}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  if (pf.preview) URL.revokeObjectURL(pf.preview);
                  onFileRemoved(pf.id);
                }}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1">
                <span className="font-mono text-[8px] text-white">{formatFileSize(pf.file.size)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
