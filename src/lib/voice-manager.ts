/**
 * VoiceManager — modular TTS system using Web Speech API (free, no API key needed).
 * Supports voice selection, speech rate, language, and audio caching.
 * Gracefully degrades if speech synthesis is unavailable.
 */

export interface VoiceConfig {
  voiceName?: string;
  rate?: number;       // 0.1 – 10, default 1
  pitch?: number;      // 0 – 2, default 1
  volume?: number;     // 0 – 1, default 1
  lang?: string;       // BCP-47, e.g. "en-US"
}

const DEFAULT_CONFIG: Required<VoiceConfig> = {
  voiceName: "",
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: "en-US",
};

class VoiceManager {
  private config: Required<VoiceConfig>;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private ready = false;

  constructor(config?: VoiceConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this.isSupported()) {
      console.warn("[VoiceManager] Web Speech API not available in this browser.");
      return;
    }

    // Voices load asynchronously in some browsers
    const loadVoices = () => {
      this.voices = speechSynthesis.getVoices();
      if (this.voices.length > 0) this.ready = true;
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  isReady(): boolean {
    return this.ready;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getVoicesForLang(lang?: string): SpeechSynthesisVoice[] {
    const target = lang ?? this.config.lang;
    return this.voices.filter((v) => v.lang.startsWith(target.split("-")[0]));
  }

  updateConfig(config: Partial<VoiceConfig>) {
    Object.assign(this.config, config);
  }

  getConfig(): Required<VoiceConfig> {
    return { ...this.config };
  }

  /** Speak text. Returns a promise that resolves when done. */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      this.stop(); // cancel any in-progress speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.lang;

      // Select voice
      if (this.config.voiceName) {
        const match = this.voices.find((v) => v.name === this.config.voiceName);
        if (match) utterance.voice = match;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      utterance.onerror = (e) => {
        this.currentUtterance = null;
        reject(e);
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (this.isSupported()) {
      speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isSpeaking(): boolean {
    return this.isSupported() && speechSynthesis.speaking;
  }
}

// Singleton instance
export const voiceManager = new VoiceManager();
export default VoiceManager;
