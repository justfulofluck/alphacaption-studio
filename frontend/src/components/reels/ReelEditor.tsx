import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Type, Music, Play, Search, RotateCcw, Home, Upload,
  Volume2, Maximize, Settings, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Scissors, ChevronLeft, ChevronRight, Trash2, ZoomIn, SplitSquareHorizontal, RefreshCw, TypeOutline,
  X, ChevronUp, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Link } from 'react-router-dom';
import { VideoPlayer } from './VideoPlayer';
import { API_BASE_URL } from '@/api/config';
import { useTimelineStore } from '@/hooks/limeplay/use-timeline';

// HSV to HEX conversion helper
function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const i = Math.floor((h / 60) % 6);
  const f = (h / 60) - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// HEX to HSV conversion helper
function hexToHsv(hexStr: string): { h: number; s: number; v: number } {
  let hex = hexStr;
  if (!hex || hex[0] !== '#') hex = '#FFFFFF';
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16) / 255;
    g = parseInt(hex.substring(3, 5), 16) / 255;
    b = parseInt(hex.substring(5, 7), 16) / 255;
  }
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: Math.round(h * 360), s: Math.round(s), v: Math.round(v) };
}

interface CustomColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const CustomColorPicker: React.FC<CustomColorPickerProps> = ({ color, onChange }) => {
  const hsv = hexToHsv(color);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);

  // Sync state if color prop changes externally
  useEffect(() => {
    const nextHsv = hexToHsv(color);
    setHue(nextHsv.h);
    setSat(nextHsv.s);
    setVal(nextHsv.v);
  }, [color]);

  const handleSvMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const updatePosition = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      setSat(s);
      setVal(v);
      onChange(hsvToHex(hue, s, v));
    };

    updatePosition(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleHueMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const updateHue = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;
      setHue(h);
      onChange(hsvToHex(h, sat, val));
    };

    updateHue(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateHue(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="w-[180px] bg-[#161618] border border-[#2a2a2d] rounded-lg p-2 flex flex-col gap-2 select-none shadow-2xl relative z-50">
      {/* Saturation-Value Canvas */}
      <div 
        onMouseDown={handleSvMouseDown}
        className="w-full h-[110px] rounded relative cursor-crosshair overflow-hidden border border-[#2a2a2d]"
        style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
      >
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        
        {/* SV Drag Marker */}
        <div 
          className="absolute w-3 h-3 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`
          }}
        />
      </div>

      {/* Hue Slider */}
      <div 
        onMouseDown={handleHueMouseDown}
        className="w-full h-2.5 rounded-full relative cursor-ew-resize overflow-hidden border border-[#2a2a2d]"
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
        }}
      >
        {/* Hue Drag Marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-950 rounded-full shadow cursor-pointer"
          style={{ left: `calc(${(hue / 360) * 100}% + 6px - (${hue / 360} * 12px))` }}
        />
      </div>

      {/* Preview Bar */}
      <div className="flex items-center justify-between mt-0.5 px-0.5">
        <div className="w-4 h-4 rounded border border-[#2a2a2d]" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-mono text-[#8a8a8e] uppercase tracking-wider">{color}</span>
      </div>
    </div>
  );
};

interface StopColorPickerProps {
  color: string;
  opacity: number;
  positionPercent: number;
  onColorChange: (color: string) => void;
  onOpacityChange: (opacity: number) => void;
  onPositionChange: (pos: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const StopColorPicker: React.FC<StopColorPickerProps> = ({
  color,
  opacity,
  positionPercent,
  onColorChange,
  onOpacityChange,
  onPositionChange,
  onRemove,
  canRemove
}) => {
  const hsv = hexToHsv(color);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);
  const [posInput, setPosInput] = useState((positionPercent / 100).toFixed(3));

  useEffect(() => {
    const nextHsv = hexToHsv(color);
    setHue(nextHsv.h);
    setSat(nextHsv.s);
    setVal(nextHsv.v);
  }, [color]);

  useEffect(() => {
    setPosInput((positionPercent / 100).toFixed(3));
  }, [positionPercent]);

  const handleSvMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const updatePosition = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round((1 - y / rect.height) * 100);
      setSat(s);
      setVal(v);
      onColorChange(hsvToHex(hue, s, v));
    };

    updatePosition(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleHueMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const updateHue = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const h = Math.round((x / rect.width) * 360) % 360;
      setHue(h);
      onColorChange(hsvToHex(h, sat, val));
    };

    updateHue(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateHue(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="w-[180px] bg-[#161618] border border-[#2a2a2d] rounded-lg p-2.5 flex flex-col gap-2 select-none shadow-2xl relative z-50">
      {/* Saturation-Value Canvas */}
      <div 
        onMouseDown={handleSvMouseDown}
        className="w-full h-[110px] rounded relative cursor-crosshair overflow-hidden border border-[#2a2a2d]"
        style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
      >
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        
        {/* SV Drag Marker */}
        <div 
          className="absolute w-3 h-3 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`
          }}
        />
      </div>

      {/* Hue Slider */}
      <div 
        onMouseDown={handleHueMouseDown}
        className="w-full h-2.5 rounded-full relative cursor-ew-resize overflow-hidden border border-[#2a2a2d]"
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
        }}
      >
        {/* Hue Drag Marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-950 rounded-full shadow cursor-pointer"
          style={{ left: `calc(${(hue / 360) * 100}% + 6px - (${hue / 360} * 12px))` }}
        />
      </div>

      {/* Opacity Slider */}
      <div className="flex flex-col gap-1 mt-1">
        <div className="flex items-center justify-between text-[10px] text-[#8a8a8e]">
          <span>Opacity</span>
          <span>{opacity}%</span>
        </div>
        <input 
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => onOpacityChange(parseInt(e.target.value))}
          className="w-full accent-[#52c595] cursor-pointer h-1 bg-[#2a2a2d] rounded-lg appearance-none"
        />
      </div>

      {/* Position Input */}
      <div className="flex items-center justify-between text-[10px] text-[#8a8a8e] mt-1.5">
        <span>Position</span>
        <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded px-1.5 py-0.5 w-16 text-center font-mono text-white text-[10px]">
          <input 
            type="text"
            value={posInput}
            onChange={(e) => {
              const valStr = e.target.value;
              setPosInput(valStr);
              const val = parseFloat(valStr);
              if (!isNaN(val)) {
                onPositionChange(Math.max(0, Math.min(100, Math.round(val * 100))));
              }
            }}
            onBlur={() => setPosInput((positionPercent / 100).toFixed(3))}
            className="bg-transparent text-center text-white outline-none w-full border-none p-0"
          />
        </div>
      </div>

      {/* Remove stop button */}
      {canRemove && (
        <button 
          onClick={onRemove}
          className="w-full flex items-center justify-center gap-1.5 text-[10px] text-red-500 hover:text-red-400 hover:bg-red-500/10 py-1 mt-2 border border-red-500/20 rounded transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Remove stop
        </button>
      )}
    </div>
  );
};

interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onHoverChange?: (val: string | null) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, onHoverChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs font-medium text-white flex items-center justify-between outline-none focus:border-[#52c595] text-left min-h-[32px] select-none"
      >
        <span>{value}</span>
        {/* Simple inline CSS up/down arrow matching screenshot 2 */}
        <div className="flex flex-col text-[8px] text-zinc-500 leading-[6px]">
          <span>▲</span>
          <span>▼</span>
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-[#161618] border border-[#2a2a2d] rounded-md shadow-2xl z-50 py-1 scrollbar-thin">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                if (onHoverChange) onHoverChange(null);
                setIsOpen(false);
              }}
              onMouseEnter={() => onHoverChange && onHoverChange(option)}
              onMouseLeave={() => onHoverChange && onHoverChange(null)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[#2a2a2d] hover:text-white ${option === value ? 'bg-[#52c595]/20 text-[#52c595] font-semibold' : 'text-[#8a8a8e]'}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

import { useEffect } from 'react';

export function ReelEditor() {
  const [activeTabLeft, setActiveTabLeft] = useState('captions');
  const [activeTabRight, setActiveTabRight] = useState('text');
  const [wordLineToggle, setWordLineToggle] = useState('WORD');
  const [colorToggle, setColorToggle] = useState('Solid');
  const [videoUrl, setVideoUrl] = useState<string | null>(
    `${API_BASE_URL}/api/projects/video/2/1781779200_20260626_125926.mp4`
  );

  // Style states
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontFace, setFontFace] = useState('Bold');
  const [hoveredFontFamily, setHoveredFontFamily] = useState<string | null>(null);
  const [hoveredFontFace, setHoveredFontFace] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(41);
  const [styleFlags, setStyleFlags] = useState({ underline: false });
  const [casing, setCasing] = useState<'none' | 'capitalize' | 'uppercase' | 'lowercase'>('none');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [position, setPosition] = useState({ x: 50.0, y: 65.0 });
  const [color, setColor] = useState('#FFFFFF');

  const [inputX, setInputX] = useState(position.x.toFixed(1));
  const [inputY, setInputY] = useState(position.y.toFixed(1));

  useEffect(() => {
    setInputX(position.x.toFixed(1));
  }, [position.x]);

  useEffect(() => {
    setInputY(position.y.toFixed(1));
  }, [position.y]);

  const [inputColor, setInputColor] = useState(color);

  useEffect(() => {
    setInputColor(color);
  }, [color]);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const stopsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (stopsContainerRef.current && !stopsContainerRef.current.contains(e.target as Node)) {
        setOpenStopPickerId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [gradientStops, setGradientStops] = useState([
    { id: 1, position: 0, color: '#8a7300', opacity: 100 },
    { id: 2, position: 45, color: '#d4ca8e', opacity: 100 },
    { id: 3, position: 55, color: '#fffdf0', opacity: 100 },
    { id: 4, position: 100, color: '#8a7300', opacity: 100 }
  ]);
  const [activeStopId, setActiveStopId] = useState<number>(1);
  const [openStopPickerId, setOpenStopPickerId] = useState<number | null>(null);
  const [gradientAngle, setGradientAngle] = useState(90);
  const [gradientLevel, setGradientLevel] = useState<'word' | 'char'>('word');
  const [inputAngle, setInputAngle] = useState('90');

  // EFFECTS section states
  // Drop Shadow
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowOpacity, setShadowOpacity] = useState(63);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(0);
  const [shadowBlur, setShadowBlur] = useState(13);
  
  // Text Stroke
  const [strokeEnabled, setStrokeEnabled] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeOpacity, setStrokeOpacity] = useState(100);
  const [strokeWidth, setStrokeWidth] = useState(1);

  // Background
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');
  const [bgOpacity, setBgOpacity] = useState(100);
  const [bgRadius, setBgRadius] = useState(24);
  const [bgWidth, setBgWidth] = useState(48);
  const [bgHeight, setBgHeight] = useState(24);
  const [bgShadowEnabled, setBgShadowEnabled] = useState(false);
  const [bgOutlineEnabled, setBgOutlineEnabled] = useState(false);

  // Custom Color Picker popups toggles inside effects
  const [showShadowColorPicker, setShowShadowColorPicker] = useState(false);
  const [showStrokeColorPicker, setShowStrokeColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  // SPACING section states
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineSpacing, setLineSpacing] = useState(1.2);

  // Upload and transcription states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [uploadStage, setUploadStage] = useState<'idle' | 'upload' | 'processing' | 'transcribing' | 'success' | 'error'>('idle');
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Timeline & active word selection states
  const [activeCaptionId, setActiveCaptionId] = useState<number | null>(null);
  const seekRef = useRef<(time: number) => void>(null);
  const [wordMenu, setWordMenu] = useState<{
    captionId: number;
    wordIndex: number;
    word: string;
    x: number;
    y: number;
    openUpwards?: boolean;
  } | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<number | null>(null);
  const [editingWord, setEditingWord] = useState<{
    captionId: number;
    wordIndex: number;
    text: string;
  } | null>(null);

  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  const shadowColorRef = useRef<HTMLDivElement>(null);
  const strokeColorRef = useRef<HTMLDivElement>(null);
  const bgColorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shadowColorRef.current && !shadowColorRef.current.contains(e.target as Node)) {
        setShowShadowColorPicker(false);
      }
      if (strokeColorRef.current && !strokeColorRef.current.contains(e.target as Node)) {
        setShowStrokeColorPicker(false);
      }
      if (bgColorRef.current && !bgColorRef.current.contains(e.target as Node)) {
        setShowBgColorPicker(false);
      }
      // Close word context menu on any outside click
      const menuEl = document.getElementById('word-context-menu');
      if (menuEl && !menuEl.contains(e.target as Node)) {
        setWordMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    setInputAngle(gradientAngle.toString());
  }, [gradientAngle]);

  const handleSelectStop = (id: number) => {
    setActiveStopId(id);
  };

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    fonts: true,
    format: true,
    position: true,
    color: true,
    emphasis: false,
    spacing: false,
    effects: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [captions, setCaptions] = useState([
    { id: 1, start: 0.0, end: 2.5, text: "Hello and welcome to Kalakaar. As" },
    { id: 2, start: 2.5, end: 4.8, text: "you can see, we have captions on" },
    { id: 3, start: 4.8, end: 7.2, text: "screen that are in English language. If" },
    { id: 4, start: 7.2, end: 9.5, text: "you want to see how captions will" },
    { id: 5, start: 9.5, end: 12.0, text: "look in your language, just pick your" },
    { id: 6, start: 12.0, end: 14.5, text: "language from the left side on the" },
    { id: 7, start: 14.5, end: 17.0, text: "screen and you'd be able to see those" },
    { id: 8, start: 17.0, end: 20.0, text: "subtitles." }
  ]);

  const handleCaptionChange = (id: number, newText: string) => {
    setCaptions(captions.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  const allMatches = React.useMemo(() => {
    if (!searchQuery) return [];
    const matches: { captionId: number, matchStringIndex: number, matchLength: number, wordIndices: number[] }[] = [];
    try {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');
      
      captions.forEach((caption) => {
        const found = [...caption.text.matchAll(regex)];
        
        const words = caption.text.split(/\s+/);
        const wordBounds: {start: number, end: number}[] = [];
        let currentIndex = 0;
        words.forEach(w => {
           const start = caption.text.indexOf(w, currentIndex);
           const end = start + w.length;
           wordBounds.push({ start, end });
           currentIndex = end;
        });

        found.forEach((m) => {
          const matchStart = m.index || 0;
          const matchEnd = matchStart + m[0].length;
          
          const overlappingWords: number[] = [];
          wordBounds.forEach((bound, wIdx) => {
            if (bound.end > matchStart && bound.start < matchEnd) {
              overlappingWords.push(wIdx);
            }
          });
          
          matches.push({
             captionId: caption.id,
             matchStringIndex: matchStart,
             matchLength: m[0].length,
             wordIndices: overlappingWords
          });
        });
      });
    } catch {}
    return matches;
  }, [captions, searchQuery]);

  useEffect(() => {
    if (allMatches.length > 0 && currentMatchIndex < allMatches.length) {
      const match = allMatches[currentMatchIndex];
      if (match.wordIndices.length > 0) {
        const firstWordIdx = match.wordIndices[0];
        const el = document.getElementById(`word-${match.captionId}-${firstWordIdx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentMatchIndex, allMatches]);

  const handlePrevMatch = () => {
    setCurrentMatchIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, allMatches.length - 1)));
  };

  const handleNextMatch = () => {
    setCurrentMatchIndex(prev => (prev < allMatches.length - 1 ? prev + 1 : 0));
  };

  const handleReplace = () => {
    if (!searchQuery || allMatches.length === 0) return;
    const match = allMatches[currentMatchIndex];
    if (!match) return;

    const captionIndex = captions.findIndex(c => c.id === match.captionId);
    if (captionIndex !== -1) {
      const targetCaption = captions[captionIndex];
      const newText = 
        targetCaption.text.substring(0, match.matchStringIndex) + 
        replaceQuery + 
        targetCaption.text.substring(match.matchStringIndex + match.matchLength);
        
      const newCaptions = [...captions];
      newCaptions[captionIndex] = {
        ...targetCaption,
        text: newText
      };
      setCaptions(newCaptions);
      
      if (currentMatchIndex >= allMatches.length - 1) {
        setCurrentMatchIndex(Math.max(0, currentMatchIndex - 1));
      }
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    try {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');
      const newCaptions = captions.map(c => ({
        ...c,
        text: c.text.replace(regex, replaceQuery)
      }));
      setCaptions(newCaptions);
    } catch (e) {
      console.error("Invalid search query", e);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingError(null);
    setUploadProgress(0);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mp4' && ext !== 'webm') {
      setProcessingError('Format not supported. Only MP4 and WebM video formats are allowed.');
      setUploadStage('error');
      e.target.value = '';
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setProcessingError('File size exceeds 100MB limit. Please choose a smaller video file.');
      setUploadStage('error');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('name', file.name);

    setIsUploading(true);
    setUploadProgress(0);
    setTranscribing(false);
    setUploadStage('upload');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/projects/upload-video`);
    const token = localStorage.getItem('auth_token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadStage('processing');
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('Video uploaded successfully:', data);
          
          if (data.video_url) {
            const pathOnly = data.video_url.replace(/^https?:\/\/[^\/]+/, '');
            setVideoUrl(`${API_BASE_URL}${pathOnly}`);
          }
          
          // Now trigger transcription automatically
          setTranscribing(true);
          setUploadStage('transcribing');
          const transcribeResponse = await fetch(`${API_BASE_URL}/api/captions/${data.id}/transcribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ mode: 'native_language' })
          });
          
          if (!transcribeResponse.ok) {
            throw new Error('Transcription failed');
          }
          
          const transcribeData = await transcribeResponse.json();
          console.log('Transcription successful:', transcribeData);
          
          // Sync new captions with editor
          if (transcribeData.segments) {
            setCaptions(transcribeData.segments);
          }
          
          setUploadStage('success');
        } catch (err: any) {
          console.error('Processing error:', err);
          setProcessingError(err?.message || 'Failed to process and transcribe video.');
          setUploadStage('error');
        } finally {
          setIsUploading(false);
          setTranscribing(false);
          e.target.value = '';
        }
      } else {
        setProcessingError('Upload failed. Please check your network connection and try again.');
        setUploadStage('error');
        setIsUploading(false);
        e.target.value = '';
      }
    };

    xhr.onerror = () => {
      setProcessingError('Network error occurred during file upload.');
      setUploadStage('error');
      setIsUploading(false);
      e.target.value = '';
    };

    xhr.send(formData);
  };

  return (
    <div className="relative flex h-full w-full bg-[#000000] text-[#e0e0e0] font-sans overflow-hidden">
      
      {/* Upload and Transcription Progress Overlay */}
      {uploadStage !== 'idle' && (
        <div className="absolute inset-0 bg-[#0f0f11]/95 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-[360px] bg-[#161618] border border-[#2a2a2d] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl">
            {uploadStage === 'success' ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-[#52c595]/15 flex items-center justify-center text-[#52c595] text-xl font-bold">
                  ✓
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-white text-lg">Process Complete</h3>
                  <p className="text-xs text-[#8a8a8e]">Your video has been successfully transcribed!</p>
                </div>
                <button
                  onClick={() => setUploadStage('idle')}
                  className="mt-2 w-full py-2 bg-[#52c595] hover:bg-[#43b384] text-black font-semibold text-xs rounded-lg transition-colors focus:outline-none"
                >
                  Okay
                </button>
              </div>
            ) : uploadStage === 'error' ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center text-red-500 text-xl font-bold">
                  !
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-white text-lg">Processing Failed</h3>
                  <p className="text-xs text-red-400 px-4 leading-relaxed">{processingError || 'Something went wrong. Please try again.'}</p>
                </div>
                <button
                  onClick={() => setUploadStage('idle')}
                  className="mt-2 w-full py-2 bg-[#2a2a2d] hover:bg-[#3a3a3d] text-white font-semibold text-xs rounded-lg transition-colors focus:outline-none border border-white/5"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2">
                  <h3 className="font-bold text-white text-lg">Processing Video</h3>
                  <p className="text-xs text-[#8a8a8e]">Please keep this window open</p>
                </div>
                
                <div className="flex flex-col gap-4 border-t border-[#2a2a2d] pt-4">
                  {/* Step 1: Uploading */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {uploadStage === 'upload' ? (
                          <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#52c595] rounded-full animate-spin" />
                        ) : (
                          <span className="text-[#52c595] font-bold text-sm">✓</span>
                        )}
                      </div>
                      <span className={uploadStage === 'upload' ? 'text-white font-medium' : 'text-[#8a8a8e]'}>
                        Uploading Video File
                      </span>
                    </div>
                    {uploadStage === 'upload' && (
                      <span className="text-[#52c595] font-mono font-semibold">{uploadProgress}%</span>
                    )}
                  </div>

                  {/* Progress bar only visible during upload */}
                  {uploadStage === 'upload' && (
                    <div className="w-full bg-[#2a2a2d] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#52c595] h-full rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Step 2: Audio Extraction & Conversion */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {uploadStage === 'upload' ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2a2a2d]" />
                        ) : uploadStage === 'processing' ? (
                          <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#52c595] rounded-full animate-spin" />
                        ) : (
                          <span className="text-[#52c595] font-bold text-sm">✓</span>
                        )}
                      </div>
                      <span className={uploadStage === 'processing' ? 'text-white font-medium' : 'text-[#8a8a8e]'}>
                        Extracting Audio & Processing Video
                      </span>
                    </div>
                  </div>

                  {/* Step 3: Transcription */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {uploadStage === 'transcribing' ? (
                          <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#52c595] rounded-full animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2a2a2d]" />
                        )}
                      </div>
                      <span className={uploadStage === 'transcribing' ? 'text-white font-medium' : 'text-[#8a8a8e]'}>
                        AI Transcription & Timing Sync
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full p-2">
        <PanelGroup orientation="horizontal">
          
          {/* LEFT COLUMN: Captions + Timeline */}
          <Panel defaultSize={35} minSize={20} className="flex flex-col">
            <PanelGroup orientation="vertical">
              
              {/* TOP: Captions List */}
              <Panel defaultSize={80} minSize={30} className="flex flex-row overflow-hidden relative rounded-xl border border-[#2a2a2d] bg-[#1a1a1c]">
                
                {/* Vertical Menu (Moved inside) */}
                <div className="w-[72px] flex flex-col items-center py-6 gap-8 border-r border-[#2a2a2d] bg-[#161618] h-full shrink-0 z-20">
                  <Link 
                    to="/dashboard"
                    className="flex flex-col items-center gap-1.5 transition-colors text-[#8a8a8e] hover:text-[#e0e0e0]"
                  >
                    <div className="p-2 rounded-lg hover:bg-[#2a2a2d]">
                      <Home className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium">Home</span>
                  </Link>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center gap-1.5 transition-colors text-[#8a8a8e] hover:text-[#e0e0e0]`}
                  >
                    <div className="p-2 rounded-lg hover:bg-[#2a2a2d]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium">Upload</span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="video/mp4,video/webm" 
                      onChange={handleVideoUpload} 
                    />
                  </button>
                  <button 
                    onClick={() => setActiveTabLeft('captions')}
                    className={`flex flex-col items-center gap-1.5 transition-colors ${activeTabLeft === 'captions' ? 'text-[#52c595]' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                  >
                    <div className={`p-2 rounded-lg ${activeTabLeft === 'captions' ? 'bg-[#52c595]/10' : ''}`}>
                      <SplitSquareHorizontal className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-none">Captions</span>
                  </button>
                  <button 
                    onClick={() => setActiveTabLeft('fonts')}
                    className={`flex flex-col items-center gap-1.5 transition-colors ${activeTabLeft === 'fonts' ? 'text-[#52c595]' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                  >
                    <div className={`p-2 rounded-lg ${activeTabLeft === 'fonts' ? 'bg-[#52c595]/10' : ''}`}>
                      <Type className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight">Custom<br/>Fonts</span>
                  </button>
                  <button 
                    onClick={() => setActiveTabLeft('audio')}
                    className={`flex flex-col items-center gap-1.5 transition-colors relative ${activeTabLeft === 'audio' ? 'text-[#52c595]' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                  >
                    <span className="absolute -top-3 text-[8px] bg-[#2a2a2d] px-1 rounded text-[#8a8a8e]">Soon</span>
                    <div className={`p-2 rounded-lg ${activeTabLeft === 'audio' ? 'bg-[#52c595]/10' : ''}`}>
                      <Music className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-none">Audio</span>
                  </button>
                </div>

                {/* Sub-container holding the actual captions content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Header */}
                  <div className="h-[60px] px-5 flex justify-between items-center border-b border-[#2a2a2d]">
                    <h2 className="font-bold text-lg text-white">Captions</h2>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowSearchReplace(!showSearchReplace)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showSearchReplace ? 'bg-[#52c595] text-[#111111]' : 'bg-[#2a2a2d] hover:bg-[#3a3a3d] text-[#8a8a8e]'}`}
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button className="h-8 px-3 rounded-md bg-[#2a2a2d] hover:bg-[#3a3a3d] flex items-center gap-2 text-[#52c595] text-xs font-semibold transition-colors border border-[#52c595]/20">
                      <Settings className="w-3.5 h-3.5" /> Caption Tools 
                    </button>
                  </div>
                </div>

                {/* Search & Replace Panel */}
                {showSearchReplace && (
                  <div className="m-4 bg-[#111111] border border-[#2a2a2d] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center text-[#8a8a8e] text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Search className="w-3.5 h-3.5" />
                        FIND & REPLACE
                      </div>
                      <button onClick={() => setShowSearchReplace(false)} className="hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-[#8a8a8e] uppercase tracking-wider">Find</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search captions..."
                          className="w-full bg-transparent border border-[#52c595] rounded-lg pl-3 pr-24 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#52c595]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs text-[#8a8a8e]">
                          <span>Aa</span>
                          <span>{allMatches.length > 0 ? `${currentMatchIndex + 1}/${allMatches.length}` : '0/0'}</span>
                          <div className="flex gap-1">
                            <ChevronUp onClick={handlePrevMatch} className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" />
                            <ChevronDown onClick={handleNextMatch} className="w-3.5 h-3.5 cursor-pointer hover:text-white transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-[#8a8a8e] uppercase tracking-wider">Replace With</span>
                      <input
                        type="text"
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        placeholder="Type replacement..."
                        className="w-full bg-[#1a1a1c] border border-[#2a2a2d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#52c595] transition-colors"
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      {searchQuery && allMatches.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#52c595] font-semibold">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#52c595]" /> {allMatches.length} matches available
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8a8a8e] italic">Enter text to search</span>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={handleReplaceAll}
                          disabled={!searchQuery || allMatches.length === 0}
                          className="px-4 py-1.5 rounded-md border border-[#2a2a2d] text-white text-xs font-semibold hover:bg-[#2a2a2d] transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          Replace All <span className="text-[10px] text-[#8a8a8e]">⌘↵</span>
                        </button>
                        <button 
                          onClick={handleReplace}
                          disabled={!searchQuery || allMatches.length === 0}
                          className="px-6 py-1.5 rounded-md bg-[#52c595] hover:bg-[#43b384] text-[#111111] text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          Replace <span>↵</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                  {captions.map((caption, i) => {
                    const isActive = caption.id === activeCaptionId;
                    return (
                      <div 
                        key={caption.id} 
                        onClick={() => seekRef.current?.(caption.start)}
                        className={`flex items-start gap-4 px-5 py-4 border-b border-[#2a2a2d] hover:bg-[#222225] transition-colors group cursor-pointer ${
                          isActive ? 'bg-[#222225]/45' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center shrink-0 mt-1 w-6 h-6 select-none">
                          {isActive ? (
                            <span className="text-xs font-bold w-6 h-6 rounded-full bg-[#52c595] text-[#161618] flex items-center justify-center">
                              {i + 1}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-[#8a8a8e]">
                              {i + 1}
                            </span>
                          )}
                        </div>

                        {editingCaptionId === caption.id ? (
                          <textarea
                            value={caption.text}
                            onChange={(e) => handleCaptionChange(caption.id, e.target.value)}
                            onBlur={() => setEditingCaptionId(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingCaptionId(null);
                              }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="text-[15px] font-medium leading-relaxed text-[#e0e0e0] flex-1 bg-transparent border-none outline-none resize-none focus:ring-0 p-0 m-0 min-h-[20px]"
                            rows={Math.max(1, Math.ceil(caption.text.length / 40))}
                            style={{ overflow: 'hidden' }}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-y-1 text-[15px] font-medium leading-relaxed text-[#e0e0e0] flex-1">
                            {caption.text.split(/\s+/).map((word, wordIndex) => {
                              const isWordEditing = editingWord && editingWord.captionId === caption.id && editingWord.wordIndex === wordIndex;
                              if (isWordEditing) {
                                return (
                                  <div 
                                    key={wordIndex}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[#52c595]/50 bg-[#161618] rounded-md"
                                  >
                                    <input 
                                      type="text"
                                      value={editingWord.text}
                                      onChange={(e) => setEditingWord(prev => prev ? { ...prev, text: e.target.value } : null)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const targetCaption = captions.find(c => c.id === editingWord.captionId);
                                          if (targetCaption) {
                                            const wordsList = targetCaption.text.split(/\s+/);
                                            wordsList[editingWord.wordIndex] = editingWord.text;
                                            handleCaptionChange(editingWord.captionId, wordsList.join(' '));
                                          }
                                          setEditingWord(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingWord(null);
                                        }
                                      }}
                                      autoFocus
                                      className="bg-transparent text-white outline-none w-20 text-[15px] font-medium p-0 border-none focus:ring-0"
                                    />
                                    <button 
                                      onClick={() => {
                                        const targetCaption = captions.find(c => c.id === editingWord.captionId);
                                        if (targetCaption) {
                                          const wordsList = targetCaption.text.split(/\s+/);
                                          wordsList[editingWord.wordIndex] = editingWord.text;
                                          handleCaptionChange(editingWord.captionId, wordsList.join(' '));
                                        }
                                        setEditingWord(null);
                                      }}
                                      className="text-[#52c595] hover:text-white font-bold text-xs"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => setEditingWord(null)}
                                      className="text-red-500 hover:text-white font-bold text-xs ml-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              }
                              const isPartOfAnyMatch = allMatches.some(m => m.captionId === caption.id && m.wordIndices.includes(wordIndex));
                              const isPartOfActiveMatch = allMatches.length > 0 && currentMatchIndex < allMatches.length && 
                                                          allMatches[currentMatchIndex].captionId === caption.id && 
                                                          allMatches[currentMatchIndex].wordIndices.includes(wordIndex);

                              const matchStyle = isPartOfActiveMatch 
                                 ? 'bg-[#52c595] text-[#111111] font-bold' 
                                 : isPartOfAnyMatch 
                                    ? 'bg-[#52c595]/30 text-[#52c595]' 
                                    : 'hover:bg-white/10 hover:text-[#52c595] text-[#e0e0e0]';

                              return (
                                <span
                                  key={wordIndex}
                                  id={`word-${caption.id}-${wordIndex}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const menuHeight = 340; // rough height of the context menu
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const openUpwards = spaceBelow < menuHeight;
                                    
                                    setWordMenu({
                                      captionId: caption.id,
                                      wordIndex,
                                      word,
                                      x: rect.left,
                                      y: openUpwards ? rect.top - 5 : rect.bottom + 5,
                                      openUpwards
                                    });
                                  }}
                                  className={`px-1 py-[2px] rounded transition-all cursor-pointer ${matchStyle}`}
                                >
                                  {word}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCaptionId(caption.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8a8e] hover:text-white transition-opacity shrink-0"
                        >
                          <SplitSquareHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Word Context Menu Dropdown */}
                  {wordMenu && createPortal(
                    <div 
                      id="word-context-menu"
                      className="fixed z-[9999] w-56 bg-[#1a1a1c] border border-[#2a2a2d] rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs text-[#e0e0e0] pointer-events-auto"
                      style={{ 
                        left: `${wordMenu.x}px`, 
                        ...(wordMenu.openUpwards 
                             ? { bottom: `${window.innerHeight - wordMenu.y}px` } 
                             : { top: `${wordMenu.y}px` }) 
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => {
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-[#52c595] text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] font-semibold text-sm">⚡</span>
                        <div>
                          <p className="font-semibold text-[11px]">Emphasize</p>
                          <p className="text-[9px] text-[#8a8a8e]">Make this word stand out</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => {
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-[#52c595] text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] font-semibold text-sm">🔍</span>
                        <div>
                          <p className="font-semibold text-[11px]">Spotlight</p>
                          <p className="text-[9px] text-[#8a8a8e]">Feature for maximum impact</p>
                        </div>
                      </button>

                      <div className="h-[1px] bg-[#2a2a2d] my-0.5" />

                      <button 
                        onClick={() => {
                          setEditingWord({
                            captionId: wordMenu.captionId,
                            wordIndex: wordMenu.wordIndex,
                            text: wordMenu.word
                          });
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-white text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] text-sm">✏️</span>
                        <div>
                          <p className="font-semibold text-[11px]">Edit</p>
                          <p className="text-[9px] text-[#8a8a8e]">Modify the text</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          // Clean punctuation from word for better search experience
                          const cleanWord = wordMenu.word.replace(/[.,!?]+$/, '');
                          setSearchQuery(cleanWord);
                          setShowSearchReplace(true);
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-white text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] text-sm">🔍</span>
                        <div>
                          <p className="font-semibold text-[11px]">Search & Replace</p>
                          <p className="text-[9px] text-[#8a8a8e]">Find all occurrences</p>
                        </div>
                      </button>

                      <div className="h-[1px] bg-[#2a2a2d] my-0.5" />

                      <button 
                        onClick={() => {
                          const targetCaptionIndex = captions.findIndex(c => c.id === wordMenu.captionId);
                          if (targetCaptionIndex !== -1) {
                            const targetCaption = captions[targetCaptionIndex];
                            const words = targetCaption.text.split(/\s+/);
                            const j = wordMenu.wordIndex;
                            
                            const duration = targetCaption.end - targetCaption.start;
                            const timePerWord = duration / Math.max(1, words.length);
                            
                            const newCaptions = [];
                            
                            // Before word
                            if (j > 0) {
                              newCaptions.push({
                                id: Date.now() + 1,
                                start: targetCaption.start,
                                end: targetCaption.start + j * timePerWord,
                                text: words.slice(0, j).join(' ')
                              });
                            }
                            
                            // The word itself
                            newCaptions.push({
                              id: Date.now() + 2,
                              start: targetCaption.start + j * timePerWord,
                              end: targetCaption.start + (j + 1) * timePerWord,
                              text: words[j]
                            });
                            
                            // After word
                            if (j < words.length - 1) {
                              newCaptions.push({
                                id: Date.now() + 3,
                                start: targetCaption.start + (j + 1) * timePerWord,
                                end: targetCaption.end,
                                text: words.slice(j + 1).join(' ')
                              });
                            }
                            
                            const newCaptionsList = [...captions];
                            newCaptionsList.splice(targetCaptionIndex, 1, ...newCaptions);
                            setCaptions(newCaptionsList);
                          }
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-white text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] text-sm">🥞</span>
                        <div>
                          <p className="font-semibold text-[11px]">Split</p>
                          <p className="text-[9px] text-[#8a8a8e]">Split caption here</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          const targetCaptionIndex = captions.findIndex(c => c.id === wordMenu.captionId);
                          if (targetCaptionIndex > 0) {
                            const targetCaption = captions[targetCaptionIndex];
                            const prevCaption = captions[targetCaptionIndex - 1];
                            
                            const targetWords = targetCaption.text.split(/\s+/);
                            const wordToMove = targetWords.splice(wordMenu.wordIndex, 1)[0];
                            
                            const timePerWord = (targetCaption.end - targetCaption.start) / Math.max(1, targetWords.length + 1);
                            
                            const newCaptionsList = [...captions];
                            newCaptionsList[targetCaptionIndex - 1] = {
                              ...prevCaption,
                              text: prevCaption.text + ' ' + wordToMove,
                              end: prevCaption.end + timePerWord
                            };
                            newCaptionsList[targetCaptionIndex] = {
                              ...targetCaption,
                              text: targetWords.join(' '),
                              start: targetCaption.start + timePerWord
                            };
                            
                            if (targetWords.length === 0) {
                              newCaptionsList.splice(targetCaptionIndex, 1);
                            }
                            
                            setCaptions(newCaptionsList);
                          }
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-white text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] text-sm">⬅️</span>
                        <div>
                          <p className="font-semibold text-[11px]">Previous Line</p>
                          <p className="text-[9px] text-[#8a8a8e]">Move word to previous line</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => {
                          const targetCaptionIndex = captions.findIndex(c => c.id === wordMenu.captionId);
                          if (targetCaptionIndex !== -1 && targetCaptionIndex < captions.length - 1) {
                            const targetCaption = captions[targetCaptionIndex];
                            const nextCaption = captions[targetCaptionIndex + 1];
                            
                            const targetWords = targetCaption.text.split(/\s+/);
                            const wordToMove = targetWords.splice(wordMenu.wordIndex, 1)[0];
                            
                            const timePerWord = (targetCaption.end - targetCaption.start) / Math.max(1, targetWords.length + 1);
                            
                            const newCaptionsList = [...captions];
                            newCaptionsList[targetCaptionIndex] = {
                              ...targetCaption,
                              text: targetWords.join(' '),
                              end: targetCaption.end - timePerWord
                            };
                            newCaptionsList[targetCaptionIndex + 1] = {
                              ...nextCaption,
                              text: wordToMove + ' ' + nextCaption.text,
                              start: nextCaption.start - timePerWord
                            };
                            
                            if (targetWords.length === 0) {
                              newCaptionsList.splice(targetCaptionIndex, 1);
                            }
                            
                            setCaptions(newCaptionsList);
                          }
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#222225] hover:text-white text-left transition-all"
                      >
                        <span className="text-[#8a8a8e] text-sm">➡️</span>
                        <div>
                          <p className="font-semibold text-[11px]">Next Line</p>
                          <p className="text-[9px] text-[#8a8a8e]">Move word to next line</p>
                        </div>
                      </button>

                      <div className="h-[1px] bg-[#2a2a2d] my-0.5" />

                      <button 
                        onClick={() => {
                          const targetCaption = captions.find(c => c.id === wordMenu.captionId);
                          if (targetCaption) {
                            const wordsList = targetCaption.text.split(/\s+/);
                            wordsList.splice(wordMenu.wordIndex, 1);
                            handleCaptionChange(wordMenu.captionId, wordsList.join(' '));
                          }
                          setWordMenu(null);
                        }}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 text-left transition-all"
                      >
                        <span className="text-red-500 text-sm">🗑️</span>
                        <div>
                          <p className="font-semibold text-[11px] text-red-500">Delete</p>
                          <p className="text-[9px] text-red-500/80">Remove this word</p>
                        </div>
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            </Panel>

              <PanelResizeHandle className="h-2 bg-transparent cursor-row-resize relative z-10 hover:bg-[#2a2a2d] transition-colors rounded-full my-0.5 mx-2" />

              {/* BOTTOM: Timeline Area */}
              <Panel defaultSize={20} minSize={15} className="bg-[#161618] flex flex-col relative overflow-hidden rounded-xl border border-[#2a2a2d]">
                {/* Timeline Toolbar */}
                <div className="h-10 border-b border-[#2a2a2d] flex items-center px-4 justify-between bg-[#1a1a1c] shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex bg-[#161618] rounded p-0.5 border border-[#2a2a2d]">
                      <button 
                        onClick={() => setWordLineToggle('WORD')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-sm ${wordLineToggle === 'WORD' ? 'bg-white text-black' : 'text-[#8a8a8e]'}`}
                      >
                        WORD
                      </button>
                      <button 
                        onClick={() => setWordLineToggle('LINE')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-sm ${wordLineToggle === 'LINE' ? 'bg-white text-black' : 'text-[#8a8a8e]'}`}
                      >
                        LINE
                      </button>
                    </div>
                    <div className="h-4 w-[1px] bg-[#2a2a2d]"></div>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-[#e0e0e0] hover:text-white px-2 py-1 rounded hover:bg-[#2a2a2d]">
                      <span className="text-lg leading-none">+</span> Word
                    </button>
                    <div className="h-4 w-[1px] bg-[#2a2a2d]"></div>
                    <div className="flex items-center gap-1 hidden 2xl:flex">
                      <button className="p-1.5 text-[#8a8a8e] hover:text-white rounded hover:bg-[#2a2a2d]"><Undo2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-[#8a8a8e] hover:text-white rounded hover:bg-[#2a2a2d]"><Redo2 className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-[#8a8a8e] hover:text-white rounded hover:bg-[#2a2a2d]"><Scissors className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-[#8a8a8e] hover:text-white rounded hover:bg-[#2a2a2d]"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-[#8a8a8e] hover:text-white rounded hover:bg-[#2a2a2d]"><ChevronRight className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-[#8a8a8e] hover:text-white rounded hover:bg-[#2a2a2d]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <ZoomIn className="w-3.5 h-3.5 text-[#8a8a8e]" />
                    <div className="w-16 lg:w-24 h-1 bg-[#2a2a2d] rounded-full relative">
                       <div className="absolute top-1/2 -translate-y-1/2 left-[20%] w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <Search className="w-3.5 h-3.5 text-[#8a8a8e] ml-2" />
                  </div>
                </div>
                
                {/* Timeline Tracks */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#161618] custom-scrollbar">
                  <div className="w-[1200px] h-full relative">
                    {/* Content pinned to the bottom */}
                    <div className="absolute bottom-0 left-0 w-full flex flex-col pb-2">
                      {/* Time markers */}
                      <div className="h-6 flex items-end text-[10px] text-[#8a8a8e] font-mono tracking-tighter border-b border-[#2a2a2d]/50 w-full px-4 justify-between select-none">
                        <span>00:00.500</span><span>00:01.000</span><span>00:01.500</span><span>00:02.000</span><span>00:02.500</span><span>00:03.000</span><span>00:03.500</span><span>00:04.000</span><span>00:04.500</span><span>00:05.000</span>
                      </div>
                      
                      {/* Word Blocks */}
                      <div className="h-10 mt-2 flex items-center gap-1 px-4 w-full">
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[40px]">Hello</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-1 min-w-[20px]">and</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[50px]">welcome</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-1 min-w-[15px]">to</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[60px]">Kalakaar.</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-1 ml-4 min-w-[20px]">As</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[30px]">you</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[30px]">can</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[30px]">see,</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[25px]">we</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[40px]">have</div>
                        <div className="h-6 bg-[#d4ca8e] text-black text-[10px] font-bold rounded flex items-center px-2 min-w-[60px]">captions</div>
                      </div>

                      {/* Waveform */}
                      <div className="h-12 mt-2 w-full px-4 flex items-center opacity-70">
                        <svg className="w-full h-full text-[#52c595]" preserveAspectRatio="none" viewBox="0 0 100 20">
                          <path d="M0,10 Q2,5 4,10 T8,10 T12,12 T16,10 T20,8 T24,10 T28,15 T32,10 T36,10 T40,10 M42,10 Q44,5 46,10 T50,10 T54,12 T58,10 T62,8 T66,10 T70,15 T74,10 T78,10 M80,10 Q82,5 84,10 T88,10 T92,12 T96,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Playhead */}
                    <div className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-white z-10 shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none">
                      <div className="absolute -top-1 -left-1 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white"></div>
                    </div>
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-2 bg-transparent cursor-col-resize relative z-10 hover:bg-[#2a2a2d] transition-colors rounded-full mx-0.5 my-2" />

          {/* MIDDLE COLUMN: Video Preview */}
          <VideoPlayer 
            videoUrl={videoUrl} 
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
            // EFFECTS props
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
            // SPACING props
            letterSpacing={letterSpacing}
            lineSpacing={lineSpacing}
            // Timeline synchronization props
            activeCaptionId={activeCaptionId}
            setActiveCaptionId={setActiveCaptionId}
            seekRef={seekRef}
          />

          <PanelResizeHandle className="w-2 bg-transparent cursor-col-resize relative z-10 hover:bg-[#2a2a2d] transition-colors rounded-full mx-0.5 my-2" />

          {/* RIGHT COLUMN: Styling Options */}
          <Panel defaultSize={25} minSize={20} className="flex flex-col bg-[#161618] relative overflow-hidden rounded-xl border border-[#2a2a2d] right-sidebar-panel">
            {/* Horizontal Tabs */}
            <div className="flex border-b border-[#2a2a2d] px-2 pt-2">
              {['Text', 'Templates', 'Transitions', 'AI Audio'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTabRight(tab.toLowerCase())}
                  className={`px-3 py-3 text-[11px] font-bold tracking-wide transition-colors border-b-2 relative top-[1px]
                    ${activeTabRight === tab.toLowerCase() ? 'text-[#52c595] border-[#52c595]' : 'text-[#8a8a8e] hover:text-[#e0e0e0] border-transparent'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTabRight === 'text' && (
                <div className="p-5 space-y-6">
                  
                  {/* FONTS SECTION */}
                  <div>
                    <button 
                      onClick={() => toggleAccordion('fonts')}
                      className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a8e] tracking-widest uppercase mb-4 w-full text-left focus:outline-none"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.fonts ? 'rotate-90' : ''}`} /> FONTS
                    </button>
                    {openAccordions.fonts && (
                      <div className="space-y-4 pl-1 transition-all">
                        {/* Font Family */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#8a8a8e] w-[70px]">Font Family</span>
                          <div className="flex-1 flex gap-2">
                            <CustomSelect 
                              value={fontFamily}
                              options={['Inter', 'Roboto', 'Montserrat', 'Poppins']}
                              onChange={setFontFamily}
                              onHoverChange={setHoveredFontFamily}
                            />
                            <button 
                              onClick={() => setFontFamily('Inter')}
                              className="w-8 h-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Font Face */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#8a8a8e] w-[70px]">Font Face</span>
                          <div className="flex-1 flex gap-2">
                            <CustomSelect 
                              value={fontFace}
                              options={[
                                'Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black',
                                'Thin Italic', 'Extra Light Italic', 'Light Italic', 'Regular Italic', 'Medium Italic', 'Semi Bold Italic', 'Bold Italic', 'Extra Bold Italic', 'Black Italic'
                              ]}
                              onChange={setFontFace}
                              onHoverChange={setHoveredFontFace}
                            />
                            <button 
                              onClick={() => setFontFace('Regular')}
                              className="w-8 h-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {/* Size Slider */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex-1 flex items-center gap-3">
                            <TypeOutline className="w-4 h-4 text-[#8a8a8e]" />
                            <input 
                              type="range" 
                              min="12" 
                              max="120" 
                              value={fontSize} 
                              onChange={(e) => setFontSize(parseInt(e.target.value))}
                              className="flex-1 accent-[#52c595] h-1 bg-[#3a3a3d] rounded-full appearance-none outline-none cursor-pointer"
                            />
                          </div>
                          <div className="flex gap-2 justify-end shrink-0">
                            <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 text-xs text-white flex items-center gap-1 w-16 justify-center">
                              {fontSize} <span className="text-[#8a8a8e]">px</span>
                            </div>
                            <button 
                              onClick={() => setFontSize(41)}
                              className="w-8 h-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] w-full bg-[#2a2a2d]"></div>

                  {/* FORMAT SECTION */}
                  <div>
                    <button 
                      onClick={() => toggleAccordion('format')}
                      className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a8e] tracking-widest uppercase mb-4 w-full text-left focus:outline-none"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.format ? 'rotate-90' : ''}`} /> FORMAT
                    </button>
                    {openAccordions.format && (
                      <div className="space-y-4 pl-1">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                          <span className="text-xs text-[#8a8a8e]">Styles</span>
                          <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] overflow-hidden">
                            <button 
                              onClick={() => setCasing(prev => prev === 'capitalize' ? 'none' : 'capitalize')}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors ${casing === 'capitalize' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <span className="font-serif italic font-bold">Tt</span>
                            </button>
                            <button 
                              onClick={() => setCasing(prev => prev === 'uppercase' ? 'none' : 'uppercase')}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors border-l border-[#2a2a2d] ${casing === 'uppercase' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <span className="font-bold">T</span>
                            </button>
                            <button 
                              onClick={() => setCasing(prev => prev === 'lowercase' ? 'none' : 'lowercase')}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors border-l border-[#2a2a2d] ${casing === 'lowercase' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <span className="font-serif italic">t</span>
                            </button>
                            <button 
                              onClick={() => setStyleFlags(prev => ({ ...prev, underline: !prev.underline }))}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors border-l border-[#2a2a2d] ${styleFlags.underline ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <span className="font-serif italic underline">U</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                          <span className="text-xs text-[#8a8a8e]">Text Alignment</span>
                          <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] overflow-hidden">
                            <button 
                              onClick={() => setTextAlign('left')}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors ${textAlign === 'left' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <AlignLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setTextAlign('center')}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors border-l border-[#2a2a2d] ${textAlign === 'center' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <AlignCenter className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setTextAlign('right')}
                              className={`flex-1 min-w-[32px] h-8 flex items-center justify-center transition-colors border-l border-[#2a2a2d] ${textAlign === 'right' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e] hover:bg-[#2a2a2d]'}`}
                            >
                              <AlignRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] w-full bg-[#2a2a2d]"></div>

                  {/* POSITION SECTION */}
                  <div>
                    <button 
                      onClick={() => toggleAccordion('position')}
                      className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a8e] tracking-widest uppercase mb-4 w-full text-left focus:outline-none"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.position ? 'rotate-90' : ''}`} /> POSITION
                    </button>
                    {openAccordions.position && (
                      <div className="flex flex-wrap items-center gap-2 pl-1">
                        <span className="text-xs text-[#8a8a8e]">X</span>
                        <div className="flex-1 flex gap-1 min-w-[100px] items-stretch">
                          <div className="flex-1 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1 flex items-center justify-between font-mono">
                            <input 
                              type="text" 
                              value={inputX}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setInputX(valStr);
                                const val = parseFloat(valStr);
                                if (!isNaN(val)) {
                                  setPosition(prev => ({ ...prev, x: Math.max(0, Math.min(100, val)) }));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setPosition(prev => {
                                    const nextVal = Math.min(100, parseFloat((prev.x + 0.5).toFixed(1)));
                                    setInputX(nextVal.toFixed(1));
                                    return { ...prev, x: nextVal };
                                  });
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setPosition(prev => {
                                    const nextVal = Math.max(0, parseFloat((prev.x - 0.5).toFixed(1)));
                                    setInputX(nextVal.toFixed(1));
                                    return { ...prev, x: nextVal };
                                  });
                                }
                              }}
                              onBlur={() => setInputX(position.x.toFixed(1))}
                              className="bg-transparent text-white text-xs outline-none w-full border-none p-0 select-text"
                            />
                            <span className="text-[#8a8a8e] text-xs mr-1.5">%</span>
                            {/* Expanded Mini Spinner Arrows */}
                            <div className="flex flex-col text-[10px] text-zinc-500 shrink-0 border-l border-[#2a2a2d] pl-1.5 ml-1 select-none">
                              <button 
                                onClick={() => setPosition(prev => ({ ...prev, x: Math.min(100, parseFloat((prev.x + 0.5).toFixed(1))) }))}
                                className="hover:text-white hover:bg-[#2a2a2d] rounded transition-colors h-3.5 w-4 flex items-center justify-center font-bold"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={() => setPosition(prev => ({ ...prev, x: Math.max(0, parseFloat((prev.x - 0.5).toFixed(1))) }))}
                                className="hover:text-white hover:bg-[#2a2a2d] rounded transition-colors h-3.5 w-4 flex items-center justify-center font-bold mt-0.5"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={() => setPosition(prev => ({ ...prev, x: 50.0 }))}
                            className="w-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white self-stretch"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-[#8a8a8e] ml-1">Y</span>
                        <div className="flex-1 flex gap-1 min-w-[100px] items-stretch">
                          <div className="flex-1 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1 flex items-center justify-between font-mono">
                            <input 
                              type="text" 
                              value={inputY}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setInputY(valStr);
                                const val = parseFloat(valStr);
                                if (!isNaN(val)) {
                                  setPosition(prev => ({ ...prev, y: Math.max(0, Math.min(100, val)) }));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setPosition(prev => {
                                    const nextVal = Math.min(100, parseFloat((prev.y + 0.5).toFixed(1)));
                                    setInputY(nextVal.toFixed(1));
                                    return { ...prev, y: nextVal };
                                  });
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setPosition(prev => {
                                    const nextVal = Math.max(0, parseFloat((prev.y - 0.5).toFixed(1)));
                                    setInputY(nextVal.toFixed(1));
                                    return { ...prev, y: nextVal };
                                  });
                                }
                              }}
                              onBlur={() => setInputY(position.y.toFixed(1))}
                              className="bg-transparent text-white text-xs outline-none w-full border-none p-0 select-text"
                            />
                            <span className="text-[#8a8a8e] text-xs mr-1.5">%</span>
                            {/* Expanded Mini Spinner Arrows */}
                            <div className="flex flex-col text-[10px] text-zinc-500 shrink-0 border-l border-[#2a2a2d] pl-1.5 ml-1 select-none">
                              <button 
                                onClick={() => setPosition(prev => ({ ...prev, y: Math.min(100, parseFloat((prev.y + 0.5).toFixed(1))) }))}
                                className="hover:text-white hover:bg-[#2a2a2d] rounded transition-colors h-3.5 w-4 flex items-center justify-center font-bold"
                              >
                                ▲
                              </button>
                              <button 
                                onClick={() => setPosition(prev => ({ ...prev, y: Math.max(0, parseFloat((prev.y - 0.5).toFixed(1))) }))}
                                className="hover:text-white hover:bg-[#2a2a2d] rounded transition-colors h-3.5 w-4 flex items-center justify-center font-bold mt-0.5"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={() => setPosition(prev => ({ ...prev, y: 65.0 }))}
                            className="w-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white self-stretch"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] w-full bg-[#2a2a2d]"></div>

                  {/* COLOR SECTION */}
                  <div>
                    <button 
                      onClick={() => toggleAccordion('color')}
                      className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a8e] tracking-widest uppercase mb-4 w-full text-left focus:outline-none"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions.color ? 'rotate-90' : ''}`} /> COLOR
                    </button>
                    {openAccordions.color && (
                      <div className="space-y-4 pl-1">
                        <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] p-0.5">
                          <button 
                            onClick={() => setColorToggle('Solid')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-sm flex items-center justify-center gap-1.5 ${colorToggle === 'Solid' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e]'}`}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-white opacity-80" /> Solid
                          </button>
                          <button 
                            onClick={() => {
                              setColorToggle('Gradient');
                              setColor(gradientStops[0].color);
                            }}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-sm flex items-center justify-center gap-1.5 ${colorToggle === 'Gradient' ? 'bg-[#2a2a2d] text-white' : 'text-[#8a8a8e]'}`}
                          >
                            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-80" /> Gradient
                          </button>
                        </div>

                        {colorToggle === 'Gradient' && (
                          <div className="space-y-4">
                            {/* Stops Gradient Slider bar */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[#8a8a8e]">Stops</span>
                                <button 
                                  onClick={() => {
                                    setGradientStops([
                                      { id: 1, position: 0, color: '#8a7300', opacity: 100 },
                                      { id: 2, position: 45, color: '#d4ca8e', opacity: 100 },
                                      { id: 3, position: 55, color: '#fffdf0', opacity: 100 },
                                      { id: 4, position: 100, color: '#8a7300', opacity: 100 }
                                    ]);
                                    setActiveStopId(1);
                                  }}
                                  className="text-[10px] text-[#8a8a8e] hover:text-white flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                                </button>
                              </div>
                              <div ref={stopsContainerRef} className="relative pt-1 pb-6 px-2 bg-[#161618] rounded-md border border-[#2a2a2d] h-14 flex items-center">
                                {/* The Gradient Visual Bar */}
                                <div 
                                  id="gradient-stops-bar"
                                  className="w-full h-4 rounded shadow-inner border border-[#2a2a2d] relative cursor-pointer"
                                  style={{
                                    background: `linear-gradient(to right, ${[...gradientStops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ')})`
                                  }}
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const position = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
                                    const nextId = gradientStops.length > 0 ? Math.max(...gradientStops.map(s => s.id)) + 1 : 1;
                                    const newStop = { id: nextId, position, color: '#ffffff', opacity: 100 };
                                    setGradientStops(prev => [...prev, newStop]);
                                    setActiveStopId(nextId);
                                    setOpenStopPickerId(nextId);
                                  }}
                                />
                                {/* Draggable Stops */}
                                {gradientStops.map(stop => (
                                  <div 
                                    key={stop.id}
                                    className="absolute bottom-1.5 cursor-ew-resize transform -translate-x-1/2 flex flex-col items-center z-10 select-none" 
                                    style={{ left: `calc(${stop.position}% + 8px - (${stop.position / 100} * 16px))` }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSelectStop(stop.id);
                                      const startX = e.clientX;
                                      const startPos = stop.position;
                                      let hasDragged = false;
                                      
                                      const onMouseMove = (moveEvent: MouseEvent) => {
                                        const deltaX = Math.abs(moveEvent.clientX - startX);
                                        if (deltaX > 3) {
                                          hasDragged = true;
                                        }
                                        
                                        const bar = document.getElementById('gradient-stops-bar');
                                        if (bar) {
                                          const rect = bar.getBoundingClientRect();
                                          const deltaPercent = ((moveEvent.clientX - startX) / rect.width) * 100;
                                          const newPos = Math.max(0, Math.min(100, Math.round(startPos + deltaPercent)));
                                          setGradientStops(prev => prev.map(s => s.id === stop.id ? { ...s, position: newPos } : s));
                                        }
                                      };
                                      
                                      const onMouseUp = () => {
                                        window.removeEventListener('mousemove', onMouseMove);
                                        window.removeEventListener('mouseup', onMouseUp);
                                        
                                        // Only toggle the popup if they didn't drag the handle
                                        if (!hasDragged) {
                                          setOpenStopPickerId(openStopPickerId === stop.id ? null : stop.id);
                                        }
                                      };
                                      
                                      window.addEventListener('mousemove', onMouseMove);
                                      window.addEventListener('mouseup', onMouseUp);
                                    }}
                                  >
                                    {/* Triangle indicator (turns blue on selection) */}
                                    <div className={`w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent ${activeStopId === stop.id ? 'border-b-[#3b82f6] scale-125' : 'border-b-[#8a8a8e]'}`} />
                                    {/* Color circle indicator (turns blue border on selection) */}
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 ${activeStopId === stop.id ? 'border-[#3b82f6] scale-110 shadow-[0_0_4px_rgba(59,130,246,0.6)]' : 'border-white'} mt-0.5`} style={{ backgroundColor: stop.color }} />

                                    {/* Color Picker popover overlay */}
                                    {openStopPickerId === stop.id && (
                                      <div 
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="absolute bottom-full mb-3 z-50 left-1/2 transform -translate-x-1/2 cursor-default"
                                      >
                                        <StopColorPicker 
                                          color={stop.color}
                                          opacity={stop.opacity || 100}
                                          positionPercent={stop.position}
                                          onColorChange={(newCol) => {
                                            setGradientStops(prev => prev.map(s => s.id === stop.id ? { ...s, color: newCol } : s));
                                          }}
                                          onOpacityChange={(newOpacity) => {
                                            setGradientStops(prev => prev.map(s => s.id === stop.id ? { ...s, opacity: newOpacity } : s));
                                          }}
                                          onPositionChange={(newPos) => {
                                            setGradientStops(prev => prev.map(s => s.id === stop.id ? { ...s, position: newPos } : s));
                                          }}
                                          onRemove={() => {
                                            setGradientStops(prev => prev.filter(s => s.id !== stop.id));
                                            setOpenStopPickerId(null);
                                            const remaining = gradientStops.filter(s => s.id !== stop.id);
                                            if (remaining.length > 0) {
                                              setActiveStopId(remaining[0].id);
                                            }
                                          }}
                                          canRemove={gradientStops.length > 2}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Angle controls */}
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                              <span className="text-xs text-[#8a8a8e]">Angle</span>
                              <div className="flex-grow flex items-stretch gap-2 justify-end">
                                <div className="flex items-center gap-2 flex-grow max-w-[160px]">
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max="360" 
                                    value={gradientAngle} 
                                    onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                                    className="w-full accent-[#52c595] cursor-pointer h-1 bg-[#2a2a2d] rounded-lg appearance-none"
                                  />
                                </div>
                                <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1 flex items-center justify-between font-mono w-16">
                                  <input 
                                    type="text" 
                                    value={inputAngle}
                                    onChange={(e) => {
                                      const valStr = e.target.value;
                                      setInputAngle(valStr);
                                      const val = parseInt(valStr);
                                      if (!isNaN(val)) {
                                        setGradientAngle(Math.max(0, Math.min(360, val)));
                                      }
                                    }}
                                    onBlur={() => setInputAngle(gradientAngle.toString())}
                                    className="bg-transparent text-white text-xs outline-none w-full border-none p-0 select-text text-center"
                                  />
                                </div>
                                <button 
                                  onClick={() => setGradientAngle(90)}
                                  className="w-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white self-stretch"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Level Switcher */}
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                              <span className="text-xs text-[#8a8a8e]">Level</span>
                              <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] p-0.5 w-[140px]">
                                <button 
                                  onClick={() => setGradientLevel('word')}
                                  className={`flex-1 py-1 text-[10px] font-semibold rounded-sm flex items-center justify-center gap-1 ${gradientLevel === 'word' ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e]'}`}
                                >
                                  Word
                                </button>
                                <button 
                                  onClick={() => setGradientLevel('char')}
                                  className={`flex-1 py-1 text-[10px] font-semibold rounded-sm flex items-center justify-center gap-1 ${gradientLevel === 'char' ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e]'}`}
                                >
                                  Char
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {colorToggle === 'Solid' && (
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 relative">
                            <span className="text-xs text-[#8a8a8e]">Color</span>
                            <div className="flex items-stretch gap-2">
                              <div ref={colorPickerRef} className="relative flex-1">
                                <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 flex items-center gap-2 min-w-[120px]">
                                  <button 
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="w-6 h-6 rounded border border-[#2a2a2d] bg-transparent overflow-hidden p-0 relative focus:outline-none shrink-0"
                                  >
                                    <div className="w-full h-full rounded" style={{ backgroundColor: color }} />
                                  </button>
                                  <input 
                                    type="text"
                                    value={inputColor}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setInputColor(val);
                                      if (/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/.test(val)) {
                                        setColor(val);
                                      }
                                    }}
                                    onBlur={() => setInputColor(color)}
                                    className="bg-transparent text-xs font-mono text-white uppercase outline-none w-full border-none p-0 select-text"
                                  />
                                </div>
                                
                                {/* Custom Color Picker dropdown */}
                                {showColorPicker && (
                                  <div className="absolute right-0 bottom-full mb-2 z-50">
                                    <CustomColorPicker color={color} onChange={setColor} />
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={() => setColor('#FFFFFF')}
                                className="w-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white self-stretch"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] w-full bg-[#2a2a2d]"></div>

                  {/* Other accordions */}
                  {['EMPHASIS', 'SPACING', 'EFFECTS'].map(title => {
                    const key = title.toLowerCase();
                    return (
                      <div key={title}>
                        <button 
                          onClick={() => toggleAccordion(key)}
                          className="flex items-center gap-2 text-[10px] font-bold text-[#8a8a8e] tracking-widest uppercase mb-4 w-full text-left focus:outline-none"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${openAccordions[key] ? 'rotate-90' : ''}`} /> {title}
                        </button>
                        {openAccordions[key] && (
                          <div className="pl-4 py-2 text-xs text-[#8a8a8e]">
                            {key === 'spacing' ? (
                              <div className="flex flex-col gap-4 mr-2">
                                {/* Letter Spacing */}
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-[#8a8a8e] w-24">Letter Spacing</span>
                                  <div className="flex-1 flex items-center gap-3">
                                    <input 
                                      type="range" 
                                      min="-5" 
                                      max="20" 
                                      value={letterSpacing} 
                                      onChange={(e) => setLetterSpacing(Number(e.target.value))}
                                      className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                      {letterSpacing}
                                    </div>
                                    <button 
                                      onClick={() => setLetterSpacing(0)}
                                      className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Line Spacing */}
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs text-[#8a8a8e] w-24">Line Spacing</span>
                                  <div className="flex-1 flex items-center gap-3">
                                    <input 
                                      type="range" 
                                      min="0.8" 
                                      max="3.0" 
                                      step="0.1"
                                      value={lineSpacing} 
                                      onChange={(e) => setLineSpacing(Number(e.target.value))}
                                      className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                      {lineSpacing.toFixed(1)}
                                    </div>
                                    <button 
                                      onClick={() => setLineSpacing(1.2)}
                                      className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : key === 'effects' ? (
                              <div className="flex flex-col gap-4 mr-2">
                                {/* Drop Shadow Toggle Block */}
                                <div className="flex flex-col gap-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-white">Drop Shadow</span>
                                    <button 
                                      onClick={() => setShadowEnabled(!shadowEnabled)}
                                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${shadowEnabled ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                                    >
                                      <div className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${shadowEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                  </div>

                                  {shadowEnabled && (
                                    <div className="flex flex-col gap-4 pl-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-[#8a8a8e]">Color</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="relative flex items-center gap-2 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 h-9 w-[104px] shrink-0" ref={shadowColorRef}>
                                            <button 
                                              onClick={() => setShowShadowColorPicker(!showShadowColorPicker)}
                                              className="w-6 h-6 rounded border border-[#2a2a2d] bg-transparent overflow-hidden p-0 relative focus:outline-none shrink-0"
                                            >
                                              <div className="w-full h-full rounded" style={{ backgroundColor: shadowColor }} />
                                            </button>
                                            <input 
                                              type="text" 
                                              value={shadowColor.toUpperCase()}
                                              onChange={(e) => setShadowColor(e.target.value)}
                                              className="bg-transparent text-[11px] font-mono text-white outline-none w-14 border-none p-0 select-text"
                                            />
                                            {showShadowColorPicker && (
                                              <div className="absolute right-0 bottom-full mb-2 z-50">
                                                <CustomColorPicker color={shadowColor} onChange={setShadowColor} />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Position X</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="-20" 
                                            max="20" 
                                            value={shadowX} 
                                            onChange={(e) => setShadowX(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {shadowX}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Position Y</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="-20" 
                                            max="20" 
                                            value={shadowY} 
                                            onChange={(e) => setShadowY(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {shadowY}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Blur</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="0" 
                                            max="30" 
                                            value={shadowBlur} 
                                            onChange={(e) => setShadowBlur(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {shadowBlur}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Text Stroke Toggle Block */}
                                <div className="flex flex-col gap-4 mt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-white">Text Stroke</span>
                                    <button 
                                      onClick={() => setStrokeEnabled(!strokeEnabled)}
                                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${strokeEnabled ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                                    >
                                      <div className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${strokeEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                  </div>

                                  {strokeEnabled && (
                                    <div className="flex flex-col gap-4 pl-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-[#8a8a8e]">Color</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="relative flex items-center gap-2 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 h-9 w-[104px] shrink-0" ref={strokeColorRef}>
                                            <button 
                                              onClick={() => setShowStrokeColorPicker(!showStrokeColorPicker)}
                                              className="w-6 h-6 rounded border border-[#2a2a2d] bg-transparent overflow-hidden p-0 relative focus:outline-none shrink-0"
                                            >
                                              <div className="w-full h-full rounded" style={{ backgroundColor: strokeColor }} />
                                            </button>
                                            <input 
                                              type="text" 
                                              value={strokeColor.toUpperCase()}
                                              onChange={(e) => setStrokeColor(e.target.value)}
                                              className="bg-transparent text-[11px] font-mono text-white outline-none w-14 border-none p-0 select-text"
                                            />
                                            {showStrokeColorPicker && (
                                              <div className="absolute right-0 bottom-full mb-2 z-50">
                                                <CustomColorPicker color={strokeColor} onChange={setStrokeColor} />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Width</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="0" 
                                            max="10" 
                                            value={strokeWidth} 
                                            onChange={(e) => setStrokeWidth(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {strokeWidth}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Background Toggle Block */}
                                <div className="flex flex-col gap-4 mt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-white">Background</span>
                                    <button 
                                      onClick={() => setBgEnabled(!bgEnabled)}
                                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${bgEnabled ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                                    >
                                      <div className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${bgEnabled ? 'translate-x-5' : ''}`} />
                                    </button>
                                  </div>

                                  {bgEnabled && (
                                    <div className="flex flex-col gap-4 pl-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-[#8a8a8e]">Color</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div className="relative flex items-center gap-2 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 h-9 w-[104px] shrink-0" ref={bgColorRef}>
                                            <button 
                                              onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                                              className="w-6 h-6 rounded border border-[#2a2a2d] bg-transparent overflow-hidden p-0 relative focus:outline-none shrink-0"
                                            >
                                              <div className="w-full h-full rounded" style={{ backgroundColor: bgColor }} />
                                            </button>
                                            <input 
                                              type="text" 
                                              value={bgColor.toUpperCase()}
                                              onChange={(e) => setBgColor(e.target.value)}
                                              className="bg-transparent text-[11px] font-mono text-white outline-none w-14 border-none p-0 select-text"
                                            />
                                            {showBgColorPicker && (
                                              <div className="absolute right-0 bottom-full mb-2 z-50">
                                                <CustomColorPicker color={bgColor} onChange={setBgColor} />
                                              </div>
                                            )}
                                          </div>
                                          <button 
                                            onClick={() => {
                                              setBgColor('#000000');
                                              setBgOpacity(100);
                                            }}
                                            className="w-8 h-8 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-xs text-[#8a8a8e]">
                                        <span>Border Radius</span>
                                        <span className="text-[10px] bg-[#1a1a1c] border border-[#2a2a2d] px-2 py-0.5 rounded text-white font-mono">Linked</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Radius</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="0" 
                                            max="50" 
                                            value={bgRadius} 
                                            onChange={(e) => setBgRadius(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {bgRadius}
                                          </div>
                                          <button 
                                            onClick={() => setBgRadius(24)}
                                            className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="text-xs text-[#8a8a8e] mt-1 font-semibold">Background Size</div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Width</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={bgWidth} 
                                            onChange={(e) => setBgWidth(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {bgWidth}
                                          </div>
                                          <button 
                                            onClick={() => setBgWidth(48)}
                                            className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-16">Height</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={bgHeight} 
                                            onChange={(e) => setBgHeight(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {bgHeight}
                                          </div>
                                          <button 
                                            onClick={() => setBgHeight(24)}
                                            className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-[#8a8a8e]">Drop Shadow</span>
                                        <button 
                                          onClick={() => setBgShadowEnabled(!bgShadowEnabled)}
                                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${bgShadowEnabled ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                                        >
                                          <div className={`bg-black w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${bgShadowEnabled ? 'translate-x-4' : ''}`} />
                                        </button>
                                      </div>

                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-[#8a8a8e]">Outline</span>
                                        <button 
                                          onClick={() => setBgOutlineEnabled(!bgOutlineEnabled)}
                                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${bgOutlineEnabled ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                                        >
                                          <div className={`bg-black w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${bgOutlineEnabled ? 'translate-x-4' : ''}`} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>Adjust {title.toLowerCase()} configurations here.</>
                            )}
                          </div>
                        )}
                        <div className="h-[1px] w-full bg-[#2a2a2d] my-4"></div>
                      </div>
                    );
                  })}

                </div>
              )}
            </div>

            {/* Footer with Export */}
            <div className="p-4 border-t border-[#2a2a2d] bg-[#1a1a1c] flex justify-end mt-auto">
              <Button className="bg-[#52c595] hover:bg-[#43a97f] text-black font-bold px-6 py-2 h-auto rounded-md shadow-[0_0_15px_rgba(82,197,149,0.3)]">
                Export
              </Button>
            </div>
          </Panel>

        </PanelGroup>
      </div>

    </div>
  );
}
