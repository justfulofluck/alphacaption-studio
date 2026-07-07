
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Video, Type } from 'lucide-react';
import { Panel } from 'react-resizable-panels';
import { VideoPlayer as LimeplayPlayer } from "@/components/video-player/player";
import { useTimelineStore } from '@/hooks/limeplay/use-timeline';
import { usePlaybackStore } from '@/hooks/limeplay/use-playback';
import { useVolumeStore } from '@/hooks/limeplay/use-volume';

export interface CaptionItem {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: any[];
}

interface CustomPlayerUIProps {
  captions?: CaptionItem[];
  fontFamily: string;
  fontFace: string;
  hoveredFontFamily?: string | null;
  hoveredFontFace?: string | null;
  fontSize: number;
  styleFlags: { underline: boolean };
  casing?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  textAlign: 'left' | 'center' | 'right';
  position: { x: number; y: number };
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  colorToggle: string;
  color: string;
  gradientStops?: Array<{ id: number; position: number; color: string; opacity?: number }>;
  gradientAngle?: number;
  gradientLevel?: 'word' | 'char';
  // EFFECTS props
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowX?: number;
  shadowY?: number;
  shadowBlur?: number;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  bgEnabled?: boolean;
  bgColor?: string;
  bgOpacity?: number;
  bgRadius?: number;
  bgWidth?: number;
  bgHeight?: number;
  bgShadowEnabled?: boolean;
  bgOutlineEnabled?: boolean;
  // SPACING props
  letterSpacing?: number;
  lineSpacing?: number;
  // Timeline synchronization props
  activeCaptionId?: number | null;
  setActiveCaptionId?: (id: number | null) => void;
  seekRef?: React.RefObject<((time: number) => void) | null>;
  linesMode?: string;
  currentTimeRef?: React.MutableRefObject<number>;
  durationRef?: React.MutableRefObject<number>;
  togglePlayRef?: React.MutableRefObject<(() => void) | null>;
  aiAudioClean?: boolean;

  // Emphasis props
  emphasisMode?: string;
  emphasisColor?: string;
  emphasisSize?: number;
  emphasisGlow?: string;
  emphasisFont?: string;
  emphasisFontFace?: string;
  emphasisStyles?: { uppercase: boolean; bold: boolean; italic: boolean; underline: boolean };
  emphasisGradientStops?: any[];
  emphasisGradientAngle?: number;
  emphasisGradientLevel?: 'word' | 'char';
  spotlightMode?: string;
  spotlightColor?: string;
  spotlightSize?: number;
  spotlightGlow?: string;
  spotlightFont?: string;
  spotlightFontFace?: string;
  spotlightStyles?: { uppercase: boolean; bold: boolean; italic: boolean; underline: boolean };
  spotlightGradientStops?: any[];
  spotlightGradientAngle?: number;
  spotlightGradientLevel?: 'word' | 'char';
  removeEmphasis?: boolean;
  hoveredEmphasisFontFamily?: string | null;
  hoveredEmphasisFontFace?: string | null;
  hoveredSpotlightFontFamily?: string | null;
  hoveredSpotlightFontFace?: string | null;
}

