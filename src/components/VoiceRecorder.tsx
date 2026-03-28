import { useState, useRef, useCallback, useEffect } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAndCleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    timerRef.current = null;
    setIsRecording(false);
    setDuration(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 0) {
          const ext = mimeType.includes("webm") ? "webm" : "ogg";
          const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
          onRecordingComplete(file);
        }
        stopAndCleanup();
      };

      recorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast.error("Microphone access denied or unavailable.");
    }
  }, [onRecordingComplete, stopAndCleanup]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopAndCleanup(), [stopAndCleanup]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (isRecording) {
    return (
      <button
        onClick={stopRecording}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-sm bg-destructive text-destructive-foreground font-mono text-[10px] uppercase tracking-wider animate-pulse transition-colors"
        title="Tap to stop recording"
      >
        <Mic size={14} />
        <span>{formatTime(duration)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
      title="Record voice message"
    >
      <Mic size={16} />
    </button>
  );
};
