import { useState, useRef, useCallback, useEffect } from 'react';

// Extend Window for vendor-prefixed SpeechRecognition
// Only declare missing Web Speech API types that are not present in the default DOM lib.
declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives?: number;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
  }

  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface Subtitle {
  id: string;
  text: string;
  translatedText?: string;
  speaker: 'me' | 'remote';
  timestamp: number;
  language?: string;
}

interface UseCallTranslatorProps {
  enabled: boolean;
  targetLanguage: string;
  sourceLanguage?: string;
  onSubtitle?: (subtitle: Subtitle) => void;
  localStream?: MediaStream | null; // Stream from active call
}

// Supported languages with their codes
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
];

// Translation via our server endpoint (more reliable than MyMemory direct)
const translateText = async (text: string, targetLang: string, sourceLang?: string, retryCount = 0): Promise<string> => {
  const trimmed = (text || '').trim();
  if (!trimmed) return text;

  const effectiveSource = sourceLang === 'auto' ? 'auto' : sourceLang;
  if (effectiveSource && effectiveSource !== 'auto' && effectiveSource === targetLang) return text;

  const MAX_RETRIES = 2;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        targetLanguage: targetLang,
        sourceLanguage: effectiveSource || 'auto',
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json().catch(() => ({} as any));
    const translated = (data?.text || '').trim();
    return translated || text;
  } catch (error) {
    if (retryCount < MAX_RETRIES && (error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError'))) {
      await new Promise(r => setTimeout(r, 600 * (retryCount + 1)));
      return translateText(text, targetLang, sourceLang, retryCount + 1);
    }
    console.warn('[Translator] Server translate failed:', error);
    return text;
  }
};

