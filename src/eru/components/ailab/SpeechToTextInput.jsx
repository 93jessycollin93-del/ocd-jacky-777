import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function SpeechToTextInput({ value, onChange, placeholder, multiline = false, minHeightClass = 'min-h-[90px]' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const baseValueRef = useRef('');

  useEffect(() => {
    const Recognition = getSpeechRecognition();
    setSupported(!!Recognition);
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleToggleListening = () => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    baseValueRef.current = value || '';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      const nextValue = [baseValueRef.current.trim(), transcript].filter(Boolean).join(baseValueRef.current.trim() ? ' ' : '');
      onChange(nextValue);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const InputTag = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-2">
      <div className="relative">
        <InputTag
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none ${multiline ? `resize-none pr-12 ${minHeightClass}` : 'pr-12'}`}
        />
        <button
          type="button"
          onClick={handleToggleListening}
          disabled={!supported}
          className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${listening ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-secondary text-muted-foreground'} disabled:opacity-40`}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          title={supported ? (listening ? 'Stop voice input' : 'Start voice input') : 'Voice input not supported in this browser'}
        >
          {listening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : supported ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {supported ? (listening ? 'Listening… speak naturally to fill the field in real time.' : 'Tap the mic to dictate with your voice.') : 'Voice input is not available in this browser.'}
      </p>
    </div>
  );
}