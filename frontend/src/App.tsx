/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { motion } from 'motion/react';
import { 
  Upload, 
  Download, 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Minus,
  ChevronLeft,
  ChevronRight,
  FileAudio,
  Settings2,
  Clock,
  Type,
  User,
  Mail,
  Phone,
  X,
  Video,
  Palette,
  Monitor,
  Layers,
  Sparkles,
  Undo,
  Redo,
  Scissors,
  RotateCw,
  ShieldAlert,
  BarChart3,
  LogOut
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useOutletContext, Outlet } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import AuthPage from './components/AuthPage';
import UserDashboard from './components/UserDashboard';
import ProfileSettings from './components/ProfileSettings';
import AdminLoginPage from './components/AdminLoginPage';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { cn } from './lib/utils';
import axios from 'axios';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { StudioSidebar } from "@/components/StudioSidebar"
import { SiteHeader } from "@/components/site-header"

interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

interface HistoryState {
  segments: CaptionSegment[];
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  strokeWidth: number;
  textShadow: boolean;
  textAlign: 'left' | 'center' | 'right';
  textPosition: number;
  transitionType: 'none' | 'fade' | 'slide' | 'pop';
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MainApp />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/settings" element={<ProfileSettings />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route 
          path="/admin" 
          element={
            localStorage.getItem('admin_token') ? <AdminDashboard /> : <AdminLoginPage />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('auth_token'));
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const isValidToken = token && token !== 'undefined' && token !== 'null';
    setIsLoggedIn(!!isValidToken);
    