function CustomPlayerUI({
  captions,
  fontFamily,
  fontFace,
  hoveredFontFamily,
  hoveredFontFace,
  fontSize,
  styleFlags,
  casing,
  textAlign,
  position,
  setPosition,
  colorToggle,
  color,
  gradientStops,
  gradientAngle,
  gradientLevel,
  shadowEnabled,
  shadowColor,
  shadowOpacity,
  shadowX,
  shadowY,
  shadowBlur,
  strokeEnabled,
  strokeColor,
  strokeOpacity,
  strokeWidth,
  bgEnabled,
  bgColor,
  bgOpacity,
  bgRadius,
  bgWidth,
  bgHeight,
  bgShadowEnabled,
  bgOutlineEnabled,
  letterSpacing = 0,
  lineSpacing = 1.2,
  activeCaptionId,
  setActiveCaptionId,
  seekRef,
  linesMode,
  currentTimeRef,
  durationRef,
  togglePlayRef,
  aiAudioClean = false,

  emphasisMode = 'Solid',
  emphasisColor = '#5E1616',
  emphasisSize = 1.0,
  emphasisGlow = '#5E1616',
  emphasisFont = 'Inter',
  emphasisFontFace = 'Regular Italic',
  emphasisStyles = { uppercase: false, bold: false, italic: true, underline: false },
  emphasisGradientStops = [],
  emphasisGradientAngle = 90,
  emphasisGradientLevel = 'word',
  spotlightMode = 'Solid',
  spotlightColor = '#FFFFFF',
  spotlightSize = 1.3,
  spotlightGlow = '#FFFFFF',
  spotlightFont = 'Inter',
  spotlightFontFace = 'Regular Italic',
  spotlightStyles = { uppercase: false, bold: false, italic: true, underline: false },
  spotlightGradientStops = [],
  spotlightGradientAngle = 90,
  spotlightGradientLevel = 'word',
  removeEmphasis = false,
  hoveredEmphasisFontFamily = null,
  hoveredEmphasisFontFace = null,
  hoveredSpotlightFontFamily = null,
  hoveredSpotlightFontFace = null
}: CustomPlayerUIProps) {
  const mapFontFaceToCss = (face: string) => {
    const weightMap: Record<string, string> = {
      'thin': '100',
      'extra light': '200',
      'light': '300',
      'regular': '400',
      'medium': '500',
      'semi bold': '600',
      'bold': '700',
      'extra bold': '800',
      'black': '900',
    };
    const lower = face.toLowerCase();
    let weight = '400';
    let style = 'normal';

    Object.keys(weightMap).forEach(k => {
      if (lower.includes(k)) {
        weight = weightMap[k];
      }
    });
    if (lower.includes('italic')) {
      style = 'italic';
    }
    return { fontWeight: weight, fontStyle: style };
  };

  const buildGradientStr = (angle: number, stops: any[]) => {
    if (!stops || stops.length === 0) return 'none';
    return `linear-gradient(${angle}deg, ${[...stops]
      .sort((a, b) => a.position - b.position)
      .map((s) => `${s.color} ${s.position}%`)
      .join(', ')})`;
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<{
    highpass: BiquadFilterNode;
    vocalBoost: BiquadFilterNode;
    compressor: DynamicsCompressorNode;
  } | null>(null);

  useEffect(() => {
    const videoEl = document.querySelector('video') as any;
    if (!videoEl) return;

    if (!videoEl._audioConnected) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaElementSource(videoEl);
        audioSourceRef.current = source;

        // 1. Highpass filter to cut low rumble (wind, AC hums)
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 80;

        // 2. Peaking filter to boost presence (speech clarity)
        const vocalBoost = ctx.createBiquadFilter();
        vocalBoost.type = 'peaking';
        vocalBoost.frequency.value = 3000;
        vocalBoost.Q.value = 1.0;
        vocalBoost.gain.value = 5.0; // 5dB boost

        // 3. Dynamics compressor to normalize voice peaks
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        filtersRef.current = { highpass, vocalBoost, compressor };
        videoEl._audioConnected = { ctx, source, filters: { highpass, vocalBoost, compressor } };
      } catch (err) {
        console.error("Failed to initialize Web Audio API for cleaning:", err);
      }
    }

    const cached = videoEl._audioConnected;
    if (cached) {
      try {
        cached.source.disconnect();
        cached.filters.highpass.disconnect();
        cached.filters.vocalBoost.disconnect();
        cached.filters.compressor.disconnect();

        if (aiAudioClean) {
          cached.source.connect(cached.filters.highpass);
          cached.filters.highpass.connect(cached.filters.vocalBoost);
          cached.filters.vocalBoost.connect(cached.filters.compressor);
          cached.filters.compressor.connect(cached.ctx.destination);
        } else {
          cached.source.connect(cached.ctx.destination);
        }

        const resumeCtx = () => {
          if (cached.ctx.state === 'suspended') {
            cached.ctx.resume().catch((e: any) => console.log("Failed to resume ctx:", e));
          }
        };
        resumeCtx();
        videoEl.addEventListener('play', resumeCtx);
        window.addEventListener('click', resumeCtx);
      } catch (err) {
        console.error("Failed to connect/disconnect Web Audio nodes:", err);
      }
    }
  }, [aiAudioClean]);
  const currentTime = useTimelineStore((state) => state.currentTime);
  const duration = useTimelineStore((state) => state.duration);
  const paused = usePlaybackStore((state) => state.paused);
  const togglePaused = usePlaybackStore((state) => state.togglePaused);
  const seek = useTimelineStore((state) => state.seek);
  const volume = useVolumeStore((state) => state.level);
  const muted = useVolumeStore((state) => state.muted);
  const toggleMute = useVolumeStore((state) => state.toggleMute);
  const setVolume = useVolumeStore((state) => state.setVolume);

  // Sync seek function reference to parent
  useEffect(() => {
    if (seekRef) {
      (seekRef as any).current = seek;
    }
  }, [seek, seekRef]);

  // Sync togglePaused function reference to parent
  useEffect(() => {
    if (togglePlayRef) {
      (togglePlayRef as any).current = togglePaused;
    }
  }, [togglePaused, togglePlayRef]);

  // Sync currentTime to parent
  useEffect(() => {
    if (currentTimeRef) {
      currentTimeRef.current = currentTime;
    }
  }, [currentTime, currentTimeRef]);

  // Sync duration to parent
  useEffect(() => {
    if (durationRef) {
      durationRef.current = duration;
    }
  }, [duration, durationRef]);

  const [smoothTime, setSmoothTime] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateSmoothTime = () => {
      const videoEl = document.querySelector('video');
      if (videoEl) {
        setSmoothTime(videoEl.currentTime);
      }
      animId = requestAnimationFrame(updateSmoothTime);
    };
    animId = requestAnimationFrame(updateSmoothTime);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Sync active caption ID to parent state
  const activeCaption = captions?.find(
    (c) => smoothTime >= c.start && smoothTime < c.end
  );

  useEffect(() => {
    if (setActiveCaptionId) {
      setActiveCaptionId(activeCaption ? activeCaption.id : null);
    }
  }, [activeCaption?.id, setActiveCaptionId]);

  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxWidth, setBoxWidth] = useState(80); // percentage width of caption box
  const [snappedX, setSnappedX] = useState(false);
  const [snappedY, setSnappedY] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00.00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTimelineSeek = (clientX: number) => {
    if (duration <= 0 || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    seek(percentage * duration);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsSeeking(true);
    handleTimelineSeek(e.clientX);
    e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsEditing(true);
    e.preventDefault();
  };

  const handleHandleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setIsEditing(true);
    e.stopPropagation();
    e.preventDefault();
  };

  // Drag resizing effect
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const playerContainer = document.querySelector('.player-media-container');
      if (!playerContainer) return;
      const rect = playerContainer.getBoundingClientRect();

      const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const distFromCenter = Math.abs(mouseXPercent - position.x);
      let newWidth = distFromCenter * 2;

      newWidth = Math.max(15, Math.min(95, newWidth));
      setBoxWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position.x]);

  // Drag seek slider effect
  useEffect(() => {
    if (!isSeeking) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleTimelineSeek(e.clientX);
    };

    const handleMouseUp = () => {
      setIsSeeking(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, duration]);

  // Drag caption box effect
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const playerContainer = document.querySelector('.player-media-container');
      if (!playerContainer) return;
      const rect = playerContainer.getBoundingClientRect();

      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;

      x = Math.max(5, Math.min(95, x));
      y = Math.max(5, Math.min(95, y));

      const snapThreshold = 1.5;
      let isSnappedX = Math.abs(x - 50) < snapThreshold;
      let isSnappedY = Math.abs(y - 50) < snapThreshold;
      if (isSnappedX) x = 50.0;
      if (isSnappedY) y = 50.0;
      setSnappedX(isSnappedX);
      setSnappedY(isSnappedY);
      setPosition({ x, y });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setSnappedX(false);
      setSnappedY(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setPosition]);

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.caption-drag-container') && !target.closest('.right-sidebar-panel')) {
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFontFamily = hoveredFontFamily || fontFamily;
  const activeFontFace = hoveredFontFace || fontFace;

  // Map fontFace select value to CSS weight and style
  let fontWeight: React.CSSProperties['fontWeight'] = 'bold';
  let fontStyle: React.CSSProperties['fontStyle'] = 'normal';

  const faceLower = (activeFontFace || '').toLowerCase();

  if (faceLower.includes('italic')) {
    fontStyle = 'italic';
  }

  if (faceLower.includes('thin')) {
    fontWeight = 100;
  } else if (faceLower.includes('extra light')) {
    fontWeight = 200;
  } else if (faceLower.includes('light')) {
    fontWeight = 300;
  } else if (faceLower.includes('regular')) {
    fontWeight = 400;
  } else if (faceLower.includes('medium')) {
    fontWeight = 500;
  } else if (faceLower.includes('semi bold')) {
    fontWeight = 600;
  } else if (faceLower.includes('extra bold')) {
    fontWeight = 800;
  } else if (faceLower.includes('black')) {
    fontWeight = 900;
  } else if (faceLower.includes('bold')) {
    fontWeight = 700;
  }

  const sortedStops = gradientStops ? [...gradientStops].sort((a, b) => a.position - b.position) : [];
  const gradientString = sortedStops.length > 0
    ? `linear-gradient(${gradientAngle || 90}deg, ${sortedStops.map(s => {
      const opacityVal = s.opacity !== undefined ? s.opacity : 100;
      const alphaHex = Math.round(opacityVal * 2.55).toString(16).padStart(2, '0');
      return `${s.color}${alphaHex} ${s.position}%`;
    }).join(', ')})`
    : `linear-gradient(${gradientAngle || 90}deg, ${color}, #52c595)`;

  const getRGBA = (hexColor: string, opacityPercent: number) => {
    const cleanHex = (hexColor || '#000000').replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    const op = opacityPercent !== undefined ? opacityPercent : 100;
    return `rgba(${r}, ${g}, ${b}, ${op / 100})`;
  };

  const shadowCSS = shadowEnabled
    ? `${shadowX || 0}px ${shadowY || 0}px ${shadowBlur || 0}px ${getRGBA(shadowColor || '#000000', shadowOpacity !== undefined ? shadowOpacity : 63)}`
    : 'none';

  const strokeCSS = strokeEnabled
    ? `${strokeWidth || 1}px ${getRGBA(strokeColor || '#000000', strokeOpacity !== undefined ? strokeOpacity : 100)}`
    : 'none';

  const bgStyle: React.CSSProperties = bgEnabled ? {
    backgroundColor: getRGBA(bgColor || '#000000', bgOpacity !== undefined ? bgOpacity : 100),
    borderRadius: `${bgRadius !== undefined ? bgRadius : 24}px`,
    padding: `${bgHeight !== undefined ? bgHeight : 24}px ${bgWidth !== undefined ? bgWidth : 48}px`,
    boxShadow: bgShadowEnabled ? '0px 10px 25px -5px rgba(0, 0, 0, 0.3), 0px 8px 10px -6px rgba(0, 0, 0, 0.3)' : 'none',
    border: bgOutlineEnabled ? '1.5px solid rgba(255, 255, 255, 0.2)' : 'none',
  } : {};

  const captionStyle: React.CSSProperties = {
    fontFamily: activeFontFamily === 'Inter' ? 'Inter, sans-serif' : activeFontFamily === 'Roboto' ? 'Roboto, sans-serif' : activeFontFamily === 'Montserrat' ? 'Montserrat, sans-serif' : 'Poppins, sans-serif',
    fontSize: `${fontSize}px`,
    fontStyle: fontStyle,
    fontWeight: fontWeight,
    textDecoration: styleFlags.underline ? 'underline' : 'none',
    textTransform: casing || 'none',
    textAlign: textAlign,
    textShadow: shadowEnabled ? shadowCSS : (colorToggle === 'Gradient' ? 'none' : '0px 2px 4px rgba(0,0,0,0.95), 0px 4px 10px rgba(0,0,0,0.5)'),
    letterSpacing: `${letterSpacing}px`,
    lineHeight: lineSpacing,
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-between z-20 pointer-events-none select-none">
      <style>{`
        .custom-player-wrapper [data-layout-type="controls-container"],
        .custom-player-wrapper [data-layout-type="controls-overlay-container"],
        .custom-player-wrapper [data-layout-type="controls-bottom-container"] {
          display: none !important;
        }
      `}</style>

      {/* Editor Guide Grid Lines Overlay */}
      {isEditing && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-10 bg-black/10">
          {[...Array(9)].map((_, i) => <div key={i} className="border-r border-b border-white/10" />)}
        </div>
      )}

      {/* Snap Lines */}
      {isDragging && snappedX && <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#00e5ff] z-30 pointer-events-none shadow-[0_0_4px_#00e5ff]" />}
      {isDragging && snappedY && <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[#ff7800] z-30 pointer-events-none shadow-[0_0_4px_#ff7800]" />}

      {/* Top Bar Overlay */}
      <div className="h-14 flex items-center justify-between px-4 bg-[#161618] border-b border-[#2a2a2d] pointer-events-auto">
        <button className="flex items-center gap-2 text-xs font-semibold bg-[#2a2a2d] hover:bg-[#3a3a3d] text-white px-3 py-1.5 rounded transition-colors border border-white/5">
          <RefreshCw className="w-3.5 h-3.5 text-[#52c595]" /> Replace
        </button>

        {/* Middle icons */}
        <div className="flex items-center gap-3 bg-[#2a2a2d] px-3 py-1.5 rounded-lg border border-white/5">
          <button className="text-zinc-400 hover:text-white transition-colors"><Minimize2 className="w-4 h-4" /></button>
          <button className="text-zinc-400 hover:text-white transition-colors"><Video className="w-4 h-4" /></button>
          <button className="text-zinc-400 hover:text-white transition-colors"><Type className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase bg-[#2a2a2d] text-[#8a8a8e] px-3 py-1.5 rounded border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623]"></div> Low-res
        </div>
      </div>

      {/* Caption Overlay */}
      {activeCaption ? (
        <div
          className="absolute caption-drag-container pointer-events-auto cursor-move z-20 flex items-center justify-center"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${boxWidth}%`
          }}
          onMouseDown={handleMouseDown}
        >
          {isEditing && (
            <>
              <div className="absolute -inset-2 border border-[#00e5ff] rounded-sm pointer-events-none z-30" />
              {/* Drag handles at corners and midpoints */}
              <div onMouseDown={handleHandleMouseDown} className="absolute -top-3.5 -left-3.5 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-nwse-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-ns-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute -top-3.5 -right-3.5 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-nesw-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-ew-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-ew-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute -bottom-3.5 -left-3.5 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-nesw-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-ns-resize" />
              <div onMouseDown={handleHandleMouseDown} className="absolute -bottom-3.5 -right-3.5 w-3.5 h-3.5 bg-white border border-zinc-900 rounded-full z-30 shadow cursor-nwse-resize" />
            </>
          )}
          {/* Transparent container background */}
          <div
            className={`p-3 flex flex-wrap gap-y-1.5 rounded-xl select-none ${textAlign === 'left' ? 'justify-start text-left' :
                textAlign === 'right' ? 'justify-end text-right' :
                  'justify-center text-center'
              }`}
            style={{ ...captionStyle, ...bgStyle }}
          >
            {activeCaption.text.split(' ').map((word, wordIndex, wordsArr) => {
              const wordObj = activeCaption.words && activeCaption.words[wordIndex];
              // Highlight if currentTime is within the word's start and end time
              let isHighlight = false;
              if (wordObj) {
                isHighlight = smoothTime >= wordObj.start && smoothTime <= wordObj.end;
              } else if (wordsArr.length > 0) {
                // Fallback highlighting if words array is missing or out of sync
                const chunkDur = (activeCaption.end - activeCaption.start) / wordsArr.length;
                const wStart = activeCaption.start + wordIndex * chunkDur;
                const wEnd = wStart + chunkDur;
                isHighlight = smoothTime >= wStart && smoothTime <= wEnd;
              }
              const isEmphasized = wordObj && wordObj.emphasis && !removeEmphasis;
              const isSpotlighted = wordObj && wordObj.spotlight && !removeEmphasis;

              const numLines = linesMode ? parseInt(linesMode.split(' ')[0]) : 1;
              const wordsPerLine = numLines > 1 ? Math.ceil(wordsArr.length / numLines) : wordsArr.length + 1;
              const isNewLine = numLines > 1 && wordIndex > 0 && wordIndex % wordsPerLine === 0;

              let wordElement;

              if (isEmphasized || isSpotlighted) {
                const styleConfig = isEmphasized ? {
                  mode: emphasisMode,
                  color: emphasisColor,
                  size: emphasisSize,
                  glow: emphasisGlow,
                  font: emphasisFont,
                  fontFace: emphasisFontFace,
                  styles: emphasisStyles,
                  stops: emphasisGradientStops,
                  angle: emphasisGradientAngle,
                  level: emphasisGradientLevel
                } : {
                  mode: spotlightMode,
                  color: spotlightColor,
                  size: spotlightSize,
                  glow: spotlightGlow,
                  font: spotlightFont,
                  fontFace: spotlightFontFace,
                  styles: spotlightStyles,
                  stops: spotlightGradientStops,
                  angle: spotlightGradientAngle,
                  level: spotlightGradientLevel
                };

                const activeFont = isEmphasized
                  ? (hoveredEmphasisFontFamily || styleConfig.font)
                  : (hoveredSpotlightFontFamily || styleConfig.font);
                const activeFontFace = isEmphasized
                  ? (hoveredEmphasisFontFace || styleConfig.fontFace)
                  : (hoveredSpotlightFontFace || styleConfig.fontFace);

                const fontCss = mapFontFaceToCss(activeFontFace);
                const sizePx = fontSize * styleConfig.size;

                let wordStyle = '';
                wordStyle += `font-size: ${sizePx}px !important;`;
                wordStyle += `font-family: ${activeFont} !important;`;
                wordStyle += `font-weight: ${styleConfig.styles.bold ? 'bold' : fontCss.fontWeight} !important;`;
                wordStyle += `font-style: ${styleConfig.styles.italic ? 'italic' : fontCss.fontStyle} !important;`;
                wordStyle += `text-decoration: ${styleConfig.styles.underline ? 'underline' : 'none'} !important;`;
                wordStyle += `text-transform: ${styleConfig.styles.uppercase ? 'uppercase' : 'none'} !important;`;

                if (styleConfig.glow) {
                  wordStyle += `text-shadow: 0 0 6px ${styleConfig.glow}, 0 0 12px ${styleConfig.glow} !important;`;
                } else if (shadowEnabled) {
                  wordStyle += `text-shadow: ${shadowCSS} !important;`;
                }

                if (strokeEnabled) {
                  wordStyle += `-webkit-text-stroke: ${strokeCSS} !important;`;
                }

                const uniqueClass = `word-emphasis-${wordIndex}`;

                if (styleConfig.mode === 'Gradient') {
                  const wordGradientStr = buildGradientStr(styleConfig.angle, styleConfig.stops);
                  if (styleConfig.level === 'char') {
                    wordElement = (
                      <span key={wordIndex} className="inline-block mr-1.5 whitespace-nowrap">
                        {word.split('').map((char, charIndex) => {
                          const charClass = `${uniqueClass}-${charIndex}`;
                          return (
                            <span key={charIndex} className={`${charClass} inline-block`}>
                              <style>{`
                                .${charClass} {
                                  ${wordStyle}
                                  background: ${wordGradientStr} !important;
                                  -webkit-background-clip: text !important;
                                  background-clip: text !important;
                                  -webkit-text-fill-color: transparent !important;
                                  color: transparent !important;
                                }
                              `}</style>
                              {char}
                            </span>
                          );
                        })}
                      </span>
                    );
                  } else {
                    wordElement = (
                      <span key={wordIndex} className={`${uniqueClass} inline-block mr-1.5`}>
                        <style>{`
                          .${uniqueClass} {
                            ${wordStyle}
                            background: ${wordGradientStr} !important;
                            -webkit-background-clip: text !important;
                            background-clip: text !important;
                            -webkit-text-fill-color: transparent !important;
                            color: transparent !important;
                          }
                        `}</style>
                        {word}
                      </span>
                    );
                  }
                } else {
                  wordStyle += `color: ${styleConfig.color} !important;`;
                  wordElement = (
                    <span key={wordIndex} className={`${uniqueClass} inline-block mr-1.5`}>
                      <style>{`
                        .${uniqueClass} {
                          ${wordStyle}
                        }
                      `}</style>
                      {word}
                    </span>
                  );
                }
              } else if (colorToggle === 'Gradient') {
                if (gradientLevel === 'char') {
                  wordElement = (
                    <span key={wordIndex} className="inline-block mr-1.5 whitespace-nowrap">
                      {word.split('').map((char, charIndex) => {
                        const uniqueClass = `char-grad-${wordIndex}-${charIndex}`;
                        return (
                          <span key={charIndex} className={`${uniqueClass} inline-block`}>
                            <style>{`
                              .${uniqueClass} {
                                background: ${gradientString} !important;
                                -webkit-background-clip: text !important;
                                background-clip: text !important;
                                -webkit-text-fill-color: transparent !important;
                                color: transparent !important;
                                text-shadow: ${shadowEnabled ? shadowCSS : 'none'} !important;
                                -webkit-text-stroke: ${strokeEnabled ? strokeCSS : 'none'} !important;
                              }
                            `}</style>
                            {char}
                          </span>
                        );
                      })}
                    </span>
                  );
                } else {
                  const uniqueClass = `word-grad-${wordIndex}`;
                  wordElement = (
                    <span key={wordIndex} className={`${uniqueClass} inline-block mr-1.5`}>
                      <style>{`
                        .${uniqueClass} {
                          background: ${gradientString} !important;
                          -webkit-background-clip: text !important;
                          background-clip: text !important;
                          -webkit-text-fill-color: transparent !important;
                          color: transparent !important;
                          text-shadow: ${shadowEnabled ? shadowCSS : 'none'} !important;
                          -webkit-text-stroke: ${strokeEnabled ? strokeCSS : 'none'} !important;
                        }
                      `}</style>
                      {word}
                    </span>
                  );
                }
              } else {
                const uniqueClass = `word-solid-${wordIndex}`;
                wordElement = (
                  <span key={wordIndex} className={`${uniqueClass} inline-block mr-1.5`}>
                    <style>{`
                      .${uniqueClass} {
                        color: ${isHighlight ? '#52c595' : color} !important;
                        text-shadow: ${shadowEnabled ? shadowCSS : '0px 2px 4px rgba(0,0,0,0.95), 0px 4px 10px rgba(0,0,0,0.5)'} !important;
                        -webkit-text-stroke: ${strokeEnabled ? strokeCSS : 'none'} !important;
                      }
                    `}</style>
                    {word}
                  </span>
                );
              }

              return (
                <React.Fragment key={wordIndex}>
                  {isNewLine && <div className="basis-full h-0" />}
                  {wordElement}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : <div />}

      <div className="flex flex-col bg-[#161618] border-t border-[#2a2a2d] pointer-events-auto">
        <div ref={timelineRef} className="w-full h-1.5 bg-zinc-800 hover:h-2.5 transition-all cursor-pointer relative group/timeline" onMouseDown={handleTimelineMouseDown}>
          <div className="absolute top-0 bottom-0 left-0 bg-[#52c595]" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border border-zinc-950 shadow-md opacity-0 group-hover/timeline:opacity-100 transition-opacity" style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 7px)`, opacity: isSeeking ? 1 : undefined }} />
        </div>
        <div className="h-14 flex items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <button onClick={togglePaused} className="text-[#e0e0e0] hover:text-white transition-colors p-1">{paused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}</button>

            <div className="relative flex items-center group/volume h-8">
              <div className="flex items-center bg-transparent group-hover/volume:bg-[#2a2a2d] rounded-full transition-all overflow-hidden w-6 group-hover/volume:w-24">
                <button
                  onClick={toggleMute}
                  className="text-[#e0e0e0] hover:text-white transition-colors p-1 shrink-0 w-6 flex items-center justify-center z-10"
                >
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className={`w-4 h-4 ${!muted && volume > 0 ? 'text-[#52c595]' : ''}`} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    if (val > 0 && muted) toggleMute();
                    else if (val === 0 && !muted) toggleMute();
                  }}
                  className="w-16 h-1 ml-1 appearance-none bg-zinc-600 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer opacity-0 group-hover/volume:opacity-100 transition-opacity delay-75 shrink-0"
                  style={{
                    background: `linear-gradient(to right, white ${(muted ? 0 : volume) * 100}%, #52525b ${(muted ? 0 : volume) * 100}%)`
                  }}
                />
              </div>
            </div>

            <span className="text-xs font-medium text-zinc-400 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>
          <button className="text-[#e0e0e0] hover:text-white transition-colors p-1"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

export function VideoPlayer({
  videoUrl,
  captions,
  fontFamily,
  fontFace,
  hoveredFontFamily,
  hoveredFontFace,
  fontSize,
  styleFlags,
  casing,
  textAlign,
  position,
  setPosition,
  colorToggle,
  color,
  gradientStops,
  gradientAngle,
  gradientLevel,
  // EFFECTS props
  shadowEnabled,
  shadowColor,
  shadowOpacity,
  shadowX,
  shadowY,
  shadowBlur,
  strokeEnabled,
  strokeColor,
  strokeOpacity,
  strokeWidth,
  bgEnabled,
  bgColor,
  bgOpacity,
  bgRadius,
  bgWidth,
  bgHeight,
  bgShadowEnabled,
  bgOutlineEnabled,
  letterSpacing,
  lineSpacing,
  activeCaptionId,
  setActiveCaptionId,
  seekRef,
  linesMode,
  currentTimeRef,
  durationRef,
  aiAudioClean,

  emphasisMode,
  emphasisColor,
  emphasisSize,
  emphasisGlow,
  emphasisFont,
  emphasisFontFace,
  emphasisStyles,
  emphasisGradientStops,
  emphasisGradientAngle,
  emphasisGradientLevel,
  spotlightMode,
  spotlightColor,
  spotlightSize,
  spotlightGlow,
  spotlightFont,
  spotlightFontFace,
  spotlightStyles,
  spotlightGradientStops,
  spotlightGradientAngle,
  spotlightGradientLevel,
  removeEmphasis
}: any) {
  return (
    <Panel defaultSize={30} minSize={20} className="flex flex-col bg-[#0f0f11] relative overflow-hidden rounded-xl border border-[#2a2a2d] custom-player-wrapper">
      <div className="flex-1 flex items-center justify-center min-h-0 w-full h-full relative">
        {videoUrl ? (
          <div className="absolute inset-0 w-full h-full player-media-container">
            <LimeplayPlayer mediaProps={{ src: videoUrl ?? undefined, className: "relative z-10", crossOrigin: "anonymous" }} layout="fill" theme="dark" className="absolute inset-0 w-full h-full">
              <CustomPlayerUI
                captions={captions}
                fontFamily={fontFamily}
                fontFace={fontFace}
                hoveredFontFamily={hoveredFontFamily}
                hoveredFontFace={hoveredFontFace}
                fontSize={fontSize}
                styleFlags={styleFlags}
                casing={casing}
                textAlign={textAlign}
                position={position}
                setPosition={setPosition}
                colorToggle={colorToggle}
                color={color}
                gradientStops={gradientStops}
                gradientAngle={gradientAngle}
                gradientLevel={gradientLevel}
                shadowEnabled={shadowEnabled}
                shadowColor={shadowColor}
                shadowOpacity={shadowOpacity}
                shadowX={shadowX}
                shadowY={shadowY}
                shadowBlur={shadowBlur}
                strokeEnabled={strokeEnabled}
                strokeColor={strokeColor}
                strokeOpacity={strokeOpacity}
                strokeWidth={strokeWidth}
                bgEnabled={bgEnabled}
                bgColor={bgColor}
                bgOpacity={bgOpacity}
                bgRadius={bgRadius}
                bgWidth={bgWidth}
                bgHeight={bgHeight}
                bgShadowEnabled={bgShadowEnabled}
                bgOutlineEnabled={bgOutlineEnabled}
                letterSpacing={letterSpacing}
                lineSpacing={lineSpacing}
                activeCaptionId={activeCaptionId}
                setActiveCaptionId={setActiveCaptionId}
                seekRef={seekRef}
                linesMode={linesMode}
                currentTimeRef={currentTimeRef}
                durationRef={durationRef}
                aiAudioClean={aiAudioClean}

                emphasisMode={emphasisMode}
                emphasisColor={emphasisColor}
                emphasisSize={emphasisSize}
                emphasisGlow={emphasisGlow}
                emphasisFont={emphasisFont}
                emphasisFontFace={emphasisFontFace}
                emphasisStyles={emphasisStyles}
                emphasisGradientStops={emphasisGradientStops}
                emphasisGradientAngle={emphasisGradientAngle}
                emphasisGradientLevel={emphasisGradientLevel}
                spotlightMode={spotlightMode}
                spotlightColor={spotlightColor}
                spotlightSize={spotlightSize}
                spotlightGlow={spotlightGlow}
                spotlightFont={spotlightFont}
                spotlightFontFace={spotlightFontFace}
                spotlightStyles={spotlightStyles}
                spotlightGradientStops={spotlightGradientStops}
                spotlightGradientAngle={spotlightGradientAngle}
                spotlightGradientLevel={spotlightGradientLevel}
                removeEmphasis={removeEmphasis}
              />
            </LimeplayPlayer>
          </div>
        ) : (
          <div className="w-full h-full relative bg-[#1a1a1c] flex flex-col justify-between">
            <div className="h-14 flex items-center justify-between px-4 bg-[#161618] border-b border-[#2a2a2d]">
              <button className="flex items-center gap-2 text-xs font-semibold bg-[#2a2a2d] text-white px-3 py-1.5 rounded opacity-50 cursor-not-allowed">
                <RefreshCw className="w-3.5 h-3.5 text-[#52c595]" /> Replace
              </button>
              <div className="flex items-center gap-2 text-[10px] font-semibold bg-[#2a2a2d] text-[#8a8a8e] px-3 py-1.5 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623]"></div> Low-res
              </div>
            </div>

            {/* Mock Video Image */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none py-14">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800" alt="Video Preview" className="max-h-full max-w-full object-contain opacity-40" />
            </div>

            {/* Mock Bottom Bar */}
            <div className="h-14 flex items-center justify-between px-5 bg-[#161618] border-t border-[#2a2a2d] z-10">
              <div className="flex items-center gap-4">
                <button className="text-zinc-500 p-1 cursor-not-allowed">
                  <Play className="w-4 h-4 fill-current" />
                </button>
                <button className="text-zinc-500 p-1 cursor-not-allowed">
                  <Volume2 className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-zinc-600 font-mono">
                  00:00:00 / 00:00:00
                </span>
              </div>
              <button className="text-zinc-500 p-1 cursor-not-allowed">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
