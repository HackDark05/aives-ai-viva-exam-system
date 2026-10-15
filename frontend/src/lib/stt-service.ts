"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type UseSTTOptions = {
  lang?: "vi-VN" | "en-US";
  continuous?: boolean;
  onFinalResult?: (transcript: string) => void;
};

// Web Speech API interface definitions
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: { error: string }) => void) | null;
  onresult:
    | ((
        this: SpeechRecognitionInstance,
        ev: { results: { [index: number]: { [index: number]: { transcript: string } }; length: number } }
      ) => void)
    | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function useSTT(options: UseSTTOptions = {}) {
  const { lang = "vi-VN", continuous = true, onFinalResult } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported] = useState(() => getSpeechRecognition() !== null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalResultRef = useRef(onFinalResult);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setError("Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Google Chrome hoặc Microsoft Edge.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
        onFinalResultRef.current?.(fullTranscript);
      };

      recognition.onerror = (event) => {
        console.warn("SpeechRecognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone bị chặn. Vui lòng cho phép quyền truy cập Micro trên trình duyệt.");
        } else if (event.error !== "no-speech") {
          setError(`Lỗi STT: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error("Lỗi khi mở microphone:", err);
      setIsListening(false);
      setError("Không thể khởi động micro.");
    }
  }, [lang, continuous]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  };
}