export const useCallTranslator = ({ enabled, targetLanguage, sourceLanguage, onSubtitle, localStream }: UseCallTranslatorProps) => {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimTranscriptRef = useRef('');
  const lastFinalTranscriptRef = useRef('');
  const subtitleIdRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const destinationStreamRef = useRef<MediaStream | null>(null);
  const audioCaptureErrorCount = useRef(0);

  // Cleanup function for audio context
  const cleanupAudioContext = useCallback(() => {
    if (mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect();
      } catch (e) { /* ignore */ }
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) { /* ignore */ }
      audioContextRef.current = null;
    }
    destinationStreamRef.current = null;
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Web Speech API generally requires secure context (HTTPS) except localhost
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('Voice subtitles need HTTPS (or run on localhost)');
      return;
    }

    // SpeechRecognition listens to the browser microphone and does not accept a custom MediaStream.
    // During an active call, the browser should already have microphone access, so we only ensure
    // the page can use audio input before starting recognition.
    const requestMicrophoneAccess = async () => {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('[Translator] Microphone permission available');
          stream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('[Translator] Microphone access request failed:', e);
          // Continue anyway; speech recognition may still prompt permission internally.
        }
      }
    };

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Increase max alternatives for better accuracy
    if ('maxAlternatives' in recognition) {
      (recognition as any).maxAlternatives = 3;
    }
    // Map language codes to valid BCP 47 format for SpeechRecognition
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-PT',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'tr': 'tr-TR',
      'vi': 'vi-VN',
      'th': 'th-TH',
      'id': 'id-ID',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'mr': 'mr-IN',
      'bn': 'bn-BD',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN',
      'ur': 'ur-PK',
      'auto': 'auto', // Mark as auto to handle specially
    };
    
    // Handle auto detection - use browser language or target language as fallback
    let selectedLang = langMap[sourceLanguage || 'auto'] || 'en-US';
    if (sourceLanguage === 'auto') {
      // Try to use browser language, or fall back to target language for better recognition
      const browserLang = navigator.language || 'en-US';
      const browserLangCode = browserLang.split('-')[0];
      // If browser lang is in our map, use it; otherwise use target language if valid
      if (langMap[browserLangCode] && browserLangCode !== 'auto') {
        selectedLang = langMap[browserLangCode];
      } else if (targetLanguage && langMap[targetLanguage]) {
        selectedLang = langMap[targetLanguage];
      } else {
        selectedLang = 'en-US';
      }
      console.log(`[Translator] Auto mode: Using browser lang ${browserLang} or target ${targetLanguage} -> ${selectedLang}`);
    }
    recognition.lang = selectedLang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      audioCaptureErrorCount.current = 0; // Reset error count on successful start
      console.log(`[Translator] Speech recognition started with lang: ${recognition.lang}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('[Translator] Speech recognition ended');
      // Restart if still enabled and no critical error
      if (enabled && recognitionRef.current === recognition) {
        // Longer delay during calls to avoid rapid restart loops
        const restartDelay = localStream ? 800 : 300;
        setTimeout(() => {
          try {
            // Only restart if we're still the active recognition instance
            if (recognitionRef.current === recognition) {
              recognition.start();
              console.log('[Translator] Recognition restarted');
            }
          } catch (e) {
            console.log('[Translator] Recognition restart failed:', e);
            // If restart fails during call, try again after longer delay
            if (localStream) {
              setTimeout(() => {
                try {
                  if (recognitionRef.current === recognition && enabled) {
                    recognition.start();
                    console.log('[Translator] Recognition restarted after delay');
                  }
                } catch (e2) {
                  console.log('[Translator] Final restart attempt failed:', e2);
                }
              }, 1500);
            }
          }
        }, restartDelay);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Translator] Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permission.');
      } else if (event.error === 'no-speech') {
        // Don't show error for no-speech, just restart silently
        console.log('[Translator] No speech detected, will restart');
      } else if (event.error === 'network') {
        // Network error - try to continue, don't block user
        console.log('[Translator] Network error - will retry');
        setError('Network slow. Retrying speech recognition...');
        // Auto clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      } else if (event.error === 'aborted') {
        // Normal when stopping, no action needed
        console.log('[Translator] Recognition aborted');
      } else if (event.error === 'audio-capture') {
        // Audio capture error - mic might be in use by call
        audioCaptureErrorCount.current++;
        console.log(`[Translator] Audio capture error #${audioCaptureErrorCount.current} - mic in use by call`);
        
        // After 3 audio-capture errors during a call, switch to manual mode
        if (localStream && audioCaptureErrorCount.current >= 3) {
          console.log('[Translator] Switching to manual input mode due to mic conflict');
          setIsManualMode(true);
          setIsListening(true); // Still show listening state
          setError('Mic busy. Type or click 🎤 to speak.');
          setTimeout(() => setError(null), 5000);
          
          // Stop trying to restart - user will use manual input
          try {
            recognition.stop();
            recognitionRef.current = null;
          } catch (e) {}
        } else {
          setError('Microphone busy. Retrying...');
          setTimeout(() => setError(null), 3000);
        }
      } else {
        // Don't show error for other issues, just log
        console.log('[Translator] Non-critical error:', event.error);
      }
    };

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      interimTranscriptRef.current = interimTranscript;
      setInterimTranscript(interimTranscript);

      if (finalTranscript && finalTranscript !== lastFinalTranscriptRef.current) {
        lastFinalTranscriptRef.current = finalTranscript;
        
        // Add interim subtitle immediately with original text
        const tempSubtitle: Subtitle = {
          id: `sub_${Date.now()}_${subtitleIdRef.current++}`,
          text: finalTranscript,
          translatedText: undefined, // Will update after translation
          speaker: 'me',
          timestamp: Date.now(),
          language: targetLanguage,
        };

        setSubtitles(prev => [...prev.slice(-4), tempSubtitle]);
        
        // Translate the text and update subtitle
        const translatedText = await translateText(finalTranscript, targetLanguage, sourceLanguage);
        
        const finalSubtitle: Subtitle = {
          ...tempSubtitle,
          translatedText: translatedText || finalTranscript,
        };

        setSubtitles(prev => {
          const filtered = prev.filter(s => s.id !== tempSubtitle.id);
          return [...filtered.slice(-4), finalSubtitle];
        });
        
        onSubtitle?.(finalSubtitle);
      }
    };

    recognitionRef.current = recognition;

    const startRecognition = async () => {
      await requestMicrophoneAccess();
      try {
        recognition.start();
      } catch (e) {
        console.error('[Translator] Failed to start recognition:', e);
        setError('Unable to start speech recognition. Please allow microphone access.');
      }
    };

    startRecognition();

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        console.log('[Translator] Recognition stop failed');
      }
      cleanupAudioContext();
    };
  }, [enabled, targetLanguage, sourceLanguage, onSubtitle, localStream, cleanupAudioContext]);

  const clearSubtitles = useCallback(() => {
    setSubtitles([]);
  }, []);

  // Manual subtitle input for when mic is busy during calls
  const addManualSubtitle = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const translatedText = await translateText(text, targetLanguage, sourceLanguage);
    
    const subtitle: Subtitle = {
      id: `sub_manual_${Date.now()}_${subtitleIdRef.current++}`,
      text,
      translatedText: translatedText || text,
      speaker: 'me',
      timestamp: Date.now(),
      language: targetLanguage,
    };

    setSubtitles(prev => [...prev.slice(-4), subtitle]);
    onSubtitle?.(subtitle);
  }, [targetLanguage, sourceLanguage, onSubtitle]);

  const addRemoteSubtitle = useCallback(async (text: string, speakerId: string) => {
    // Check if this exact text was just added (prevent duplicates)
    const recentSubtitle = subtitles[subtitles.length - 1];
    if (recentSubtitle && recentSubtitle.text === text && recentSubtitle.speaker === 'remote') {
      return;
    }
    
    const translatedText = await translateText(text, targetLanguage);
    
    const newSubtitle: Subtitle = {
      id: `sub_remote_${Date.now()}_${subtitleIdRef.current++}`,
      text,
      translatedText: translatedText || text,
      speaker: 'remote',
      timestamp: Date.now(),
      language: targetLanguage,
    };

    setSubtitles(prev => [...prev.slice(-4), newSubtitle]);
    onSubtitle?.(newSubtitle);
  }, [targetLanguage, onSubtitle, subtitles]);

  return {
    subtitles,
    isListening,
    isManualMode,
    error,
    clearSubtitles,
    addRemoteSubtitle,
    addManualSubtitle,
    interimTranscript,
    isSupported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
};
