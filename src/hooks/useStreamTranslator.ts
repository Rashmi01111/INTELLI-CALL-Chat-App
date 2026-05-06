import { useState, useRef, useCallback, useEffect } from 'react';

export interface Subtitle {
  id: string;
  text: string;
  translatedText?: string;
  speaker: 'me' | 'remote';
  timestamp: number;
  language?: string;
}

interface UseStreamTranslatorProps {
  enabled: boolean;
  targetLanguage: string;
  sourceLanguage?: string;
  onSubtitle?: (subtitle: Subtitle) => void;
  localStream?: MediaStream | null;
}

// Supported languages
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
    return text;
  }
};

/**
 * Hook for translating audio stream during calls
 * Uses a hybrid approach: tries Web Speech API first, falls back to audio processing
 */
export const useStreamTranslator = ({ enabled, targetLanguage, sourceLanguage, onSubtitle, localStream }: UseStreamTranslatorProps) => {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef('');
  const lastFinalTranscriptRef = useRef('');
  const subtitleIdRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {}
      analyserRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  }, []);

  // Add subtitle helper
  const addSubtitle = useCallback(async (text: string, isInterim: boolean = false) => {
    if (!text.trim()) return;
    
    if (isInterim) {
      setInterimTranscript(text);
      return;
    }
    
    // Check for duplicates
    if (text === lastFinalTranscriptRef.current) return;
    lastFinalTranscriptRef.current = text;
    
    // Translate
    const translatedText = await translateText(text, targetLanguage, sourceLanguage);
    
    const subtitle: Subtitle = {
      id: `sub_${Date.now()}_${subtitleIdRef.current++}`,
      text,
      translatedText: translatedText || text,
      speaker: 'me',
      timestamp: Date.now(),
      language: targetLanguage,
    };

    setSubtitles(prev => [...prev.slice(-4), subtitle]);
    setInterimTranscript('');
    onSubtitle?.(subtitle);
  }, [targetLanguage, sourceLanguage, onSubtitle]);

  // Speech detection using AudioContext (fallback when Web Speech API fails)
  const startAudioProcessing = useCallback(() => {
    if (!localStream || !enabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(localStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let speechDetected = false;
      let silenceCount = 0;
      
      const detectSpeech = () => {
        if (!enabled || !analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Threshold for speech detection
        if (average > 30) {
          if (!speechDetected) {
            speechDetected = true;
            console.log('[Audio] Speech detected');
          }
          silenceCount = 0;
        } else {
          silenceCount++;
          if (silenceCount > 50 && speechDetected) {
            speechDetected = false;
            console.log('[Audio] Silence detected');
          }
        }
        
        if (enabled) {
          requestAnimationFrame(detectSpeech);
        }
      };
      
      detectSpeech();
      console.log('[Audio] Audio processing started for speech detection');
    } catch (e) {
      console.error('[Audio] Failed to start audio processing:', e);
    }
  }, [localStream, enabled]);

  // Initialize Web Speech API
  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('Voice subtitles need HTTPS (or run on localhost)');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      // Fallback to audio processing only
      startAudioProcessing();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Language mapping
    const langMap: Record<string, string> = {
      'en': 'en-US', 'hi': 'hi-IN', 'es': 'es-ES', 'fr': 'fr-FR',
      'de': 'de-DE', 'it': 'it-IT', 'pt': 'pt-PT', 'ru': 'ru-RU',
      'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN', 'ar': 'ar-SA',
      'tr': 'tr-TR', 'vi': 'vi-VN', 'th': 'th-TH', 'id': 'id-ID',
      'ta': 'ta-IN', 'te': 'te-IN', 'mr': 'mr-IN', 'bn': 'bn-BD',
      'gu': 'gu-IN', 'kn': 'kn-IN', 'ml': 'ml-IN', 'pa': 'pa-IN',
      'ur': 'ur-PK', 'auto': 'en-US',
    };
    
    let selectedLang = langMap[sourceLanguage || 'auto'] || 'en-US';
    if (sourceLanguage === 'auto') {
      const browserLang = navigator.language || 'en-US';
      const browserLangCode = browserLang.split('-')[0];
      selectedLang = langMap[browserLangCode] || 'en-US';
    }
    recognition.lang = selectedLang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      console.log(`[Translator] Started with lang: ${selectedLang}`);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        interimTranscriptRef.current = interim;
        setInterimTranscript(interim);
      }

      if (final) {
        addSubtitle(final, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Translator] Error:', event.error);
      
      if (event.error === 'audio-capture') {
        // Mic is busy - use fallback
        setError('Microphone in use - using audio detection');
        setIsListening(true); // Still show listening state
        startAudioProcessing();
        
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied');
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        console.log('[Translator] No speech');
      }
    };

    recognition.onend = () => {
      console.log('[Translator] Ended');
      
      // Only restart if still enabled and no critical error
      if (enabled && recognitionRef.current === recognition) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('[Translator] Restart failed, using fallback');
            startAudioProcessing();
          }
        }, localStream ? 1000 : 300);
      }
    };

    // Start recognition
    try {
      recognition.start();
    } catch (e) {
      console.error('[Translator] Start failed:', e);
      setIsListening(true);
      startAudioProcessing();
    }

    return cleanup;
  }, [enabled, targetLanguage, sourceLanguage, localStream, addSubtitle, startAudioProcessing, cleanup]);

  const clearSubtitles = useCallback(() => {
    setSubtitles([]);
    setInterimTranscript('');
    lastFinalTranscriptRef.current = '';
  }, []);

  const addRemoteSubtitle = useCallback(async (text: string) => {
    const recent = subtitles[subtitles.length - 1];
    if (recent && recent.text === text && recent.speaker === 'remote') return;
    
    const translatedText = await translateText(text, targetLanguage);
    
    const subtitle: Subtitle = {
      id: `sub_remote_${Date.now()}_${subtitleIdRef.current++}`,
      text,
      translatedText: translatedText || text,
      speaker: 'remote',
      timestamp: Date.now(),
      language: targetLanguage,
    };

    setSubtitles(prev => [...prev.slice(-4), subtitle]);
    onSubtitle?.(subtitle);
  }, [targetLanguage, onSubtitle, subtitles]);

  return {
    subtitles,
    isListening,
    error,
    clearSubtitles,
    addRemoteSubtitle,
    interimTranscript,
    isSupported: typeof window !== 'undefined' && !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition,
  };
};