    if (isValidToken && !user) {
      axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        setIsLoading(false);
      })
      .catch(() => {
        // Token might be invalid but don't clear immediately - try to continue
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    if (!isValidToken && !['/login', '/signup', '/admin', '/admin/login'].includes(location.pathname)) {
      navigate('/login');
    }
    
    // If logged in and trying to access login/signup, redirect to home
    if (isValidToken && ['/login', '/signup'].includes(location.pathname)) {
      navigate('/');
    }
  }, [location.pathname, navigate, isLoggedIn]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Show loading while checking auth
  if (isLoading && location.pathname !== '/login' && location.pathname !== '/signup') {
    return (
      <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full dark:border-white"></div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "280px",
        "--header-height": "64px",
      } as React.CSSProperties}
    >
      <StudioSidebar user={{ 
        name: user?.name || "User", 
        email: user?.email || "", 
        role: "user",
        plan: user?.plan || "Free" 
      }} />
      <SidebarInset>
        <SiteHeader user={{ name: user?.name || "User", avatar: user?.avatar }} />
        <main className="flex-1 overflow-auto bg-background">
          <Outlet context={{ isLoggedIn, setIsLoggedIn }} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function MainApp() {
  const { isLoggedIn, setIsLoggedIn } = useOutletContext<any>();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [threshold, setThreshold] = useState(0.03); // Lower default threshold
  const [minSpeechDuration, setMinSpeechDuration] = useState(0.1); // 100ms for words
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.05); // 50ms for gaps
  const [padding, setPadding] = useState(0.05); // 50ms padding
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAligning, setIsAligning] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'captions' | 'transcript' | 'studio'>('captions');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSyncingList, setIsSyncingList] = useState(false);
  const [aiModel, setAiModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3-flash-preview' | 'gemini-3.1-flash-lite-preview'>('gemini-3.1-pro-preview');
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<string>>(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [userData, setUserData] = useState({ name: '', email: '', phone: '', countryCode: '+91' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Studio States
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [textShadow, setTextShadow] = useState(true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textPosition, setTextPosition] = useState(80); // % from top
  const [transitionType, setTransitionType] = useState<'none' | 'fade' | 'slide' | 'pop'>('fade');
  const [isRecording, setIsRecording] = useState(false);

  // Stop Signal Refs
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const alignmentAbortRef = useRef<AbortController | null>(null);
  const syncAbortRef = useRef<AbortController | null>(null);

  const stopTranscription = () => {
    transcriptionAbortRef.current?.abort();
    setIsTranscribing(false);
  };

  const stopAlignment = () => {
    alignmentAbortRef.current?.abort();
    setIsAligning(false);
  };

  const stopSyncing = () => {
    syncAbortRef.current?.abort();
    setIsSyncingList(false);
  };

  // History States
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const isInternalChange = useRef(false);

  const getCurrentState = useCallback((): HistoryState => ({
    segments: JSON.parse(JSON.stringify(segments)),
    fontFamily,
    fontSize,
    fontColor,
    strokeColor,
    strokeWidth,
    textShadow,
    textAlign,
    textPosition,
    transitionType
  }), [segments, fontFamily, fontSize, fontColor, strokeColor, strokeWidth, textShadow, textAlign, textPosition, transitionType]);

  // Push to history when important states change
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const newState = getCurrentState();
      setUndoStack(prev => {
        // Only push if state actually changed
        const lastState = prev[prev.length - 1];
        if (lastState && JSON.stringify(lastState) === JSON.stringify(newState)) {
          return prev;
        }
        return [...prev.slice(-49), newState]; // Keep last 50 steps
      });
      setRedoStack([]);
    }, 500); // Debounce history pushes

    return () => clearTimeout(timer);
  }, [segments, fontFamily, fontSize, fontColor, strokeColor, strokeWidth, textShadow, textAlign, textPosition, transitionType, getCurrentState]);

  const undo = () => {
    if (undoStack.length <= 1) return;
    
    const currentState = undoStack[undoStack.length - 1];
    const prevState = undoStack[undoStack.length - 2];
    
    isInternalChange.current = true;
    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));
    
    applyState(prevState);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    
    isInternalChange.current = true;
    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));
    
    applyState(nextState);
  };

  const applyState = (state: HistoryState) => {
    setSegments(state.segments);
    setFontFamily(state.fontFamily);
    setFontSize(state.fontSize);
    setFontColor(state.fontColor);
    setStrokeColor(state.strokeColor);
    setStrokeWidth(state.strokeWidth);
    setTextShadow(state.textShadow);
    setTextAlign(state.textAlign);
    setTextPosition(state.textPosition);
    setTransitionType(state.transitionType);
  };

  const resetApp = () => {
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
      wavesurfer.current = null;
    }
    setAudioFile(null);
    setAudioUrl(null);
    setSegments([]);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setThreshold(0.03);
    setMinSpeechDuration(0.1);
    setMinSilenceDuration(0.05);
    setPadding(0.05);
    setIsAnalyzing(false);
    setTranscript('');
    setIsAligning(false);
    setDetectedLanguage(null);
    setActiveTab('captions');
    setIsTranscribing(false);
    setFormErrors({});
    // Reset studio
    setFontFamily('Inter');
    setFontSize(48);
    setFontColor('#ffffff');
    setStrokeColor('#000000');
    setStrokeWidth(2);
    setTextShadow(true);
    setTextAlign('center');
    setTextPosition(80);
    setTransitionType('fade');
    setUndoStack([]);
    setRedoStack([]);
  };

  const countryCodes = [
    { code: '+91', name: 'India' },
    { code: '+1', name: 'USA/Canada' },
    { code: '+44', name: 'UK' },
    { code: '+61', name: 'Australia' },
    { code: '+81', name: 'Japan' },
    { code: '+49', name: 'Germany' },
    { code: '+33', name: 'France' },
    { code: '+971', name: 'UAE' },
    { code: '+65', name: 'Singapore' },
    { code: '+86', name: 'China' },
  ];

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const transcribeAudio = async () => {
    if (!audioFile) return;
    setIsTranscribing(true);
    setActiveTab('transcript');
    transcriptionAbortRef.current = new AbortController();

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const prompt = `
        Analyze this audio file.
        1. Detect the language of the speech. If it's a mix of Hindi and English, call it "Hinglish".
        2. Provide a full, accurate transcript of the speech.
        3. CRITICAL: Use "Hinglish" formatting. If the speaker says a Hindi word, write it in Hindi (Devanagari script). If they say an English word, write it in English (Latin script).
        4. Capture the speaking style, including pauses and emphasis, in the text formatting if possible.
        
        Return the result as a JSON object with two fields:
        "language": The detected language name (e.g., "Hinglish", "Hindi", "English").
        "transcript": The full text transcript in mixed script (Hindi + English).
      `;

      const result_promise = (ai as any).models.generateContent({
        model: aiModel,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: audioFile.type || 'audio/mpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const response = await result_promise;
      if (transcriptionAbortRef.current?.signal.aborted) return;

      const result = JSON.parse(response.text || '{}');
      if (result.transcript) {
        setTranscript(result.transcript);
        setDetectedLanguage(result.language);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error transcribing audio:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const alignTranscript = async () => {
    if (!transcript || !audioFile) return;
    setIsAligning(true);
    alignmentAbortRef.current = new AbortController();

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const prompt = `
        I have an audio file and its transcript. 
        TRANSCRIPT: "${transcript}"
        
        CRITICAL TASK: PERFORM PRECISION FORCED ALIGNMENT
        1. Analyze the audio second-by-second with extreme care.
        2. Match every single word in the transcript to its exact timestamp in the audio.
        3. Group these words into natural, readable caption segments (typically 3-6 words per segment).
        4. For each segment, provide the EXACT start time (when the first word begins) and the EXACT end time (when the last word ends).
        5. The timings must be accurate to the millisecond (e.g., 1.245).
        6. Ensure there are NO overlapping segments.
        7. Maintain the original Hinglish script (Hindi in Devanagari, English in Latin).
        8. If there are pauses between sentences or phrases, ensure the segments reflect that—do NOT extend a segment's end time into a period of silence.
        9. Every word from the transcript MUST be included in the segments in the correct order.
        
        Return the result as a JSON object with a "segments" field, which is an array of objects:
        {
          "segments": [
            {
              "start": number (seconds, e.g. 1.45),
              "end": number (seconds, e.g. 3.21),
              "text": "The phrase text"
            }
          ]
        }
      `;

      const result_promise = (ai as any).models.generateContent({
        model: aiModel,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: audioFile.type || 'audio/mpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const response = await result_promise;
      if (alignmentAbortRef.current?.signal.aborted) return;

      const result = JSON.parse(response.text || '{}');
      
      if (result.segments && Array.isArray(result.segments)) {
        const newSegments = result.segments.map((seg: any, i: number) => ({
          id: `seg-${Date.now()}-${i}`,
          start: parseFloat(seg.start),
          end: parseFloat(seg.end),
          text: seg.text
        }));
        setSegments(newSegments);
        setUndoStack([{ segments: newSegments, fontFamily, fontSize, fontColor, strokeColor, strokeWidth, textShadow, textAlign, textPosition, transitionType }]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error aligning transcript:', error);
    } finally {
      setIsAligning(false);
    }
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#27272a', // zinc-800
      progressColor: '#09090b', // zinc-950
      cursorColor: '#09090b',
      barWidth: 2,
      barRadius: 3,
      height: 120,
      normalize: true,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    wavesurfer.current.on('timeupdate', (time) => setCurrentTime(time));
    wavesurfer.current.on('ready', () => setDuration(wavesurfer.current?.getDuration() || 0));

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setSegments([]); // Reset segments on new file
      
      // Initialize history with empty segments
      const initialState: HistoryState = {
        segments: [],
        fontFamily: 'Inter',
        fontSize: 48,
        fontColor: '#ffffff',
        strokeColor: '#000000',
        strokeWidth: 2,
        textShadow: true,
        textAlign: 'center',
        textPosition: 80,
        transitionType: 'fade'
      };
      setUndoStack([initialState]);
      setRedoStack([]);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;
    setIsAnalyzing(true);

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // --- AUTO-SYNC PARAMETERS ---
      // 1. Calculate RMS profile to find noise floor and peaks
      const profileStep = 0.05; // 50ms for profiling
      const profileSamples = Math.floor(sampleRate * profileStep);
      const rmsValues: number[] = [];
      
      for (let i = 0; i < channelData.length; i += profileSamples) {
        const chunk = channelData.slice(i, i + profileSamples);
        let sum = 0;
        for (let j = 0; j < chunk.length; j++) sum += chunk[j] * chunk[j];
        rmsValues.push(Math.sqrt(sum / chunk.length));
      }
      
      const sortedRms = [...rmsValues].sort((a, b) => a - b);
      const noiseFloor = sortedRms[Math.floor(sortedRms.length * 0.1)]; // 10th percentile
      const peakVolume = sortedRms[Math.floor(sortedRms.length * 0.95)]; // 95th percentile
      
      // Auto-calculate 4 parameters
      const autoThreshold = Math.max(0.01, noiseFloor + (peakVolume - noiseFloor) * 0.15);
      const autoMinSilence = 0.05; // Default for word-level
      const autoMinSpeech = 0.08;  // Slightly lower for fast words
      const autoPadding = 0.04;    // Tight padding
      
      // Update UI state so user sees the sync
      setThreshold(autoThreshold);
      setMinSilenceDuration(autoMinSilence);
      setMinSpeechDuration(autoMinSpeech);
      setPadding(autoPadding);

      // --- PROCEED WITH DETECTION ---
      const step = 0.01; // 10ms resolution for high precision
      const samplesPerStep = Math.floor(sampleRate * step);
      const newSegments: CaptionSegment[] = [];
      let inSpeech = false;
      let speechStart = 0;
      let silenceStart = 0;

      for (let i = 0; i < channelData.length; i += samplesPerStep) {
        const chunk = channelData.slice(i, i + samplesPerStep);
        let sum = 0;
        for (let j = 0; j < chunk.length; j++) sum += chunk[j] * chunk[j];
        const rms = Math.sqrt(sum / chunk.length);
        const time = i / sampleRate;

        if (rms > autoThreshold) {
          if (!inSpeech) {
            inSpeech = true;
            speechStart = Math.max(0, time - autoPadding);
          }
          silenceStart = 0;
        } else {
          if (inSpeech) {
            if (silenceStart === 0) silenceStart = time;
            if (time - silenceStart >= autoMinSilence) {
              const speechEnd = Math.min(audioBuffer.duration, silenceStart + autoPadding);
              if (speechEnd - speechStart >= autoMinSpeech) {
                newSegments.push({
                  id: crypto.randomUUID(),
                  start: speechStart,
                  end: speechEnd,
                  text: ''
                });
              }
              inSpeech = false;
            }
          }
        }
      }

      // Handle last segment
      if (inSpeech) {
        const speechEnd = audioBuffer.duration;
        if (speechEnd - speechStart >= minSpeechDuration) {
          newSegments.push({
            id: crypto.randomUUID(),
            start: speechStart,
            end: speechEnd,
            text: ''
          });
        }
      }

      setSegments(newSegments);
    } catch (error) {
      console.error('Error analyzing audio:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!userData.name.trim()) errors.name = 'Name is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!userData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(userData.email)) {
      errors.email = 'Invalid email format';
    }

    const phoneRegex = /^\d{7,15}$/;
    if (!userData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(userData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Invalid phone number (7-15 digits)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDownloadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowDownloadModal(false);
      performExport();
    }
  };

  const exportSRT = () => {
    setShowDownloadModal(true);
  };

  const performExport = () => {
    const content = segments
      .map((seg, index) => {
        return `${index + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text || '[No Text]'}\n`;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name.split('.')[0] || 'captions'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateSegmentText = (id: string, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  };

  const deleteSegment = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    setSelectedSegmentIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSegmentSelection = (id: string) => {
    setSelectedSegmentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const adjustSegmentTime = (id: string, type: 'start' | 'end', delta: number) => {
    setSegments(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (type === 'start') {
        const newStart = Math.max(0, Math.min(s.end - 0.05, s.start + delta));
        return { ...s, start: newStart };
      } else {
        const newEnd = Math.max(s.start + 0.05, Math.min(duration, s.end + delta));
        return { ...s, end: newEnd };
      }
    }));
  };

  const mergeSegments = () => {
    if (selectedSegmentIds.size < 2) return;
    
    const selected = segments.filter(s => selectedSegmentIds.has(s.id)).sort((a, b) => a.start - b.start);
    const first = selected[0];
    const last = selected[selected.length - 1];
    
    const mergedText = selected.map(s => s.text).filter(t => t.trim() !== '').join(' ');
    
    const newSegment: CaptionSegment = {
      id: crypto.randomUUID(),
      start: first.start,
      end: last.end,
      text: mergedText
    };
    
    setSegments(prev => {
      const filtered = prev.filter(s => !selectedSegmentIds.has(s.id));
      const next = [...filtered, newSegment].sort((a, b) => a.start - b.start);
      return next;
    });
    
    setSelectedSegmentIds(new Set());
  };

  const splitSegmentByWords = (seg: CaptionSegment) => {
    const words = seg.text.split(' ').filter(w => w.trim() !== '');
    if (words.length <= 1) return;

    const duration = seg.end - seg.start;
    const wordDuration = duration / words.length;

    const newSegments = words.map((word, i) => ({
      id: crypto.randomUUID(),
      start: seg.start + (i * wordDuration),
      end: seg.start + ((i + 1) * wordDuration),
      text: word
    }));

    setSegments(prev => {
      const filtered = prev.filter(s => s.id !== seg.id);
      const next = [...filtered, ...newSegments].sort((a, b) => a.start - b.start);
      return next;
    });
  };

  const syncAllSegments = async () => {
    if (segments.length === 0 || !audioFile) return;
    setIsSyncingList(true);
    syncAbortRef.current = new AbortController();

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const segmentsJson = segments.map(s => ({ start: s.start, end: s.end, text: s.text }));

      const prompt = `
        I have an audio file and its current caption segments.
        CURRENT SEGMENTS: ${JSON.stringify(segmentsJson)}
        
        CRITICAL TASK: RE-SYNCHRONIZE TIMINGS
        1. Analyze the audio carefully.
        2. Keep the EXACT text for each segment as provided. Do not combine or split them.
        3. Match the text of each segment to its precise audio timestamp.
        4. Provide the EXACT start and end times for each segment.
        5. Timings must be accurate to the millisecond.
        6. Ensure NO overlaps.
        
        Return the result as a JSON object with a "segments" field:
        {
          "segments": [
            {
              "start": number,
              "end": number,
              "text": "original text"
            }
          ]
        }
      `;

      const result_promise = (ai as any).models.generateContent({
        model: aiModel,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: audioFile.type || 'audio/mpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const response = await result_promise;
      if (syncAbortRef.current?.signal.aborted) return;

      const result = JSON.parse(response.text || '{}');
      
      if (result.segments && Array.isArray(result.segments)) {
        const sortedResults = result.segments.sort((a,b) => a.start - b.start);
        const newSegments = sortedResults.map((seg: any, i: number) => ({
          id: `seg-sync-${Date.now()}-${i}`,
          start: parseFloat(seg.start),
          end: parseFloat(seg.end),
          text: seg.text
        }));
        setSegments(newSegments);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error syncing segments:', error);
    } finally {
      setIsSyncingList(false);
    }
  };

  const addSegment = () => {
    const newSeg: CaptionSegment = {
      id: crypto.randomUUID(),
      start: currentTime,
      end: Math.min(currentTime + 2, duration),
      text: ''
    };
    setSegments(prev => [...prev, newSeg].sort((a, b) => a.start - b.start));
  };

  const jumpToTime = (time: number) => {
    wavesurfer.current?.setTime(time);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!audioUrl ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-zinc-200 rounded-3xl bg-white group hover:border-zinc-400 transition-colors cursor-pointer relative overflow-hidden">
            <input
              type="file"
              accept="audio/mp3,audio/wav,audio/mpeg"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-50 group-hover:text-zinc-800 transition-all mb-4">
              <Upload size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">Upload Audio File</h2>
            <p className="text-zinc-500 text-sm">MP3 or WAV files supported</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Player Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => wavesurfer.current?.playPause()}
                    className="w-14 h-14 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition-all active:scale-90 shadow-lg shadow-zinc-100"
                  >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </button>
                  <div>
                    <h3 className="font-bold text-zinc-900">{audioFile?.name}</h3>
                    <p className="text-sm text-zinc-500 font-mono">
                      {formatTime(currentTime).replace(',', '.')} / {formatTime(duration).replace(',', '.')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetApp}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={18} />
                    Reset
                  </button>
                  <button
                    onClick={analyzeAudio}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-zinc-50 text-zinc-800 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                  >
                    <Settings2 size={18} />
                    {isAnalyzing ? 'Analyzing...' : 'Auto-Detect Timings'}
                  </button>
                  <button
                    onClick={isTranscribing ? stopTranscription : transcribeAudio}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50",
                      isTranscribing 
                        ? "bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200" 
                        : "bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    {isTranscribing ? <X size={18} /> : <Settings2 size={18} />}
                    {isTranscribing ? 'Stop' : 'Transcribe Audio (AI)'}
                  </button>
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    disabled={segments.length === 0}
                    className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50 active:scale-95 ml-2"
                  >
                    <Download size={18} />
                    Export SRT
                  </button>
                </div>
              </div>

              <div ref={waveformRef} className="mb-4" />
              
              {/* Analysis Controls */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-6 border-t border-zinc-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">AI Model</label>
                  <select 
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold transition-all focus:ring-2 focus:ring-zinc-800 outline-none"
                  >
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Best)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Lightweight)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Silence Threshold</label>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="0.2" 
                    step="0.01" 
                    value={threshold} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setThreshold(val);
                    }}
                    className="w-full accent-zinc-900"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>SENSITIVE</span>
                    <span>{threshold.toFixed(2)}</span>
                    <span>LOOSE</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Min Speech (s)</label>
                  <input 
                    type="number" 
                    min="0.05" 
                    max="2" 
                    step="0.05" 
                    value={minSpeechDuration} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setMinSpeechDuration(val);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1 text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Min Silence (s)</label>
                  <input 
                    type="number" 
                    min="0.01" 
                    max="2" 
                    step="0.01" 
                    value={minSilenceDuration} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setMinSilenceDuration(val);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1 text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Padding (s)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="0.5" 
                    step="0.01" 
                    value={padding} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setPadding(val);
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="flex items-center gap-4 border-b border-zinc-200">
              <button
                onClick={() => setActiveTab('captions')}
                className={cn(
                  "px-6 py-3 text-sm font-bold transition-all border-b-2",
                  activeTab === 'captions' ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                Caption Editor
              </button>
              <button
                onClick={() => setActiveTab('studio')}
                className={cn(
                  "px-6 py-3 text-sm font-bold transition-all border-b-2",
                  activeTab === 'studio' ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                Video Studio
              </button>
            </div>

            {activeTab === 'studio' ? (
              <VideoStudio 
                segments={segments}
                setSegments={setSegments}
                currentTime={currentTime}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                fontSize={fontSize}
                setFontSize={setFontSize}
                fontColor={fontColor}
                setFontColor={setFontColor}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                textShadow={textShadow}
                setTextShadow={setTextShadow}
                textAlign={textAlign}
                setTextAlign={setTextAlign}
                textPosition={textPosition}
                setTextPosition={setTextPosition}
                transitionType={transitionType}
                setTransitionType={setTransitionType}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                duration={duration}
                wavesurfer={wavesurfer.current}
                undo={undo}
                redo={redo}
                undoStack={undoStack}
                redoStack={redoStack}
                formatTime={formatTime}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Full Transcript */}
                <div className="lg:col-span-4 sticky top-8">
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Type size={18} className="text-zinc-900" />
                        Full Transcript
                      </h3>
                      {detectedLanguage && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-wider">
                          {detectedLanguage}
                        </span>
                      )}
                    </div>
                    <textarea
                      placeholder="Transcript will appear here..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      className="w-full h-[400px] bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-zinc-800 focus:border-transparent transition-all mb-4 resize-none"
                    />
                    <button
                      onClick={isAligning ? stopAlignment : alignTranscript}
                      disabled={(!transcript && !isAligning) || (!audioFile && !isAligning)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                        isAligning 
                          ? "bg-red-600 text-white shadow-red-100 hover:bg-red-700" 
                          : "bg-zinc-900 text-white shadow-zinc-100 hover:bg-zinc-800"
                      )}
                    >
                      {isAligning ? (
                        <>
                          <X size={16} />
                          Stop
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Smart AI Sync
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-zinc-400 mt-3 text-center uppercase tracking-widest font-bold">
                      Analyze audio to sync text with timing
                    </p>
                  </div>
                </div>

                {/* Right Side: Captions List */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                      <h2 className="font-bold text-lg flex items-center gap-2 text-zinc-900">
                        <Layers size={18} className="text-zinc-900" />
                        Captions List
                        <span className="text-xs font-normal text-zinc-400 ml-2">({segments.length})</span>
                      </h2>
                      <div className="flex items-center gap-1 ml-4">
                        {segments.length > 0 && (
                          <button
                            onClick={isSyncingList ? stopSyncing : syncAllSegments}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm border uppercase tracking-wider",
                              isSyncingList 
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" 
                                : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
                            )}
                          >
                            {isSyncingList ? <X size={12} /> : <RotateCw size={12} />}
                            {isSyncingList ? 'Stop' : 'Auto Sync'}
                          </button>
                        )}
                        {selectedSegmentIds.size >= 2 && (
                          <button
                            onClick={mergeSegments}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-sm uppercase tracking-wider"
                          >
                            <Layers size={12} />
                            Merge ({selectedSegmentIds.size})
                          </button>
                        )}
                        <button
                          onClick={addSegment}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors uppercase tracking-wider"
                        >
                          <Plus size={12} />
                          Add
                        </button>
                        <button
                          onClick={undo}
                          disabled={undoStack.length <= 1}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all disabled:opacity-30"
                        >
                          <Undo size={16} />
                        </button>
                        <button
                          onClick={redo}
                          disabled={redoStack.length === 0}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all disabled:opacity-30"
                        >
                          <Redo size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {segments.length === 0 ? (
                    <div className="py-24 text-center bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
                      <p className="text-zinc-400 text-sm">No segments detected yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[700px] pr-2 scrollbar-thin scrollbar-thumb-zinc-200">
                      {segments.map((seg, index) => (
                        <div 
                          key={seg.id}
                          className={cn(
                            "group bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 transition-all hover:border-zinc-200 hover:shadow-md",
                            currentTime >= seg.start && currentTime <= seg.end && "border-zinc-800 bg-zinc-50/30 ring-1 ring-zinc-800",
                            selectedSegmentIds.has(seg.id) && "border-zinc-900 bg-zinc-50/50"
                          )}
                        >
                          <div className="flex items-center gap-3 md:w-48 shrink-0">
                            <input 
                              type="checkbox"
                              checked={selectedSegmentIds.has(seg.id)}
                              onChange={() => toggleSegmentSelection(seg.id)}
                              className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-800 cursor-pointer"
                            />
                            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-500">
                              {index + 1}
                            </div>
                            <button 
                              onClick={() => {
                                jumpToTime(seg.start);
                                wavesurfer.current?.play();
                              }}
                              className="flex items-center gap-1.5 text-[10px] font-mono bg-zinc-50 text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-100 transition-colors"
                            >
                              <Play size={12} fill="currentColor" />
                              {formatTime(seg.start).replace(',', '.').slice(3)}
                            </button>
                            
                            <div className="flex flex-col gap-0.5 ml-1">
                              <button 
                                onClick={() => adjustSegmentTime(seg.id, 'start', -0.1)}
                                className="p-0.5 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-900 transition-colors"
                              >
                                <ChevronLeft size={10} />
                              </button>
                              <button 
                                onClick={() => adjustSegmentTime(seg.id, 'start', 0.1)}
                                className="p-0.5 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-900 transition-colors"
                              >
                                <ChevronRight size={10} />
                              </button>
                            </div>

                            <span className="text-zinc-300 mx-1 text-xs">→</span>
                            
                            <div className="flex flex-col gap-0.5 mr-1">
                              <button 
                                onClick={() => adjustSegmentTime(seg.id, 'end', -0.1)}
                                className="p-0.5 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-900 transition-colors"
                              >
                                <ChevronLeft size={10} />
                              </button>
                              <button 
                                onClick={() => adjustSegmentTime(seg.id, 'end', 0.1)}
                                className="p-0.5 hover:bg-zinc-100 rounded text-zinc-300 hover:text-zinc-900 transition-colors"
                              >
                                <ChevronRight size={10} />
                              </button>
                            </div>

                            <span className="text-[10px] font-mono text-zinc-400">
                              {formatTime(seg.end).replace(',', '.').slice(3)}
                            </span>
                          </div>

                          <div className="flex-1">
                            <textarea
                              placeholder="Caption text..."
                              value={seg.text}
                              onChange={(e) => updateSegmentText(seg.id, e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm font-medium placeholder:text-zinc-300 p-0 min-h-[40px]"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => splitSegmentByWords(seg)}
                              disabled={seg.text.split(' ').filter(w => w.trim() !== '').length <= 1}
                              className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all disabled:opacity-0"
                              title="Split into words"
                            >
                              <Scissors size={18} />
                            </button>
                            <button
                              onClick={() => deleteSegment(seg.id)}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-zinc-200 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-zinc-500">
          <div>
            <h4 className="font-bold text-zinc-900 mb-2">How it works</h4>
            <p className="leading-relaxed">
              This tool uses signal processing to analyze audio amplitude. It detects "islands" of sound 
              separated by silence to automatically create caption timings. You can then manually enter 
              the text for each segment. No AI or external servers are used for transcription.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 mb-2">Instructions</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Upload an MP3 or WAV file.</li>
              <li>Adjust "Silence Threshold" if detection is too sensitive.</li>
              <li>Click "Auto-Detect Timings" to generate segments.</li>
              <li>Enter text for each segment and export as .srt.</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50 p-6 rounded-2xl">
          <p className="text-xs text-zinc-400">© 2026 Perfect Captions AI. All rights reserved.</p>
        </div>
      </footer>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Download SRT</h2>
                <button 
                  onClick={() => setShowDownloadModal(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-zinc-500" />
                </button>
              </div>
              
              <p className="text-zinc-500 mb-8 text-sm">
                Please provide your details to download your perfectly synced captions.
              </p>

              <form onSubmit={handleDownloadSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text"
                      value={userData.name}
                      onChange={(e) => setUserData({...userData, name: e.target.value})}
                      placeholder="John Doe"
                      className={`w-full bg-zinc-50 border ${formErrors.name ? 'border-red-500' : 'border-zinc-200'} rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none transition-all`}
                    />
                  </div>
                  {formErrors.name && <p className="text-[10px] text-red-500 font-medium">{formErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="email"
                      value={userData.email}
                      onChange={(e) => setUserData({...userData, email: e.target.value})}
                      placeholder="john@example.com"
                      className={`w-full bg-zinc-50 border ${formErrors.email ? 'border-red-500' : 'border-zinc-200'} rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none transition-all`}
                    />
                  </div>
                  {formErrors.email && <p className="text-[10px] text-red-500 font-medium">{formErrors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                  <div className="flex gap-2">
                    <select 
                      value={userData.countryCode}
                      onChange={(e) => setUserData({...userData, countryCode: e.target.value})}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl px-2 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none transition-all w-24"
                    >
                      {countryCodes.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="tel"
                        value={userData.phone}
                        onChange={(e) => setUserData({...userData, phone: e.target.value})}
                        placeholder="9876543210"
                        className={`w-full bg-zinc-50 border ${formErrors.phone ? 'border-red-500' : 'border-zinc-200'} rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-zinc-800 outline-none transition-all`}
                      />
                    </div>
                  </div>
                  {formErrors.phone && <p className="text-[10px] text-red-500 font-medium">{formErrors.phone}</p>}
                </div>

                <button 
                  type="submit"
                  className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 mt-4 flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  Submit & Download SRT
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function Timeline({ segments, setSegments, duration, currentTime, onSeek }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; type: 'move' | 'start' | 'end'; initialX: number; initialStart: number; initialEnd: number } | null>(null);

  const pixelsPerSecond = 100;
  const timelineWidth = duration * pixelsPerSecond;

  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    const seg = segments.find((s: any) => s.id === id);
    if (!seg) return;
    setDragging({
      id,
      type,
      initialX: e.clientX,
      initialStart: seg.start,
      initialEnd: seg.end
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      const deltaX = (e.clientX - dragging.initialX) / pixelsPerSecond;
      
      setSegments((prev: any) => prev.map((s: any) => {
        if (s.id !== dragging.id) return s;
        
        let newStart = s.start;
        let newEnd = s.end;
        
        if (dragging.type === 'move') {
          const duration = dragging.initialEnd - dragging.initialStart;
          newStart = Math.max(0, Math.min(dragging.initialStart + deltaX, duration - duration));
          newStart = dragging.initialStart + deltaX;
          newEnd = newStart + duration;
        } else if (dragging.type === 'start') {
          newStart = Math.max(0, Math.min(dragging.initialStart + deltaX, s.end - 0.1));
        } else if (dragging.type === 'end') {
          newEnd = Math.max(s.start + 0.1, Math.min(dragging.initialEnd + deltaX, duration));
        }
        
        return { ...s, start: newStart, end: newEnd };
      }));
    };

    const handleMouseUp = () => setDragging(null);

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, duration, setSegments]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Timeline Editor</label>
        <span className="text-[10px] font-mono text-zinc-400">Drag to move • Edge to resize</span>
      </div>
      <div 
        ref={containerRef}
        className="h-24 bg-zinc-900 rounded-2xl overflow-x-auto relative border border-zinc-800 custom-scrollbar"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
          onSeek(x / pixelsPerSecond);
        }}
      >
        <div style={{ width: timelineWidth, height: '100%', position: 'relative' }}>
          {/* Time markers */}
          {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
            <div 
              key={i} 
              className="absolute top-0 bottom-0 border-l border-white/5 pointer-events-none"
              style={{ left: i * pixelsPerSecond }}
            >
              <span className="text-[8px] text-white/20 ml-1 mt-1 block">{i}s</span>
            </div>
          ))}

          {/* Segments */}
          {segments.map((seg: any) => (
            <div
              key={seg.id}
              className={cn(
                "absolute top-4 bottom-4 rounded-lg flex items-center justify-center px-2 text-[10px] font-bold overflow-hidden cursor-move transition-shadow",
                currentTime >= seg.start && currentTime <= seg.end 
                  ? "bg-zinc-800 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] z-20" 
                  : "bg-zinc-700 text-zinc-300 z-10 hover:bg-zinc-600"
              )}
              style={{
                left: seg.start * pixelsPerSecond,
                width: (seg.end - seg.start) * pixelsPerSecond,
              }}
              onMouseDown={(e) => handleMouseDown(e, seg.id, 'move')}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30"
                onMouseDown={(e) => handleMouseDown(e, seg.id, 'start')}
              />
              <span className="truncate pointer-events-none">{seg.text || `Segment ${seg.id.slice(0,4)}`}</span>
              <div 
                className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-white/30"
                onMouseDown={(e) => handleMouseDown(e, seg.id, 'end')}
              />
            </div>
          ))}

          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: currentTime * pixelsPerSecond }}
          >
            <div className="w-2 h-2 bg-red-500 rounded-full -ml-[3px] -mt-1 shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

function VideoStudio({ 
  segments, 
  setSegments,
  currentTime, 
  fontFamily, setFontFamily,
  fontSize, setFontSize,
  fontColor, setFontColor,
  strokeColor, setStrokeColor,
  strokeWidth, setStrokeWidth,
  textShadow, setTextShadow,
  textAlign, setTextAlign,
  textPosition, setTextPosition,
  transitionType, setTransitionType,
  isRecording, setIsRecording,
  duration,
  wavesurfer,
  undo,
  redo,
  undoStack,
  redoStack,
  formatTime
}: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    // Add event listeners before loading to capture early logs
    ffmpeg.on('log', ({ message }) => console.log('FFmpeg Log:', message));
    
    const loadTimeout = setTimeout(() => {
      console.error('FFmpeg load timeout - falling back to WebM');
    }, 10000);

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      clearTimeout(loadTimeout);
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (error) {
      clearTimeout(loadTimeout);
      console.error('Failed to load FFmpeg:', error);
      throw error;
    }
  };

  const fonts = [
    'Inter', 'Roboto', 'Montserrat', 'Playfair Display', 'Space Grotesk', 'JetBrains Mono', 'Cormorant Garamond',
    'Open Sans', 'Lato', 'Oswald', 'Source Sans Pro', 'Raleway', 'PT Sans', 'Merriweather', 'Noto Sans', 'Nunito',
    'Ubuntu', 'Poppins', 'Quicksand', 'Arvo', 'Pacifico', 'Kanit', 'Crimson Text', 'Exo 2', 'Lobster', 'Comfortaa',
    'Karla', 'Heebo', 'Varela Round', 'Rubik', 'Cairo', 'Work Sans', 'DM Sans', 'Outfit', 'Syne', 'Bungee',
    'Righteous', 'Fredoka One', 'Concert One', 'Patua One', 'Creepster', 'Luckiest Guy', 'Permanent Marker',
    'Shadows Into Light', 'Amatic SC', 'Caveat', 'Indie Flower', 'Dancing Script', 'Satisfy', 'Courgette',
    'Great Vibes', 'Sacramento', 'Yellowtail', 'Cookie', 'Kaushan Script', 'Allura', 'Alex Brush', 'Tangerine',
    'Abel', 'Signika', 'Archivo Narrow', 'Mukta', 'Nanum Gothic', 'Maven Pro', 'Asap', 'Catamaran', 'Questrial',
    'Zilla Slab', 'Exo', 'Overpass', 'Josefin Sans', 'Josefin Slab', 'Merriweather Sans', 'Spectral', 'Tinos',
    'Domine', 'Vollkorn', 'Libre Franklin', 'Cardo', 'Crimson Pro', 'Bitter', 'Cabin', 'Fira Sans', 'Libre Baskerville',
    'Anton', 'Hind', 'Titillium Web', 'Dosis', 'Inconsolata', 'Oxygen', 'Arimo', 'Lora'
  ].sort();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    // Set canvas size to 1080p for high quality
    canvas.width = 1920;
    canvas.height = 1080;

    const render = async () => {
      // Ensure the font is loaded before drawing
      const fontSpec = `${fontSize * 2}px ${fontFamily}`;
      try {
        await document.fonts.load(fontSpec);
      } catch (e) {
        console.warn('Font failed to load:', fontFamily);
      }

      if (!active) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const currentSegment = segments.find((s: any) => currentTime >= s.start && currentTime <= s.end);
      if (currentSegment) {
        // Handle Transitions
        let opacity = 1;
        let translateX = 0;
        let translateY = 0;
        let scale = 1;
        let skewX = 0;
        let displayText = currentSegment.text;

        const timeIn = currentTime - currentSegment.start;
        const timeOut = currentSegment.end - currentTime;
        const transitionDuration = 0.3;

        if (transitionType === 'fade') {
          opacity = Math.max(0, Math.min(1, timeIn / transitionDuration, timeOut / transitionDuration));
        } else if (transitionType === 'pop') {
          if (timeIn < transitionDuration) {
            scale = 0.8 + (timeIn / transitionDuration) * 0.2;
          }
        } else if (transitionType === 'slide-up') {
          if (timeIn < transitionDuration) {
            translateY = 50 * (1 - (timeIn / transitionDuration));
            opacity = timeIn / transitionDuration;
          }
        } else if (transitionType === 'overshoot') {
          if (timeIn < transitionDuration) {
            const t = timeIn / transitionDuration;
            // Overshoot formula: f(t) = 1 - (1-t)^2 * (1.70158 * (1-t) - 0.70158)
            const overshoot = 1.70158;
            const progress = 1 - Math.pow(1 - t, 2) * ((overshoot + 1) * (1 - t) - overshoot);
            translateY = 50 * (1 - progress);
            opacity = Math.min(1, t * 2);
          }
        } else if (transitionType === 'wiggle') {
          translateX = Math.sin(currentTime * 20) * 2;
          translateY = Math.cos(currentTime * 15) * 2;
        } else if (transitionType === 'decode') {
          if (timeIn < transitionDuration * 2) {
            const progress = timeIn / (transitionDuration * 2);
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
            const visibleCount = Math.floor(currentSegment.text.length * progress);
            displayText = currentSegment.text.slice(0, visibleCount) + 
              Array(currentSegment.text.length - visibleCount)
                .fill(0)
                .map(() => chars[Math.floor(Math.random() * chars.length)])
                .join('');
          }
        } else if (transitionType === 'typewriter') {
          const charDuration = 0.05;
          const visibleChars = Math.floor(timeIn / charDuration);
          displayText = currentSegment.text.slice(0, visibleChars);
        } else if (transitionType === 'skew') {
          skewX = Math.sin(currentTime * 10) * 0.1;
        } else if (transitionType === 'turbulent') {
          translateX = (Math.random() - 0.5) * 4;
          translateY = (Math.random() - 0.5) * 4;
          scale = 1 + (Math.random() - 0.5) * 0.05;
        }

        ctx.save();
        
        const baseX = textAlign === 'center' ? canvas.width / 2 : textAlign === 'left' ? 100 : canvas.width - 100;
        const baseY = (canvas.height * textPosition) / 100;

        ctx.translate(baseX + translateX, baseY + translateY);
        ctx.scale(scale, scale);
        ctx.transform(1, 0, skewX, 1, 0, 0);
        
        ctx.globalAlpha = opacity;
        ctx.font = `${fontSize * 2}px ${fontFamily}`; // Scale for 1080p
        ctx.fillStyle = fontColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth * 2;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';

        if (textShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 8;
          ctx.shadowOffsetY = 8;
        } else {
          ctx.shadowColor = 'transparent';
        }

        // Draw at 0,0 because we translated
        if (strokeWidth > 0) {
          ctx.strokeText(displayText, 0, 0);
        }
        ctx.fillText(displayText, 0, 0);
        
        ctx.restore();
      }
    };

    render();
    return () => { active = false; };
  }, [currentTime, segments, fontFamily, fontSize, fontColor, strokeColor, strokeWidth, textShadow, textAlign, textPosition, transitionType]);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas is transparent
    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    const stream = canvas.captureStream(30);
    // Use VP9 with high bitrate for best transparency preservation
    const mimeType = 'video/webm; codecs=vp9';
    const isMimeSupported = MediaRecorder.isTypeSupported(mimeType);
    
    const recorder = new MediaRecorder(stream, { 
      mimeType: isMimeSupported ? mimeType : 'video/webm',
      videoBitsPerSecond: 8000000 // 8Mbps for 1080p
    });
    
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      setIsExporting(true);
      setExportProgress(0);
      try {
        const webmBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        
        // Convert to MOV using FFmpeg
        const ffmpeg = await loadFFmpeg();
        ffmpeg.on('log', ({ message }) => {
          // Comprehensive progress estimation
          const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2}.\d{2})/);
          if (timeMatch) {
            const h = parseInt(timeMatch[1]);
            const m = parseInt(timeMatch[2]);
            const s = parseFloat(timeMatch[3]);
            const currentSecs = h * 3600 + m * 60 + s;
            const progress = Math.min(99, Math.round((currentSecs / duration) * 100));
            setExportProgress(progress);
          }
        });

        await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
        
        // ProRes 4444 for transparency in MOV
        // Using yuva444p (8-bit) instead of 10le for potentially better compatibility and speed in WASM
        await ffmpeg.exec([
          '-i', 'input.webm',
          '-c:v', 'prores_ks',
          '-profile:v', '4', // 4 is 4444
          '-pix_fmt', 'yuva444p10le', // Stick with 10le but ensure profile is explicitly set
          '-qscale', '11', // Moderate quality to speed up encoding
          '-vendor', 'apl0', // Apple vendor tag
          'output.mov'
        ]);

        const data = await ffmpeg.readFile('output.mov');
        const movBlob = new Blob([data], { type: 'video/quicktime' });
        const url = URL.createObjectURL(movBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'captions-alpha.mov';
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('FFmpeg Error:', error);
        // Fallback to WebM if FFmpeg fails
        const webmBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(webmBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'captions-alpha-fallback.webm';
        a.click();
        URL.revokeObjectURL(url);
      } finally {
        setIsExporting(false);
        setExportProgress(0);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100); // 100ms chunks for reliability
    setIsRecording(true);
    wavesurfer?.setTime(0);
    wavesurfer?.play();

    // Auto stop at end with extra safety margin
    const checkEnd = setInterval(() => {
      const currentTime = wavesurfer?.getCurrentTime() || 0;
      if (currentTime >= duration - 0.01) {
        stopRecording();
        clearInterval(checkEnd);
      }
    }, 100);

    // Absolute fallback stop
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        stopRecording();
        clearInterval(checkEnd);
      }
    }, (duration + 1) * 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    wavesurfer?.pause();
  };

  return (
    <div className="flex flex-col gap-6 bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
      {/* Top Section: Player and Controls side-by-side */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch min-h-[500px]">
        {/* Preview Area (Player) */}
        <div className="xl:flex-[2] flex flex-col gap-4">
          <div className="flex-1 bg-black rounded-[2rem] overflow-hidden shadow-2xl aspect-video relative group border-2 border-zinc-800 flex items-center justify-center">
            <canvas 
              ref={canvasRef} 
              className="max-w-full max-h-full object-contain"
            />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-bold uppercase tracking-widest border border-white/10">
                Alpha Output Monitor
              </div>
            </div>

            {isRecording && (
              <div className="absolute top-6 right-6 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold animate-pulse shadow-lg shadow-red-900/40">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                REC
              </div>
            )}
          </div>

          {/* Player Bar */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => wavesurfer?.playPause()}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-zinc-200 transition-all active:scale-90"
              >
                {wavesurfer?.isPlaying() ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
              </button>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-bold text-white leading-none">
                    {formatTime(currentTime).replace(',', '.').slice(3)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">/ {formatTime(duration).replace(',', '.').slice(3)}</span>
                </div>
                <div className="w-48 xl:w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100" 
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isExporting}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm",
                isRecording 
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/20" 
                  : "bg-zinc-100 text-zinc-900 hover:bg-white"
              )}
            >
              {isExporting ? (
                <>
                  <RotateCw size={18} className="animate-spin" />
                  {exportProgress}%
                </>
              ) : (
                <>
                  {isRecording ? <X size={18} /> : <Video size={18} />}
                  {isRecording ? 'Stop' : 'Export MOV'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Controls Sidebar (Text Decoration) */}
        <div className="xl:flex-1 flex flex-col min-w-[320px]">
          <div className="flex-1 bg-zinc-900 rounded-[2rem] p-6 border border-zinc-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Palette className="text-zinc-400" size={18} />
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Properties</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={undo}
                  disabled={undoStack.length <= 1}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-20"
                  title="Undo"
                >
                  <Undo size={14} />
                </button>
                <button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all disabled:opacity-20"
                  title="Redo"
                >
                  <Redo size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar-thin">
              {/* Font Family */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Typeface</label>
                <select 
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-zinc-400 transition-all appearance-none cursor-pointer"
                >
                  {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Font Size & Position Group */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Size</label>
                    <span className="text-[10px] font-mono text-zinc-400">{fontSize}px</span>
                  </div>
                  <input 
                    type="range" min="12" max="120" value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Y-Pos</label>
                    <span className="text-[10px] font-mono text-zinc-400">{textPosition}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="90" value={textPosition}
                    onChange={(e) => setTextPosition(parseInt(e.target.value))}
                    className="w-full accent-white"
                  />
                </div>
              </div>

              {/* Character Styling */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fill</label>
                  <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl p-2 h-10">
                    <input 
                      type="color" value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="w-6 h-6 rounded-md overflow-hidden border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">{fontColor}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stroke</label>
                  <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl p-2 h-10">
                    <input 
                      type="color" value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-6 h-6 rounded-md overflow-hidden border-none bg-transparent cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">{strokeColor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stroke Weight</label>
                  <span className="text-[10px] font-mono text-zinc-400">{strokeWidth}px</span>
                </div>
                <input 
                  type="range" min="0" max="10" value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-full accent-white"
                />
              </div>

              {/* Alignment */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paragraph</label>
                <div className="flex bg-zinc-800 p-1 rounded-xl gap-1">
                  {(['left', 'center', 'right'] as const).map(align => (
                    <button
                      key={align}
                      onClick={() => setTextAlign(align)}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize",
                        textAlign === align ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-400"
                      )}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion Preset */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Motion Preset</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['none', 'fade', 'pop', 'slide-up', 'overshoot', 'wiggle', 'decode', 'typewriter', 'skew', 'turbulent'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setTransitionType(type)}
                      className={cn(
                        "py-2 px-2 text-[9px] font-bold rounded-lg transition-all capitalize text-left border overflow-hidden truncate",
                        transitionType === type 
                          ? "bg-zinc-100 text-zinc-950 border-transparent" 
                          : "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700"
                      )}
                      title={type}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Effects */}
              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setTextShadow(!textShadow)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                    textShadow ? "bg-white/5 border-white/10 text-white" : "bg-transparent border-zinc-800 text-zinc-500"
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">Drop Shadow</span>
                  <div className={cn(
                    "w-8 h-4 rounded-full relative transition-all",
                    textShadow ? "bg-white" : "bg-zinc-700"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full transition-all",
                      textShadow ? "right-0.5 bg-zinc-900" : "left-0.5 bg-zinc-400"
                    )} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Timeline */}
      <div className="bg-zinc-900 rounded-[2rem] p-6 border border-zinc-800 shadow-sm">
        <Timeline 
          segments={segments} 
          setSegments={setSegments} 
          duration={duration} 
          currentTime={currentTime}
          onSeek={(t: number) => wavesurfer?.setTime(t)}
        />
      </div>
    </div>
  );
}
