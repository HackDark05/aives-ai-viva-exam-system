"use client";

export const ZEROTTS_DEFAULT_URL =
  process.env.NEXT_PUBLIC_ZEROTTS_URL || "http://localhost:8000";

export const ZEROTTS_VOICES = [
  { id: "maichi", label: "Mai Chi (Nữ - Truyền cảm, khuyến nghị)", gender: "female" },
  { id: "giahuy", label: "Gia Huy (Nam - Trầm ấm)", gender: "male" },
  { id: "baotrang", label: "Bảo Trang (Nữ)", gender: "female" },
  { id: "kimoanh", label: "Kim Oanh (Nữ)", gender: "female" },
  { id: "hamy", label: "Hà My (Nữ)", gender: "female" },
  { id: "huuduc", label: "Hữu Đức (Nam)", gender: "male" },
  { id: "quangminh", label: "Quang Minh (Nam)", gender: "male" },
  { id: "tiendat", label: "Tiến Đạt (Nam)", gender: "male" },
] as const;

export type SpeechLang = "vi-VN" | "en-US";

const VIETNAMESE_CHARS =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Detect whether exam text should be spoken in Vietnamese or English. */
export function detectSpeechLang(text: string): SpeechLang {
  const sample = text.trim();
  if (!sample) return "vi-VN";

  if (VIETNAMESE_CHARS.test(sample)) {
    return "vi-VN";
  }

  const letters = sample.replace(/[^A-Za-zÀ-ỹ]/g, "");
  if (letters.length === 0) return "vi-VN";

  // Latin-only prompts without Vietnamese diacritics → English exam voice
  const asciiLetters = sample.replace(/[^A-Za-z]/g, "").length;
  if (asciiLetters / letters.length >= 0.85) {
    return "en-US";
  }

  return "vi-VN";
}

export function defaultVoiceForLang(lang: SpeechLang, preferredViVoice = "maichi"): string {
  return lang === "en-US" ? "google-en" : preferredViVoice;
}

let currentAudio: HTMLAudioElement | null = null;
let isZeroTTSAvailable: boolean | null = null;
let lastCheckTime = 0;

export async function checkZeroTTSStatus(baseUrl = ZEROTTS_DEFAULT_URL): Promise<boolean> {
  const now = Date.now();
  if (isZeroTTSAvailable !== null && now - lastCheckTime < 15000) {
    return isZeroTTSAvailable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
      method: "GET",
    });
    clearTimeout(timeout);
    isZeroTTSAvailable = res.ok;
  } catch {
    isZeroTTSAvailable = false;
  }
  lastCheckTime = now;
  return isZeroTTSAvailable;
}

export function stopTTS(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export type PlayTTSOptions = {
  voice?: string;
  lang?: "vi-VN" | "en-US";
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
  onEngineUsed?: (engine: "ZeroTTS" | "Browser-Google") => void;
};

/**
 * Phát âm thanh văn bản theo ngôn ngữ đề:
 * - Tiếng Việt: ưu tiên ZeroTTS (local), fallback Google vi-VN
 * - Tiếng Anh: dùng Google/Browser en-US (ZeroTTS chuyên tiếng Việt)
 */
export async function playTTS(
  text: string,
  options: PlayTTSOptions = {}
): Promise<() => void> {
  const {
    voice = "maichi",
    lang: langOption,
    onStart,
    onEnd,
    onError,
    onEngineUsed,
  } = options;

  stopTTS();

  const cleanText = text.trim();
  if (!cleanText) return () => {};

  const lang = langOption ?? detectSpeechLang(cleanText);

  // English exam questions always use browser Google English voice
  if (lang === "en-US") {
    onEngineUsed?.("Browser-Google");
    playBrowserTTS(cleanText, "en-US", onStart, onEnd, onError);
    return () => stopTTS();
  }

  const zeroOnline = await checkZeroTTSStatus();
  const zeroVoice = voice === "google-en" ? "maichi" : voice;

  if (zeroOnline) {
    try {
      const audioUrl = `${ZEROTTS_DEFAULT_URL}/speak?voice=${encodeURIComponent(
        zeroVoice
      )}&text=${encodeURIComponent(cleanText)}`;

      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onplay = () => {
        onStart?.();
        onEngineUsed?.("ZeroTTS");
      };

      audio.onended = () => {
        currentAudio = null;
        onEnd?.();
      };

      audio.onerror = () => {
        currentAudio = null;
        playBrowserTTS(cleanText, "vi-VN", onStart, onEnd, onError);
        onEngineUsed?.("Browser-Google");
      };

      await audio.play();
      return () => stopTTS();
    } catch {
      // Fallback
    }
  }

  onEngineUsed?.("Browser-Google");
  playBrowserTTS(cleanText, "vi-VN", onStart, onEnd, onError);
  return () => stopTTS();
}

function playBrowserTTS(
  text: string,
  lang: "vi-VN" | "en-US",
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err?: unknown) => void
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.(new Error("Web Speech Synthesis không được hỗ trợ trên trình duyệt này"));
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(
      (v) =>
        v.name.toLowerCase().includes("google") &&
        v.lang.toLowerCase().startsWith(lang.slice(0, 2))
    );
    const langVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(lang.slice(0, 2))
    );
    if (googleVoice) {
      utterance.voice = googleVoice;
    } else if (langVoice) {
      utterance.voice = langVoice;
    }
  }

  if (window.speechSynthesis.getVoices().length > 0) {
    pickVoice();
  } else {
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = (e) => onError?.(e);

  window.speechSynthesis.speak(utterance);
}
