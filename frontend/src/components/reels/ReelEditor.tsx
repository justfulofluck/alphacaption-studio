import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Type, Music, Play, Search, RotateCcw, Home, Upload,
  Volume2, Maximize, Settings, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Scissors, ChevronLeft, ChevronRight, Trash2, ZoomIn, ZoomOut, SplitSquareHorizontal, RefreshCw, TypeOutline,
  X, ChevronUp, ChevronDown, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Link } from 'react-router-dom';
import { VideoPlayer } from './VideoPlayer';
import { API_BASE_URL } from '@/api/config';
import { useTimelineStore } from '@/hooks/limeplay/use-timeline';

// Format time in mm:ss format helper
function formatTime(time: number): string {
  const mins = Math.floor(time / 60).toString().padStart(2, '0');
  const secs = Math.floor(time % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

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
  icon?: React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, onHoverChange, icon }) => {
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
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#8a8a8e]">{icon}</span>}
          <span>{value}</span>
        </div>
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

const VideoItem = ({
  video,
  isSelected,
  onClick,
}: {
  video: {
    id: number;
    filename: string;
    url: string;
    duration: number;
    size: number;
    created_at: string;
  };
  isSelected: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative aspect-[9/16] bg-[#161618] rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-white/20'
      }`}
    >
      <video
        src={video.url}
        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
        preload="metadata"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-medium text-white/80 font-mono bg-black/50 px-1.5 py-0.5 rounded">
          {formatTime(video.duration)}
        </span>
        <span className="text-[10px] font-medium text-white/60 bg-black/50 px-1.5 py-0.5 rounded">
          {(video.size / (1024 * 1024)).toFixed(1)} MB
        </span>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
          <Check className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

const WaveformCanvas = ({ audioData, totalWidth, duration, pxPerSec }: { audioData: Float32Array | null, totalWidth: number, duration: number, pxPerSec: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(totalWidth, 28);
    ctx.strokeStyle = 'rgba(82,197,149, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (!audioData || audioData.length === 0 || duration <= 0) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(82,197,149, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    for (let x = 0; x < totalWidth; x += 5) {
      const time = x / pxPerSec;
      const dataIndex = Math.floor((time / duration) * audioData.length);
      const amp = dataIndex >= 0 && dataIndex < audioData.length ? audioData[dataIndex] * 45 : 0;
      const drawAmp = Math.max(1, amp);
      ctx.moveTo(x, 28 - drawAmp);
      ctx.lineTo(x, 28 + drawAmp);
    }
    ctx.stroke();
  }, [audioData, totalWidth, duration, pxPerSec]);

  return <canvas ref={canvasRef} width={totalWidth} height={56} className="pointer-events-none" />;
};

export function ReelEditor() {
  const [activeTabLeft, setActiveTabLeft] = useState('captions');
  const [seekTo, setSeekTo] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const zoomLevelRef = useRef(zoomLevel);
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

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
  const [hoveredEmphasisFontFamily, setHoveredEmphasisFontFamily] = useState<string | null>(null);
  const [hoveredEmphasisFontFace, setHoveredEmphasisFontFace] = useState<string | null>(null);
  const [hoveredSpotlightFontFamily, setHoveredSpotlightFontFamily] = useState<string | null>(null);
  const [hoveredSpotlightFontFace, setHoveredSpotlightFontFace] = useState<string | null>(null);
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
  
  const emphasisColorPickerRef = useRef<HTMLDivElement>(null);
  const emphasisStopsContainerRef = useRef<HTMLDivElement>(null);
  const spotlightColorPickerRef = useRef<HTMLDivElement>(null);
  const spotlightStopsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (stopsContainerRef.current && !stopsContainerRef.current.contains(e.target as Node)) {
        setOpenStopPickerId(null);
      }
      if (emphasisStopsContainerRef.current && !emphasisStopsContainerRef.current.contains(e.target as Node)) {
        setEmphasisOpenStopPickerId(null);
      }
      if (spotlightStopsContainerRef.current && !spotlightStopsContainerRef.current.contains(e.target as Node)) {
        setSpotlightOpenStopPickerId(null);
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

  // EMPHASIS & SPOTLIGHT states
  const [emphasisTab, setEmphasisTab] = useState<'emphasize' | 'spotlight'>('emphasize');
  
  // Emphasize Style States
  const [emphasisMode, setEmphasisMode] = useState('Solid'); // 'Solid' | 'Gradient'
  const [emphasisColor, setEmphasisColor] = useState('#5E1616');
  const [emphasisSize, setEmphasisSize] = useState(1.0);
  const [emphasisGlow, setEmphasisGlow] = useState('#5E1616');
  const [emphasisFont, setEmphasisFont] = useState('Inter');
  const [emphasisFontFace, setEmphasisFontFace] = useState('Regular Italic');
  const [emphasisStyles, setEmphasisStyles] = useState({ uppercase: false, bold: false, italic: true, underline: false });
  const [emphasisGradientStops, setEmphasisGradientStops] = useState([
    { id: 1, position: 0, color: '#f3a63b', opacity: 100 },
    { id: 2, position: 100, color: '#ffef7d', opacity: 100 }
  ]);
  const [emphasisGradientAngle, setEmphasisGradientAngle] = useState(90);
  const [emphasisGradientLevel, setEmphasisGradientLevel] = useState<'word' | 'char'>('word');
  const [emphasisActiveStopId, setEmphasisActiveStopId] = useState<number>(1);
  const [emphasisOpenStopPickerId, setEmphasisOpenStopPickerId] = useState<number | null>(null);

  // Spotlight Style States
  const [spotlightMode, setSpotlightMode] = useState('Solid'); // 'Solid' | 'Gradient'
  const [spotlightColor, setSpotlightColor] = useState('#FFFFFF');
  const [spotlightSize, setSpotlightSize] = useState(1.3);
  const [spotlightGlow, setSpotlightGlow] = useState('#FFFFFF');
  const [spotlightFont, setSpotlightFont] = useState('Inter');
  const [spotlightFontFace, setSpotlightFontFace] = useState('Regular Italic');
  const [spotlightStyles, setSpotlightStyles] = useState({ uppercase: false, bold: false, italic: true, underline: false });
  const [spotlightGradientStops, setSpotlightGradientStops] = useState([
    { id: 1, position: 0, color: '#ffd900', opacity: 100 },
    { id: 2, position: 100, color: '#ffffff', opacity: 100 }
  ]);
  const [spotlightGradientAngle, setSpotlightGradientAngle] = useState(90);
  const [spotlightGradientLevel, setSpotlightGradientLevel] = useState<'word' | 'char'>('word');
  const [spotlightActiveStopId, setSpotlightActiveStopId] = useState<number>(1);
  const [spotlightOpenStopPickerId, setSpotlightOpenStopPickerId] = useState<number | null>(null);

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

  // New states for mode selection
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedFileToUpload, setSelectedFileToUpload] = useState<File | null>(null);
  const [transcriptionMode, setTranscriptionMode] = useState('native_language');

  // Timeline & active word selection states
  const [activeCaptionId, setActiveCaptionId] = useState<number | null>(null);
  const seekRef = useRef<((time: number) => void) | null>(null);
  const togglePlayRef = useRef<(() => void) | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingTimelineRef = useRef(false);

  // Dragging and resizing state for timeline blocks
  const [draggingBlock, setDraggingBlock] = useState<{
    id: string | number;
    type: 'word' | 'line';
    action: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStart: number;
    initialEnd: number;
    minStart: number;
    maxEnd: number;
  } | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Array<string | number>>([]);
  const selectedBlockId = selectedBlockIds[0] || null;
  const setSelectedBlockId = React.useCallback((id: string | number | null) => {
    setSelectedBlockIds(id === null ? [] : [id]);
  }, []);
  const [aiAudioClean, setAiAudioClean] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    const checkVideo = setInterval(() => {
      const videoEl = document.querySelector('video');
      if (videoEl) {
        const handlePlay = () => setIsVideoPlaying(true);
        const handlePause = () => setIsVideoPlaying(false);
        videoEl.addEventListener('play', handlePlay);
        videoEl.addEventListener('pause', handlePause);
        setIsVideoPlaying(!videoEl.paused);
        clearInterval(checkVideo);
      }
    }, 1000);

    return () => {
      clearInterval(checkVideo);
    };
  }, [videoUrl]);
  const [optimisticTimings, setOptimisticTimings] = useState<Record<string, {start: number, end: number}>>({});
  const optimisticTimingsRef = useRef(optimisticTimings);
  useEffect(() => {
    optimisticTimingsRef.current = optimisticTimings;
  }, [optimisticTimings]);

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  useEffect(() => {
    if (!videoUrl) return;
    const fetchAudio = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(videoUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const step = Math.ceil(channelData.length / 5000); // 5000 points of resolution
        const peaks = new Float32Array(Math.ceil(channelData.length / step));
        for (let i = 0; i < peaks.length; i++) {
          let max = 0;
          for (let j = 0; j < step; j++) {
            const val = Math.abs(channelData[i * step + j]);
            if (val > max) max = val;
          }
          peaks[i] = max;
        }
        setAudioDuration(audioBuffer.duration);
        setAudioData(peaks);
      } catch (err) {
        console.error("Error decoding audio for waveform:", err);
      }
    };
    fetchAudio();
  }, [videoUrl]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingBlock) return;
      const pxPerSec = 200 * zoomLevelRef.current;
      const deltaX = e.clientX - draggingBlock.startX;
      const deltaTime = deltaX / pxPerSec;
      
      setOptimisticTimings(prev => {
        let newStart = draggingBlock.initialStart;
        let newEnd = draggingBlock.initialEnd;
        
        if (draggingBlock.action === 'move') {
          const duration = draggingBlock.initialEnd - draggingBlock.initialStart;
          newStart = Math.max(draggingBlock.minStart, Math.min(draggingBlock.initialStart + deltaTime, draggingBlock.maxEnd - duration));
          newEnd = newStart + duration;
        } else if (draggingBlock.action === 'resize-left') {
          newStart = Math.max(draggingBlock.minStart, Math.min(draggingBlock.initialStart + deltaTime, newEnd - 0.1));
        } else if (draggingBlock.action === 'resize-right') {
          newEnd = Math.max(newStart + 0.1, Math.min(draggingBlock.initialEnd + deltaTime, draggingBlock.maxEnd));
        }
        
        return { ...prev, [draggingBlock.id]: { start: newStart, end: newEnd } };
      });
    };

    const handleMouseUp = () => {
      if (!draggingBlock) return;
      
      setCaptions(prev => {
        const result = [...prev];
        const updated = optimisticTimingsRef.current[draggingBlock.id];
        if (!updated) return result;
        
        if (draggingBlock.type === 'line') {
          const idx = result.findIndex((c, idx) => (c.id ?? idx) === draggingBlock.id);
          if (idx !== -1) {
            result[idx] = { ...result[idx], start: updated.start, end: updated.end };
          }
        } else {
          // Update a word inside a chunk
          for (let i = 0; i < result.length; i++) {
            let wordsArray = result[i].words;
            if (!wordsArray || wordsArray.length === 0) {
              wordsArray = generateWordsForChunk(result[i], i).words;
            }
            if (wordsArray) {
              const wIdx = wordsArray.findIndex((w: any) => w.id === draggingBlock.id);
              if (wIdx !== -1) {
                const newWords = [...wordsArray];
                newWords[wIdx] = { ...newWords[wIdx], start: updated.start, end: updated.end };
                result[i] = { ...result[i], words: newWords };
                break;
              }
            }
          }
        }
        return result;
      });
      
      setDraggingBlock(null);
    };

    if (draggingBlock) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBlock]);

  // Global mouse handlers for playhead scrubbing & selection box dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingTimelineRef.current) {
        if (timelineScrollRef.current) {
           const innerDiv = timelineScrollRef.current.firstChild as HTMLDivElement;
           if (innerDiv) {
              const rect = innerDiv.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const pxPerSec = 200 * zoomLevelRef.current;
              const time = Math.max(0, x / pxPerSec);
              if (seekRef.current) seekRef.current(time);
           }
        }
      } else if (selectionBoxRef.current) {
        const innerDiv = document.querySelector('.timeline-scroll-content');
        if (innerDiv) {
          const rect = innerDiv.getBoundingClientRect();
          const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
          setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);
        }
      }
    };
    const handleMouseUp = () => {
      isDraggingTimelineRef.current = false;
      
      if (selectionBoxRef.current) {
        const box = selectionBoxRef.current;
        const x1 = Math.min(box.startX, box.currentX);
        const x2 = Math.max(box.startX, box.currentX);
        const y1 = Math.min(box.startY, box.currentY);
        const y2 = Math.max(box.startY, box.currentY);
        
        const innerDiv = document.querySelector('.timeline-scroll-content');
        if (innerDiv) {
          const rect = innerDiv.getBoundingClientRect();
          const selectBoxRect = {
            left: rect.left + x1,
            right: rect.left + x2,
            top: rect.top + y1,
            bottom: rect.top + y2
          };
          
          const selectedIds: Array<string | number> = [];
          displayCaptionsRef.current.forEach(c => {
            if (wordLineToggleRef.current === 'LINE') {
              const el = document.getElementById(`line-block-${c.id}`);
              if (el) {
                const elRect = el.getBoundingClientRect();
                if (
                  elRect.left <= selectBoxRect.right &&
                  elRect.right >= selectBoxRect.left &&
                  elRect.top <= selectBoxRect.bottom &&
                  elRect.bottom >= selectBoxRect.top
                ) {
                  selectedIds.push(c.id);
                }
              }
            } else {
              (c.words || []).forEach((w: any) => {
                const el = document.getElementById(`word-block-${w.id}`);
                if (el) {
                  const elRect = el.getBoundingClientRect();
                  if (
                    elRect.left <= selectBoxRect.right &&
                    elRect.right >= selectBoxRect.left &&
                    elRect.top <= selectBoxRect.bottom &&
                    elRect.bottom >= selectBoxRect.top
                  ) {
                    selectedIds.push(w.id);
                  }
                }
              });
            }
          });
          
          setSelectedBlockIds(selectedIds);
        }
        setSelectionBox(null);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const updatePlayhead = () => {
      const pxPerSec = 200 * zoomLevelRef.current;
      if (playheadRef.current) {
        const videoEl = document.querySelector('video');
        const time = videoEl ? videoEl.currentTime : currentTimeRef.current;
        const x = time * pxPerSec;
        playheadRef.current.style.transform = `translateX(${x}px)`;
        
        // Auto-scroll logic if playhead goes out of view
        if (timelineScrollRef.current) {
          const scrollLeft = timelineScrollRef.current.scrollLeft;
          const clientWidth = timelineScrollRef.current.clientWidth;
          const videoEl = document.querySelector('video');
          const isPlaying = videoEl ? !videoEl.paused : false;
          
          // Only auto-scroll if the video is playing OR the user is dragging the playhead
          if (isPlaying || isDraggingTimelineRef.current) {
            if (x > scrollLeft + clientWidth - 100) {
              timelineScrollRef.current.scrollLeft = x - clientWidth + 100;
            } else if (x < scrollLeft + 50) {
              timelineScrollRef.current.scrollLeft = Math.max(0, x - 50);
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(updatePlayhead);
    };
    animationFrameId = requestAnimationFrame(updatePlayhead);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const seekFromMouseEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!seekRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pxPerSec = 200 * zoomLevelRef.current;
    const time = Math.max(0, x / pxPerSec);
    seekRef.current(time);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('.timeline-block')) {
      return;
    }
    setSelectedBlockIds([]);
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    setSelectionBox({
      startX,
      startY,
      currentX: startX,
      currentY: startY
    });
  };

  const handleTimelineSplit = () => {
    if (!selectedBlockId) return;
    if (wordLineToggle === 'WORD') {
      let targetCaptionIndex = -1;
      let wordIndex = -1;
      for (let i = 0; i < captions.length; i++) {
        if (captions[i].words) {
          const wIdx = captions[i].words.findIndex((w: any) => w.id === selectedBlockId);
          if (wIdx !== -1) {
            targetCaptionIndex = i;
            wordIndex = wIdx;
            break;
          }
        }
      }
      
      if (targetCaptionIndex !== -1 && wordIndex !== -1) {
          const targetCaption = captions[targetCaptionIndex];
          const words = targetCaption.text.split(/\s+/);
          const j = wordIndex;
          const duration = targetCaption.end - targetCaption.start;
          const timePerWord = duration / Math.max(1, words.length);
          const newCaptions = [];
          
          if (j > 0) {
            newCaptions.push({ id: Date.now() + 1, start: targetCaption.start, end: targetCaption.start + j * timePerWord, text: words.slice(0, j).join(' ') });
          }
          newCaptions.push({ id: Date.now() + 2, start: targetCaption.start + j * timePerWord, end: targetCaption.start + (j + 1) * timePerWord, text: words[j] });
          if (j < words.length - 1) {
            newCaptions.push({ id: Date.now() + 3, start: targetCaption.start + (j + 1) * timePerWord, end: targetCaption.end, text: words.slice(j + 1).join(' ') });
          }
          
          const newCaptionsList = [...captions];
          newCaptionsList.splice(targetCaptionIndex, 1, ...newCaptions);
          setCaptions(newCaptionsList);
      }
    }
  };

  const handleTimelineMergeLeft = () => {
    if (!selectedBlockId) return;
    if (wordLineToggle === 'WORD') {
      let targetCaptionIndex = -1;
      let wordIndex = -1;
      for (let i = 0; i < captions.length; i++) {
        if (captions[i].words) {
          const wIdx = captions[i].words.findIndex((w: any) => w.id === selectedBlockId);
          if (wIdx !== -1) {
            targetCaptionIndex = i;
            wordIndex = wIdx;
            break;
          }
        }
      }
      
      if (targetCaptionIndex > 0 && wordIndex === 0) {
          const targetCaption = captions[targetCaptionIndex];
          const prevCaption = captions[targetCaptionIndex - 1];
          const targetWords = targetCaption.text.split(/\s+/);
          const wordToMove = targetWords.splice(wordIndex, 1)[0];
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
    } else {
        const targetCaptionIndex = captions.findIndex((c, idx) => (c.id ?? idx) === selectedBlockId);
        if (targetCaptionIndex > 0) {
            const targetCaption = captions[targetCaptionIndex];
            const prevCaption = captions[targetCaptionIndex - 1];
            const newCaptionsList = [...captions];
            newCaptionsList[targetCaptionIndex - 1] = {
                ...prevCaption,
                text: prevCaption.text + ' ' + targetCaption.text,
                end: targetCaption.end
            };
            newCaptionsList.splice(targetCaptionIndex, 1);
            setCaptions(newCaptionsList);
        }
    }
  };

  const handleTimelineMergeRight = () => {
    if (!selectedBlockId) return;
    if (wordLineToggle === 'WORD') {
      let targetCaptionIndex = -1;
      let wordIndex = -1;
      for (let i = 0; i < captions.length; i++) {
        if (captions[i].words) {
          const wIdx = captions[i].words.findIndex((w: any) => w.id === selectedBlockId);
          if (wIdx !== -1) {
            targetCaptionIndex = i;
            wordIndex = wIdx;
            break;
          }
        }
      }

      if (targetCaptionIndex !== -1 && targetCaptionIndex < captions.length - 1) {
          const targetCaption = captions[targetCaptionIndex];
          const nextCaption = captions[targetCaptionIndex + 1];
          const targetWords = targetCaption.text.split(/\s+/);
          if (wordIndex === targetWords.length - 1) {
              const wordToMove = targetWords.splice(wordIndex, 1)[0];
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
      }
    } else {
        const targetCaptionIndex = captions.findIndex((c, idx) => (c.id ?? idx) === selectedBlockId);
        if (targetCaptionIndex !== -1 && targetCaptionIndex < captions.length - 1) {
            const targetCaption = captions[targetCaptionIndex];
            const nextCaption = captions[targetCaptionIndex + 1];
            const newCaptionsList = [...captions];
            newCaptionsList[targetCaptionIndex] = {
                ...targetCaption,
                text: targetCaption.text + ' ' + nextCaption.text,
                end: nextCaption.end
            };
            newCaptionsList.splice(targetCaptionIndex + 1, 1);
            setCaptions(newCaptionsList);
        }
    }
  };

  const handleTimelineDelete = () => {
    if (selectedBlockIds.length === 0) return;
    if (wordLineToggle === 'WORD') {
      setCaptions(prev => {
        return prev.map(c => {
          if (!c.words) return c;
          const remainingWords = c.words.filter((w: any) => !selectedBlockIds.includes(w.id));
          const newText = remainingWords.map((w: any) => w.text).join(' ');
          return { ...c, text: newText, words: remainingWords };
        }).filter(c => c.text.trim().length > 0);
      });
    } else {
      setCaptions(prev => prev.filter((c, idx) => !selectedBlockIds.includes(c.id ?? idx)));
    }
    setSelectedBlockIds([]);
  };

  const renderWaveform = () => {
    const maxTime = Math.max(audioDuration || durationRef.current || 0, displayCaptions.length > 0 ? Math.max(...displayCaptions.map(c => c.end)) : 5);
    const pxPerSec = 200 * zoomLevel;
    const totalWidth = Math.max(1200, (maxTime + 2) * pxPerSec);
    
    return <WaveformCanvas audioData={audioData} totalWidth={totalWidth} duration={audioDuration || durationRef.current || maxTime} pxPerSec={pxPerSec} />;
  };
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

  const [showCaptionTools, setShowCaptionTools] = useState(false);
  const [wordsMode, setWordsMode] = useState('Default');
  const [maxChars, setMaxChars] = useState(24);
  const [linesMode, setLinesMode] = useState('1 Line');
  const [removePunctuation, setRemovePunctuation] = useState(false);
  const [removeEmphasis, setRemoveEmphasis] = useState(false);
  const [removeGaps, setRemoveGaps] = useState(false);
  const [removeEmojis, setRemoveEmojis] = useState(false);
  const [captionDelay, setCaptionDelay] = useState(0);

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

  const generateWordsForChunk = (c: any, cIdx?: number) => {
    const chunk = { ...c };
    if (!chunk.id) {
      chunk.id = cIdx !== undefined ? cIdx + 1 : (Date.now() + Math.random());
    }
    if (chunk.words && chunk.words.length > 0) {
      chunk.words = chunk.words.map((w: any, i: number) => {
        const wordCopy = { ...w };
        if (!wordCopy.id) {
          wordCopy.id = `w-${chunk.id}-${i}`;
        }
        return wordCopy;
      });
      return chunk;
    }
    const wordsList = (chunk.text || '').split(/\s+/).filter((w: string) => w.trim().length > 0);
    const duration = chunk.end - chunk.start;
    const timePerWord = duration / Math.max(1, wordsList.length);
    const words = wordsList.map((w: string, i: number) => {
      const hasPunctuation = /[.,!?]/.test(w);
      const gapRatio = hasPunctuation ? 0.4 : 0.15;
      const gapTime = timePerWord * gapRatio;
      return {
        id: `w-${chunk.id}-${i}`,
        text: w,
        start: chunk.start + i * timePerWord,
        end: chunk.start + (i + 1) * timePerWord - gapTime
      };
    });
    return { ...chunk, words };
  };

  const handleToggleWordEmphasis = (captionId: number, wordIndex: number) => {
    setCaptions(prev => prev.map(c => {
      if (c.id !== captionId) return c;
      let chunk = { ...c };
      if (!chunk.words || chunk.words.length === 0) {
        chunk = generateWordsForChunk(chunk);
      }
      const updatedWords = chunk.words.map((w: any, idx: number) => {
        if (idx === wordIndex) {
          const isEmphasized = !w.emphasis;
          return {
            ...w,
            emphasis: isEmphasized,
            spotlight: isEmphasized ? false : w.spotlight
          };
        }
        return w;
      });
      return { ...chunk, words: updatedWords };
    }));
  };

  const handleToggleWordSpotlight = (captionId: number, wordIndex: number) => {
    setCaptions(prev => prev.map(c => {
      if (c.id !== captionId) return c;
      let chunk = { ...c };
      if (!chunk.words || chunk.words.length === 0) {
        chunk = generateWordsForChunk(chunk);
      }
      const updatedWords = chunk.words.map((w: any, idx: number) => {
        if (idx === wordIndex) {
          const isSpotlighted = !w.spotlight;
          return {
            ...w,
            spotlight: isSpotlighted,
            emphasis: isSpotlighted ? false : w.emphasis
          };
        }
        return w;
      });
      return { ...chunk, words: updatedWords };
    }));
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
  ].map((c, i) => generateWordsForChunk(c, i)));

  const [history, setHistory] = useState<any[][]>([captions]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(captions);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [captions]);

  const handleTimelineUndo = React.useCallback(() => {
    setHistoryIndex(prev => {
      if (prev > 0) {
        isUndoRedoRef.current = true;
        setCaptions(history[prev - 1]);
        return prev - 1;
      }
      return prev;
    });
  }, [history]);

  const handleTimelineRedo = React.useCallback(() => {
    setHistoryIndex(prev => {
      if (prev < history.length - 1) {
        isUndoRedoRef.current = true;
        setCaptions(history[prev + 1]);
        return prev + 1;
      }
      return prev;
    });
  }, [history]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleTimelineRedo();
        } else {
          handleTimelineUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleTimelineRedo();
        return;
      }

      // Space to Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (togglePlayRef.current) togglePlayRef.current();
        return;
      }

      // Left/Right Arrow to Nudge Selected Block(s)
      if (selectedBlockIds.length > 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const delta = e.key === 'ArrowLeft' ? -0.1 : 0.1;
        setCaptions(prev => {
          let updated = false;
          const newCaptions = prev.map(c => {
            let nextChunk = { ...c };
            if (selectedBlockIds.includes(c.id)) {
              updated = true;
              nextChunk.start = Math.max(0, nextChunk.start + delta);
              nextChunk.end = Math.max(0, nextChunk.end + delta);
            }
            if (nextChunk.words) {
              nextChunk.words = nextChunk.words.map((w: any) => {
                if (selectedBlockIds.includes(w.id)) {
                  updated = true;
                  return { ...w, start: Math.max(0, w.start + delta), end: Math.max(0, w.end + delta) };
                }
                return w;
              });
            }
            return nextChunk;
          });
          
          if (updated) {
            isUndoRedoRef.current = true;
            return newCaptions;
          }
          return prev;
        });
        return;
      }

      // 'S' key to Split Block at Playhead
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        setCaptions(prev => {
          const t = currentTimeRef.current;
          const targetIndex = prev.findIndex(c => t > c.start && t < c.end);
          if (targetIndex !== -1) {
            const targetCaption = prev[targetIndex];
            const proportion = (t - targetCaption.start) / (targetCaption.end - targetCaption.start);
            const splitIdx = Math.floor(targetCaption.text.length * proportion);
            
            let safeSplitIdx = splitIdx;
            while (safeSplitIdx > 0 && targetCaption.text[safeSplitIdx] !== ' ') {
              safeSplitIdx--;
            }
            if (safeSplitIdx === 0) safeSplitIdx = splitIdx; // fallback to hard split

            const firstText = targetCaption.text.slice(0, safeSplitIdx).trim();
            const secondText = targetCaption.text.slice(safeSplitIdx).trim();

            if (firstText && secondText) {
              const newCaptions = [...prev];
              newCaptions[targetIndex] = { ...targetCaption, end: t, text: firstText, words: [] };
              newCaptions.splice(targetIndex + 1, 0, {
                ...targetCaption,
                id: Date.now(),
                start: t,
                text: secondText,
                words: []
              });
              return newCaptions;
            }
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTimelineUndo, handleTimelineRedo, selectedBlockId]);

  const handleCaptionChange = (id: number, newText: string) => {
    setCaptions(captions.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  const displayCaptions = React.useMemo(() => {
    let result = captions.map((c, cIdx) => {
      let words = c.words ? c.words.map((w: any, i: number) => ({ 
        ...w,
        text: w.text || w.word || '',
        id: w.id || `w-${c.id ?? cIdx}-${i}`
      })) : [];
      if (words.length === 0) {
        words = generateWordsForChunk(c, cIdx).words;
      }
      return { ...c, id: c.id ?? cIdx, words };
    });
    
    if (removePunctuation) {
      result.forEach(c => {
        c.text = c.text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        if (c.words) c.words.forEach((w: any) => w.text = w.text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""));
      });
    }
    if (removeEmphasis) {
      result.forEach(c => {
        c.text = c.text.replace(/[*_~]/g, "");
        if (c.words) c.words.forEach((w: any) => w.text = w.text.replace(/[*_~]/g, ""));
      });
    }
    if (removeEmojis) {
      result.forEach(c => {
        c.text = c.text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
        if (c.words) c.words.forEach((w: any) => w.text = w.text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ""));
      });
    }
    if (removeGaps) {
      for (let i = 0; i < result.length - 1; i++) {
        if (result[i].end < result[i+1].start) {
          result[i].end = result[i+1].start;
        }
      }
    }
    return result;
  }, [captions, removePunctuation, removeEmphasis, removeEmojis, removeGaps]);

  const selectionBoxRef = useRef(selectionBox);
  useEffect(() => { selectionBoxRef.current = selectionBox; }, [selectionBox]);
  const wordLineToggleRef = useRef(wordLineToggle);
  useEffect(() => { wordLineToggleRef.current = wordLineToggle; }, [wordLineToggle]);
  const displayCaptionsRef = useRef(displayCaptions);
  useEffect(() => { displayCaptionsRef.current = displayCaptions; }, [displayCaptions]);

  useEffect(() => {
    if (wordsMode === 'Default') return;
    const wordsPerCaption = parseInt(wordsMode.split(' ')[0]);
    if (isNaN(wordsPerCaption)) return;

    setCaptions(prev => {
      const allWords: any[] = [];
      prev.forEach(c => {
        if (c.words && c.words.length > 0) {
          allWords.push(...c.words);
        } else {
          allWords.push(...generateWordsForChunk(c).words);
        }
      });

      const newCaptions = [];
      for (let i = 0; i < allWords.length; i += wordsPerCaption) {
        const chunk = allWords.slice(i, i + wordsPerCaption);
        if (chunk.length > 0) {
          newCaptions.push({
            id: Date.now() + i,
            start: chunk[0].start,
            end: chunk[chunk.length - 1].end,
            text: chunk.map(w => w.text).join(' '),
            words: chunk
          });
        }
      }
      return newCaptions;
    });
  }, [wordsMode]);

  const applyMaxChars = (charLimit: number, linesOpt?: string) => {
    if (charLimit <= 0) return;
    const currentLinesMode = linesOpt || linesMode;
    const numLines = parseInt(currentLinesMode.split(' ')[0]) || 1;
    const limit = charLimit * numLines;

    setCaptions(prev => {
      const allWords: any[] = [];
      prev.forEach(c => {
        if (c.words && c.words.length > 0) {
          allWords.push(...c.words);
        } else {
          allWords.push(...generateWordsForChunk(c).words);
        }
      });

      const newCaptions = [];
      let currentChunk: any[] = [];
      let currentLength = 0;
      
      allWords.forEach(w => {
        if (currentLength + w.text.length + (currentChunk.length > 0 ? 1 : 0) > limit && currentChunk.length > 0) {
          newCaptions.push({
            id: Date.now() + Math.random(),
            start: currentChunk[0].start,
            end: currentChunk[currentChunk.length - 1].end,
            text: currentChunk.map(cw => cw.text).join(' '),
            words: currentChunk
          });
          currentChunk = [w];
          currentLength = w.text.length;
        } else {
          currentChunk.push(w);
          currentLength += w.text.length + (currentChunk.length > 1 ? 1 : 0);
        }
      });
      
      if (currentChunk.length > 0) {
        newCaptions.push({
          id: Date.now() + Math.random(),
          start: currentChunk[0].start,
          end: currentChunk[currentChunk.length - 1].end,
          text: currentChunk.map(cw => cw.text).join(' '),
          words: currentChunk
        });
      }
      return newCaptions;
    });
  };

  const applyCaptionDelay = () => {
    if (captionDelay !== 0) {
      setCaptions(prev => prev.map(c => ({
        ...c,
        start: Math.max(0, c.start + captionDelay),
        end: Math.max(0, c.end + captionDelay)
      })));
      setCaptionDelay(0);
    }
  };

  const allMatches = React.useMemo(() => {
    if (!searchQuery) return [];
    const matches: { captionId: number, matchStringIndex: number, matchLength: number, wordIndices: number[] }[] = [];
    try {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');

      displayCaptions.forEach((caption) => {
        const found = [...caption.text.matchAll(regex)];

        const words = caption.text.split(/\s+/);
        const wordBounds: { start: number, end: number }[] = [];
        let currentIndex = 0;
        words.forEach((w: string) => {
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
    } catch { }
    return matches;
  }, [displayCaptions, searchQuery]);

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

    const captionIndex = captions.findIndex((c, idx) => (c.id ?? idx) === match.captionId);
    if (captionIndex !== -1) {
      const targetCaption = captions[captionIndex];
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const newText = targetCaption.text.replace(regex, replaceQuery);

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

    setSelectedFileToUpload(file);
    setShowModeModal(true);
    e.target.value = '';
  };

  const startUpload = () => {
    if (!selectedFileToUpload) return;
    setShowModeModal(false);

    const file = selectedFileToUpload;
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

          // Now trigger transcription automatically if there's audio
          if (data.audio_filename) {
            setTranscribing(true);
            setUploadStage('transcribing');
            const transcribeResponse = await fetch(`${API_BASE_URL}/api/captions/${data.id}/transcribe`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ mode: transcriptionMode })
            });

            if (!transcribeResponse.ok) {
              throw new Error('Transcription failed');
            }

            const transcribeData = await transcribeResponse.json();
            console.log('Transcription successful:', transcribeData);

            // Sync new captions with editor
            if (transcribeData.segments) {
              setCaptions(transcribeData.segments.map((c: any, i: number) => generateWordsForChunk(c, i)));
            }
          } else {
            console.log('No audio stream detected. Skipping transcription.');
          }

          setUploadStage('success');
        } catch (err: any) {
          console.error('Processing error:', err);
          setProcessingError(err?.message || 'Failed to process and transcribe video.');
          setUploadStage('error');
        } finally {
          setIsUploading(false);
          setTranscribing(false);
          setSelectedFileToUpload(null);
        }
      } else {
        setProcessingError('Upload failed. Please check your network connection and try again.');
        setUploadStage('error');
        setIsUploading(false);
        setSelectedFileToUpload(null);
      }
    };

    xhr.onerror = () => {
      setProcessingError('Network error occurred during file upload.');
      setUploadStage('error');
      setIsUploading(false);
      setSelectedFileToUpload(null);
    };

    xhr.send(formData);
  };

  return (
    <div className="relative flex h-screen max-h-screen w-full bg-[#000000] text-[#e0e0e0] font-sans overflow-hidden">

      {/* Transcription Mode Selection Modal */}
      {showModeModal && (
        <div className="absolute inset-0 bg-[#0f0f11]/95 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="w-[360px] bg-[#161618] border border-[#2a2a2d] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col gap-2 text-center">
              <h3 className="font-bold text-white text-lg">Transcription Settings</h3>
              <p className="text-xs text-[#8a8a8e]">Select the language mode for transcription before uploading.</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-[#8a8a8e] font-semibold uppercase tracking-wider ml-1">Language Mode</label>
              <select
                value={transcriptionMode}
                onChange={(e) => setTranscriptionMode(e.target.value)}
                className="w-full bg-[#2a2a2d] border border-white/10 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-[#52c595] cursor-pointer"
              >
                <option value="native_language" className="bg-zinc-900 text-white">Native Language</option>
                <option value="native_english" className="bg-zinc-900 text-white">Native+English</option>
                <option value="english" className="bg-zinc-900 text-white">English (Roman)</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModeModal(false);
                  setSelectedFileToUpload(null);
                }}
                className="flex-1 py-2.5 bg-[#2a2a2d] hover:bg-[#3a3a3d] text-white font-semibold text-xs rounded-xl transition-colors focus:outline-none border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={startUpload}
                className="flex-1 py-2.5 bg-[#52c595] hover:bg-[#43b384] text-black font-semibold text-xs rounded-xl transition-colors focus:outline-none"
              >
                Start Upload
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="flex-1 flex flex-col min-w-0 h-full max-h-full overflow-hidden p-2">
        <PanelGroup orientation="horizontal">

          {/* LEFT COLUMN: Captions + Timeline */}
          <Panel defaultSize={52} minSize={20} className="flex flex-col overflow-hidden">
            <PanelGroup orientation="vertical">

              {/* TOP: Captions List */}
              <Panel defaultSize={65} minSize={30} className="flex flex-row overflow-hidden relative rounded-xl border border-[#2a2a2d] bg-[#1a1a1c]">

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
                    <span className="text-[10px] font-medium text-center leading-tight">Custom<br />Fonts</span>
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
                      <button
                        onClick={() => setShowCaptionTools(!showCaptionTools)}
                        className={`h-8 px-3 rounded-md flex items-center gap-2 text-xs font-semibold transition-colors border border-[#52c595]/20 ${showCaptionTools ? 'bg-[#222225] text-[#52c595]' : 'bg-[#2a2a2d] hover:bg-[#3a3a3d] text-[#52c595]'}`}
                      >
                        <Settings className="w-3.5 h-3.5" /> Caption Tools {showCaptionTools && <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                {/* Caption Tools Panel */}
                {showCaptionTools && (
                  <div className="bg-[#111111] border-b border-[#2a2a2d] p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                    
                    {/* DISPLAY SETTINGS */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-[#8a8a8e] text-[10px] font-bold uppercase tracking-wider before:h-px before:flex-1 before:bg-[#2a2a2d] after:h-px after:flex-1 after:bg-[#2a2a2d]">
                        DISPLAY SETTINGS
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-[#8a8a8e]">Words</label>
                          <CustomSelect 
                            value={wordsMode}
                            onChange={setWordsMode}
                            options={['Default', '1 Word', '2 Words', '3 Words', '4 Words', '5 Words']}
                            icon={<Type className="w-3.5 h-3.5" />}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 relative">
                          <label className="text-[10px] text-[#8a8a8e]">Max Chars</label>
                          <div className="flex bg-[#1a1a1c] border border-[#2a2a2d] rounded-md overflow-hidden focus-within:border-[#52c595] min-h-[32px]">
                            <div className="flex items-center justify-center pl-3 pr-2 text-[#8a8a8e]">
                              <Type className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="number"
                              value={maxChars}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMaxChars(val);
                                if (val > 0) applyMaxChars(val);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && maxChars > 0) {
                                  applyMaxChars(maxChars);
                                }
                              }}
                              className="w-full bg-transparent py-1 text-xs text-white focus:outline-none"
                            />
                            <button 
                              onClick={() => {
                                if (maxChars > 0) applyMaxChars(maxChars);
                              }}
                              className="flex items-center justify-center pr-3 pl-2 text-[#8a8a8e] hover:text-white"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-[#8a8a8e]">Lines</label>
                          <CustomSelect 
                            value={linesMode}
                            onChange={(val) => {
                              setLinesMode(val);
                              if (maxChars > 0) applyMaxChars(maxChars, val);
                            }}
                            options={['1 Line', '2 Lines', '3 Lines', '4 Lines', '5 Lines']}
                            icon={<AlignLeft className="w-3.5 h-3.5" />}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-[#8a8a8e] text-[10px] font-bold uppercase tracking-wider before:h-px before:flex-1 before:bg-[#2a2a2d] after:h-px after:flex-1 after:bg-[#2a2a2d]">
                        ACTIONS
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* Remove Punctuation */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1c] border border-[#2a2a2d]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 bg-[#2a2a2d] rounded-md">
                              <TypeOutline className="w-4 h-4 text-[#8a8a8e]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">Remove Punctuation</span>
                              <span className="text-xs text-[#8a8a8e]">Strip all punctuation for a cleaner, minimal look</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setRemovePunctuation(!removePunctuation)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${removePunctuation ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all`} style={{ left: removePunctuation ? '22px' : '2px' }} />
                          </button>
                        </div>

                        {/* Remove Emphasis */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1c] border border-[#2a2a2d]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 bg-[#2a2a2d] rounded-md">
                              <TypeOutline className="w-4 h-4 text-[#8a8a8e]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">Remove Emphasis</span>
                              <span className="text-xs text-[#8a8a8e]">Remove all text emphasis for uniform appearance</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setRemoveEmphasis(!removeEmphasis)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${removeEmphasis ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all`} style={{ left: removeEmphasis ? '22px' : '2px' }} />
                          </button>
                        </div>

                        {/* Remove Gaps */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1c] border border-[#2a2a2d]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 bg-[#2a2a2d] rounded-md">
                              <TypeOutline className="w-4 h-4 text-[#8a8a8e]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">Remove Gaps in Captions</span>
                              <span className="text-xs text-[#8a8a8e]">Eliminate gaps between captions for seamless flow</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setRemoveGaps(!removeGaps)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${removeGaps ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all`} style={{ left: removeGaps ? '22px' : '2px' }} />
                          </button>
                        </div>

                        {/* Remove Emojis */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a1a1c] border border-[#2a2a2d]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-1.5 bg-[#2a2a2d] rounded-md">
                              <TypeOutline className="w-4 h-4 text-[#8a8a8e]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white text-opacity-50">Remove Emojis</span>
                              <span className="text-xs text-[#8a8a8e] opacity-50">Remove all emojis from captions</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setRemoveEmojis(!removeEmojis)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${removeEmojis ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'} opacity-50`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-[#8a8a8e] absolute top-0.5 transition-all`} style={{ left: removeEmojis ? '22px' : '2px' }} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* TIMING */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-[#8a8a8e] text-[10px] font-bold uppercase tracking-wider before:h-px before:flex-1 before:bg-[#2a2a2d] after:h-px after:flex-1 after:bg-[#2a2a2d]">
                        TIMING
                      </div>
                      
                      <div className="flex flex-col p-4 rounded-xl bg-[#1a1a1c] border border-[#2a2a2d] gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-[#2a2a2d] rounded-md">
                              <RotateCcw className="w-4 h-4 text-[#8a8a8e]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">Caption Delay Control</span>
                              <span className="text-xs text-[#8a8a8e]">Shift all captions earlier or later in time</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#8a8a8e]">{captionDelay === 0 ? 'No delay' : `${captionDelay > 0 ? '+' : ''}${captionDelay}s`}</span>
                            <button onClick={() => setCaptionDelay(0)} className="text-[#8a8a8e] hover:text-white transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[#8a8a8e] w-6 text-right">-5s</span>
                          <input 
                            type="range"
                            min="-5"
                            max="5"
                            step="0.1"
                            value={captionDelay}
                            onChange={(e) => setCaptionDelay(parseFloat(e.target.value))}
                            onMouseUp={applyCaptionDelay}
                            onPointerUp={applyCaptionDelay}
                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-[10px] text-[#8a8a8e] w-6">+5s</span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

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
                    {displayCaptions.map((caption, i) => {
                      const isActive = caption.id === activeCaptionId;
                      return (
                        <div
                          key={caption.id}
                          onClick={() => seekRef.current?.(caption.start)}
                          className={`flex items-start gap-4 px-5 py-4 border-b border-[#2a2a2d] hover:bg-[#222225] transition-colors group cursor-pointer ${isActive ? 'bg-[#222225]/45' : ''
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
                              {caption.text.split(/\s+/).map((word: string, wordIndex: number) => {
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
                                const wordObj = caption.words && caption.words[wordIndex];
                                const isWordSpecial = wordObj && (wordObj.emphasis || wordObj.spotlight);

                                let finalStyle = matchStyle;
                                if (isWordSpecial && !isPartOfActiveMatch && !isPartOfAnyMatch) {
                                  finalStyle = 'bg-[#52c595]/10 text-[#52c595] px-2 py-0.5 rounded-md border border-[#52c595]/20 font-medium';
                                }

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
                                    className={`px-1 py-[2px] rounded transition-all cursor-pointer ${finalStyle}`}
                                  >
                                    {word}
                                  </span>
                                );
                              })}
                            </div>
                          )}


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
                            handleToggleWordEmphasis(wordMenu.captionId, wordMenu.wordIndex);
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
                            handleToggleWordSpotlight(wordMenu.captionId, wordMenu.wordIndex);
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
                            const targetCaptionIndex = captions.findIndex((c, idx) => (c.id ?? idx) === wordMenu.captionId);
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
                            const targetCaptionIndex = captions.findIndex((c, idx) => (c.id ?? idx) === wordMenu.captionId);
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
                            const targetCaptionIndex = captions.findIndex((c, idx) => (c.id ?? idx) === wordMenu.captionId);
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
              <Panel defaultSize={35} minSize={15} className="bg-[#161618] flex flex-col relative overflow-hidden rounded-xl border border-[#2a2a2d]">
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
                    <div className="flex items-center gap-1 hidden 2xl:flex">
                      <button 
                        onClick={handleTimelineUndo}
                        disabled={historyIndex <= 0}
                        className={`p-1.5 rounded hover:bg-[#2a2a2d] transition-colors ${historyIndex > 0 ? 'text-[#8a8a8e] hover:text-white cursor-pointer' : 'text-[#444] cursor-not-allowed'}`}
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={handleTimelineRedo}
                        disabled={historyIndex >= history.length - 1}
                        className={`p-1.5 rounded hover:bg-[#2a2a2d] transition-colors ${historyIndex < history.length - 1 ? 'text-[#8a8a8e] hover:text-white cursor-pointer' : 'text-[#444] cursor-not-allowed'}`}
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={handleTimelineMergeLeft} 
                        className={`p-1.5 rounded hover:bg-[#2a2a2d] transition-colors ${selectedBlockId ? 'text-[#8a8a8e] hover:text-white cursor-pointer' : 'text-[#444] cursor-not-allowed'}`}
                        disabled={!selectedBlockId}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={handleTimelineMergeRight} 
                        className={`p-1.5 rounded hover:bg-[#2a2a2d] transition-colors ${selectedBlockId ? 'text-[#8a8a8e] hover:text-white cursor-pointer' : 'text-[#444] cursor-not-allowed'}`}
                        disabled={!selectedBlockId}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={handleTimelineDelete} 
                        className={`p-1.5 rounded transition-colors ${selectedBlockId ? 'text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer' : 'text-[#444] cursor-not-allowed hover:bg-[#2a2a2d]'}`}
                        disabled={!selectedBlockId}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ZoomOut 
                      className="w-3.5 h-3.5 text-[#8a8a8e] cursor-pointer hover:text-white transition-colors" 
                      onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))} 
                    />
                    <div className="w-16 lg:w-24 h-1 relative flex items-center group">
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1" 
                        value={zoomLevel} 
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className="w-full h-1 bg-[#2a2a2d] rounded-full cursor-pointer accent-white"
                        style={{
                          background: `linear-gradient(to right, white ${((zoomLevel - 0.5) / 2.5) * 100}%, #2a2a2d ${((zoomLevel - 0.5) / 2.5) * 100}%)`
                        }}
                      />
                    </div>
                    <ZoomIn 
                      className="w-3.5 h-3.5 text-[#8a8a8e] ml-2 cursor-pointer hover:text-white transition-colors" 
                      onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))} 
                    />
                  </div>
                </div>

                {/* Timeline Tracks */}
                <div 
                  ref={timelineScrollRef} 
                  className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#161618] custom-scrollbar"
                  onWheel={(e) => {
                    if (e.deltaY !== 0 && timelineScrollRef.current) {
                      timelineScrollRef.current.scrollLeft += e.deltaY;
                    }
                  }}
                >
                  <div 
                    className="h-full relative select-none timeline-scroll-content" 
                    style={{ width: `${Math.max(1200, (Math.max(audioDuration || durationRef.current || 0, displayCaptions.length > 0 ? Math.max(...displayCaptions.map(c => c.end)) : 5)) * (200 * zoomLevel) + 400)}px` }} 
                    onMouseDown={handleTimelineMouseDown}
                  >
                    {/* Selection Marquee Box */}
                    {selectionBox && (
                      <div 
                        className="absolute border border-dashed border-[#52c595] bg-[#52c595]/10 z-40 pointer-events-none"
                        style={{
                          left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                          width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                          top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                          height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`
                        }}
                      />
                    )}
                    {/* Content */}
                    <div className="absolute top-0 left-0 w-full flex flex-col h-full justify-start">
                      {/* Time markers */}
                      <div 
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          isDraggingTimelineRef.current = true;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const pxPerSec = 200 * zoomLevel;
                          const time = Math.max(0, x / pxPerSec);
                          if (seekRef.current) seekRef.current(time);
                        }}
                        className="absolute top-0 w-full h-6 border-b border-[#2a2a2d]/50 bg-[#161618] select-none z-20 cursor-pointer"
                      >
                        {(() => {
                          const maxTime = Math.max(audioDuration || durationRef.current || 0, displayCaptions.length > 0 ? Math.max(...displayCaptions.map(c => c.end)) : 5);
                          const markers = [];
                          for (let i = 0.5; i <= maxTime + 2; i += 0.5) {
                            const mins = Math.floor(i / 60).toString().padStart(2, '0');
                            const secs = Math.floor(i % 60).toString().padStart(2, '0');
                            const ms = ((i % 1) * 1000).toString().padStart(3, '0');
                            markers.push(
                              <div key={i} className="absolute text-[10px] text-[#52c595] font-mono tracking-tighter pointer-events-none" style={{ left: `${i * (200 * zoomLevel)}px` }}>
                                {mins}:{secs}.{ms}
                              </div>
                            );
                          }
                          return markers;
                        })()}
                      </div>

                      {/* Tracks Area (Middle) */}
                      <div className="h-16 shrink-0 mt-6 relative z-10 pt-2">
                        {(() => {
                          const pxPerSec = 200 * zoomLevel;
                          return wordLineToggle === 'LINE' ? (
                            displayCaptions.map((c, i) => {
                              const start = (optimisticTimings[c.id]?.start ?? c.start);
                              const end = (optimisticTimings[c.id]?.end ?? c.end);
                              const minStart = i > 0 ? displayCaptions[i-1].end : 0;
                              const maxEnd = i < displayCaptions.length - 1 ? displayCaptions[i+1].start : Infinity;
                              return (
                                <div 
                                  key={c.id} 
                                  id={`line-block-${c.id}`}
                                  className={`timeline-block absolute h-10 bg-[#afa667] text-white text-[11px] font-bold rounded-sm flex flex-col justify-center px-2 truncate shadow-sm hover:brightness-110 cursor-grab active:cursor-grabbing border-r border-[#989155] border-y border-l ${(draggingBlock?.id === c.id || selectedBlockIds.includes(c.id)) ? 'ring-2 ring-blue-500 z-10' : ''}`}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setSelectedBlockIds(prev => {
                                      if (e.shiftKey) {
                                        return prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id];
                                      }
                                      return [c.id];
                                    });
                                    setDraggingBlock({ id: c.id, type: 'line', action: 'move', startX: e.clientX, initialStart: start, initialEnd: end, minStart, maxEnd });
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBlockIds(prev => {
                                      if (e.shiftKey) {
                                        return prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id];
                                      }
                                      return [c.id];
                                    });
                                    if (!draggingBlock && seekRef.current) seekRef.current(start);
                                  }}
                                  style={{ 
                                    left: `${start * pxPerSec}px`, 
                                    width: `${Math.max(10, (end - start) * pxPerSec - 6)}px` 
                                  }}
                                >
                                  {/* Left Handle */}
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-sm"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setDraggingBlock({ id: c.id, type: 'line', action: 'resize-left', startX: e.clientX, initialStart: start, initialEnd: end, minStart, maxEnd });
                                    }}
                                  />
                                  <span className="truncate w-full leading-tight pointer-events-none">{c.text}</span>
                                  <span className="text-[8px] font-medium text-white/80 flex items-center gap-0.5 mt-[1px] tracking-wide pointer-events-none"><span className="italic mr-0.5 text-white/60 font-serif">I</span> Text</span>
                                  {/* Right Handle */}
                                  <div 
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-sm"
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setDraggingBlock({ id: c.id, type: 'line', action: 'resize-right', startX: e.clientX, initialStart: start, initialEnd: end, minStart, maxEnd });
                                    }}
                                  />
                                </div>
                              );
                            })
                          ) : (
                            displayCaptions.flatMap((c) => {
                              return (c.words || []).map((w: any, i: number) => {
                                const wStart = (optimisticTimings[w.id]?.start ?? w.start);
                                const wEnd = (optimisticTimings[w.id]?.end ?? w.end);
                                const minStart = i > 0 ? c.words[i-1].end : c.start;
                                const maxEnd = i < c.words.length - 1 ? c.words[i+1].start : c.end;
                                
                                return (
                                  <div 
                                    key={w.id}
                                    id={`word-block-${w.id}`}
                                    className={`timeline-block absolute h-10 bg-[#afa667] text-white text-[11px] font-bold rounded-sm flex flex-col justify-center px-2 truncate shadow-sm hover:brightness-110 cursor-grab active:cursor-grabbing border border-[#989155] ${(draggingBlock?.id === w.id || selectedBlockIds.includes(w.id)) ? 'ring-2 ring-blue-500 z-10' : ''}`}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      setSelectedBlockIds(prev => {
                                        if (e.shiftKey) {
                                          return prev.includes(w.id) ? prev.filter(x => x !== w.id) : [...prev, w.id];
                                        }
                                        return [w.id];
                                      });
                                      setDraggingBlock({ id: w.id, type: 'word', action: 'move', startX: e.clientX, initialStart: wStart, initialEnd: wEnd, minStart, maxEnd });
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBlockIds(prev => {
                                        if (e.shiftKey) {
                                          return prev.includes(w.id) ? prev.filter(x => x !== w.id) : [...prev, w.id];
                                        }
                                        return [w.id];
                                      });
                                      if (!draggingBlock && seekRef.current) seekRef.current(wStart);
                                    }}
                                    style={{ 
                                      left: `${wStart * pxPerSec}px`, 
                                      width: `${Math.max(10, (wEnd - wStart) * pxPerSec)}px` 
                                    }}
                                  >
                                    {/* Left Handle */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-sm"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setDraggingBlock({ id: w.id, type: 'word', action: 'resize-left', startX: e.clientX, initialStart: wStart, initialEnd: wEnd, minStart, maxEnd });
                                      }}
                                    />
                                    <span className="truncate w-full leading-tight pointer-events-none">{w.text}</span>
                                    <span className="text-[8px] font-medium text-white/80 flex items-center gap-0.5 mt-[1px] tracking-wide pointer-events-none"><span className="italic mr-0.5 text-white/60 font-serif">I</span> Text</span>
                                    {/* Right Handle */}
                                    <div 
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-sm"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setDraggingBlock({ id: w.id, type: 'word', action: 'resize-right', startX: e.clientX, initialStart: wStart, initialEnd: wEnd, minStart, maxEnd });
                                      }}
                                    />
                                  </div>
                                );
                              });
                            })
                          );
                        })()}
                      </div>

                      {/* Waveform */}
                      <div className="h-14 shrink-0 w-full flex items-center opacity-70 border-y border-[#2a2a2d]/50 relative overflow-hidden bg-[#111111]/30 pointer-events-none">
                        <div className="h-full flex items-center">
                          {renderWaveform()}
                        </div>
                      </div>
                    </div>

                    {/* Playhead */}
                    <div ref={playheadRef} className="absolute top-0 bottom-0 w-[1px] bg-[#52c595] z-30 shadow-[0_0_4px_rgba(82,197,149,0.5)] origin-left will-change-transform" style={{ left: 0, pointerEvents: 'none' }}>
                      <div 
                        className="absolute -top-[1px] -left-[7px] cursor-ew-resize drop-shadow-md"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          isDraggingTimelineRef.current = true;
                          seekFromMouseEvent(e as any);
                        }}
                      >
                        <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0 0H15V11L7.5 18L0 11V0Z" fill="#52c595"/>
                        </svg>
                      </div>
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
            captions={displayCaptions}
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
            hoveredEmphasisFontFamily={hoveredEmphasisFontFamily}
            hoveredEmphasisFontFace={hoveredEmphasisFontFace}
            hoveredSpotlightFontFamily={hoveredSpotlightFontFamily}
            hoveredSpotlightFontFace={hoveredSpotlightFontFace}
            spotlightGradientStops={spotlightGradientStops}
            spotlightGradientAngle={spotlightGradientAngle}
            spotlightGradientLevel={spotlightGradientLevel}
            removeEmphasis={removeEmphasis}
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
            togglePlayRef={togglePlayRef}
            linesMode={linesMode}
            currentTimeRef={currentTimeRef}
            durationRef={durationRef}
          />

          <PanelResizeHandle className="w-2 bg-transparent cursor-col-resize relative z-10 hover:bg-[#2a2a2d] transition-colors rounded-full mx-0.5 my-2" />

          {/* RIGHT COLUMN: Styling Options */}
          <Panel defaultSize={23} minSize={20} className="flex flex-col bg-[#161618] relative overflow-hidden rounded-xl border border-[#2a2a2d] right-sidebar-panel">
            {/* Horizontal Tabs */}
            <div className="flex border-b border-[#2a2a2d] px-2 pt-2">
              {['Text', 'Templates', 'Transitions', 'Audio'].map(tab => (
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
                            {key === 'emphasis' ? (
                              <div className="flex flex-col gap-4 mr-2">
                                {(() => {
                                  const isEmp = emphasisTab === 'emphasize';
                                  const mode = isEmp ? emphasisMode : spotlightMode;
                                  const setMode = isEmp ? setEmphasisMode : setSpotlightMode;
                                  const colorVal = isEmp ? emphasisColor : spotlightColor;
                                  const setColorVal = isEmp ? setEmphasisColor : setSpotlightColor;
                                  const sizeVal = isEmp ? emphasisSize : spotlightSize;
                                  const setSizeVal = isEmp ? setEmphasisSize : setSpotlightSize;
                                  const glowVal = isEmp ? emphasisGlow : spotlightGlow;
                                  const setGlowVal = isEmp ? setEmphasisGlow : setSpotlightGlow;
                                  const fontVal = isEmp ? emphasisFont : spotlightFont;
                                  const setFontVal = isEmp ? setEmphasisFont : setSpotlightFont;
                                  const fontFaceVal = isEmp ? emphasisFontFace : spotlightFontFace;
                                  const setFontFaceVal = isEmp ? setEmphasisFontFace : setSpotlightFontFace;
                                  const styleFlagsVal = isEmp ? emphasisStyles : spotlightStyles;
                                  const setStyleFlagsVal = isEmp ? setEmphasisStyles : setSpotlightStyles;
                                  const setHoveredFontVal = isEmp ? setHoveredEmphasisFontFamily : setHoveredSpotlightFontFamily;
                                  const setHoveredFontFaceVal = isEmp ? setHoveredEmphasisFontFace : setHoveredSpotlightFontFace;

                                  // Gradient helpers
                                  const gradStops = isEmp ? emphasisGradientStops : spotlightGradientStops;
                                  const setGradStops = isEmp ? setEmphasisGradientStops : setSpotlightGradientStops;
                                  const gradAngle = isEmp ? emphasisGradientAngle : spotlightGradientAngle;
                                  const setGradAngle = isEmp ? setEmphasisGradientAngle : setSpotlightGradientAngle;
                                  const gradLevel = isEmp ? emphasisGradientLevel : spotlightGradientLevel;
                                  const setGradLevel = isEmp ? setEmphasisGradientLevel : setSpotlightGradientLevel;
                                  const activeStopIdVal = isEmp ? emphasisActiveStopId : spotlightActiveStopId;
                                  const setActiveStopIdVal = isEmp ? setEmphasisActiveStopId : setSpotlightActiveStopId;
                                  const openStopPickerIdVal = isEmp ? emphasisOpenStopPickerId : spotlightOpenStopPickerId;
                                  const setOpenStopPickerIdVal = isEmp ? setEmphasisOpenStopPickerId : setSpotlightOpenStopPickerId;
                                  const colorPickerRefVal = isEmp ? emphasisColorPickerRef : spotlightColorPickerRef;
                                  const stopsContainerRefVal = isEmp ? emphasisStopsContainerRef : spotlightStopsContainerRef;

                                  return (
                                    <div className="flex flex-col gap-4">
                                      {/* Emphasize / Spotlight Tabs */}
                                      <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] p-0.5">
                                        <button
                                          onClick={() => setEmphasisTab('emphasize')}
                                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-sm flex items-center justify-center transition-colors ${isEmp ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                        >
                                          Emphasize
                                        </button>
                                        <button
                                          onClick={() => setEmphasisTab('spotlight')}
                                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-sm flex items-center justify-center transition-colors ${!isEmp ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                        >
                                          Spotlight
                                        </button>
                                      </div>

                                      {/* Solid / Gradient Switcher */}
                                      <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] p-0.5">
                                        <button
                                          onClick={() => setMode('Solid')}
                                          className={`flex-1 py-1 text-[10px] font-semibold rounded-sm flex items-center justify-center gap-1.5 transition-colors ${mode === 'Solid' ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                        >
                                          Solid
                                        </button>
                                        <button
                                          onClick={() => setMode('Gradient')}
                                          className={`flex-1 py-1 text-[10px] font-semibold rounded-sm flex items-center justify-center gap-1.5 transition-colors ${mode === 'Gradient' ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                        >
                                          Gradient
                                        </button>
                                      </div>

                                      {/* Stops Row (Gradient Mode Only) */}
                                      {mode === 'Gradient' && (
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center text-xs text-[#8a8a8e]">
                                            <span>Stops</span>
                                            <button
                                              onClick={() => setGradStops(isEmp ? [
                                                { id: 1, position: 0, color: '#f3a63b', opacity: 100 },
                                                { id: 2, position: 100, color: '#ffef7d', opacity: 100 }
                                              ] : [
                                                { id: 1, position: 0, color: '#ffd900', opacity: 100 },
                                                { id: 2, position: 100, color: '#ffffff', opacity: 100 }
                                              ])}
                                              className="text-[10px] text-[#8a8a8e] hover:text-white flex items-center gap-1"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5" /> Reset
                                            </button>
                                          </div>
                                          <div ref={stopsContainerRefVal} className="relative pt-1 pb-6 px-2 bg-[#161618] rounded-md border border-[#2a2a2d] h-14 flex items-center">
                                            {/* The Gradient Visual Bar */}
                                            <div
                                              id="emphasis-gradient-stops-bar"
                                              className="w-full h-4 rounded shadow-inner border border-[#2a2a2d] relative cursor-pointer"
                                              style={{
                                                background: `linear-gradient(to right, ${[...gradStops].sort((a, b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ')})`
                                              }}
                                              onClick={(e) => {
                                                if (e.target !== e.currentTarget) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const clickX = e.clientX - rect.left;
                                                const pos = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
                                                const nextId = gradStops.length > 0 ? Math.max(...gradStops.map(s => s.id)) + 1 : 1;
                                                const newStop = { id: nextId, position: pos, color: '#ffffff', opacity: 100 };
                                                setGradStops(prev => [...prev, newStop]);
                                                setActiveStopIdVal(nextId);
                                                setOpenStopPickerIdVal(nextId);
                                              }}
                                            />
                                            {/* Draggable Stops */}
                                            {gradStops.map(stop => (
                                              <div
                                                key={stop.id}
                                                className="absolute bottom-1.5 cursor-ew-resize transform -translate-x-1/2 flex flex-col items-center z-10 select-none"
                                                style={{ left: `calc(${stop.position}% + 8px - (${stop.position / 100} * 16px))` }}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  setActiveStopIdVal(stop.id);
                                                  const startX = e.clientX;
                                                  const startPos = stop.position;
                                                  let hasDragged = false;

                                                  const onMouseMove = (moveEvent: MouseEvent) => {
                                                    const deltaX = Math.abs(moveEvent.clientX - startX);
                                                    if (deltaX > 3) {
                                                      hasDragged = true;
                                                    }

                                                    const bar = document.getElementById('emphasis-gradient-stops-bar');
                                                    if (bar) {
                                                      const rect = bar.getBoundingClientRect();
                                                      const deltaPercent = ((moveEvent.clientX - startX) / rect.width) * 100;
                                                      const newPos = Math.max(0, Math.min(100, Math.round(startPos + deltaPercent)));
                                                      setGradStops(prev => prev.map(s => s.id === stop.id ? { ...s, position: newPos } : s));
                                                    }
                                                  };

                                                  const onMouseUp = () => {
                                                    window.removeEventListener('mousemove', onMouseMove);
                                                    window.removeEventListener('mouseup', onMouseUp);

                                                    if (!hasDragged) {
                                                      setOpenStopPickerIdVal(openStopPickerIdVal === stop.id ? null : stop.id);
                                                    }
                                                  };

                                                  window.addEventListener('mousemove', onMouseMove);
                                                  window.addEventListener('mouseup', onMouseUp);
                                                }}
                                              >
                                                {/* Triangle indicator (turns blue on selection) */}
                                                <div className={`w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent ${activeStopIdVal === stop.id ? 'border-b-[#3b82f6] scale-125' : 'border-b-[#8a8a8e]'}`} />
                                                {/* Color circle indicator (turns blue border on selection) */}
                                                <div className={`w-3.5 h-3.5 rounded-full border-2 ${activeStopIdVal === stop.id ? 'border-[#3b82f6] scale-110 shadow-[0_0_4px_rgba(59,130,246,0.6)]' : 'border-white'} mt-0.5`} style={{ backgroundColor: stop.color }} />
                                              </div>
                                            ))}
                                          </div>

                                          {openStopPickerIdVal !== null && openStopPickerIdVal > 0 && (
                                            <div className="absolute right-0 bottom-full mb-2 z-50">
                                              {(() => {
                                                const activeStop = gradStops.find(s => s.id === openStopPickerIdVal);
                                                if (!activeStop) return null;
                                                return (
                                                  <StopColorPicker
                                                    color={activeStop.color}
                                                    opacity={activeStop.opacity}
                                                    positionPercent={activeStop.position}
                                                    onColorChange={(newCol: string) => {
                                                      setGradStops(prev => prev.map(s => s.id === openStopPickerIdVal ? { ...s, color: newCol } : s));
                                                    }}
                                                    onOpacityChange={(newOpacity: number) => {
                                                      setGradStops(prev => prev.map(s => s.id === openStopPickerIdVal ? { ...s, opacity: newOpacity } : s));
                                                    }}
                                                    onPositionChange={(newPos: number) => {
                                                      setGradStops(prev => prev.map(s => s.id === openStopPickerIdVal ? { ...s, position: newPos } : s));
                                                    }}
                                                    onRemove={() => {
                                                      setGradStops(prev => prev.filter(s => s.id !== openStopPickerIdVal));
                                                      setOpenStopPickerIdVal(null);
                                                      const remaining = gradStops.filter(s => s.id !== openStopPickerIdVal);
                                                      if (remaining.length > 0) {
                                                        setActiveStopIdVal(remaining[0].id);
                                                      }
                                                    }}
                                                    canRemove={gradStops.length > 2}
                                                  />
                                                );
                                              })()}
                                            </div>
                                          )}

                                          {/* Angle Slider */}
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs text-[#8a8a8e] w-16">Angle</span>
                                            <div className="flex-1 flex items-center gap-3">
                                              <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={gradAngle}
                                                onChange={(e) => setGradAngle(Number(e.target.value))}
                                                className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                              />
                                              <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                                {gradAngle}
                                              </div>
                                              <button
                                                onClick={() => setGradAngle(90)}
                                                className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
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
                                                onClick={() => setGradLevel('word')}
                                                className={`flex-1 py-1 text-[10px] font-semibold rounded-sm flex items-center justify-center gap-1 ${gradLevel === 'word' ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e]'}`}
                                              >
                                                Word
                                              </button>
                                              <button
                                                onClick={() => setGradLevel('char')}
                                                className={`flex-1 py-1 text-[10px] font-semibold rounded-sm flex items-center justify-center gap-1 ${gradLevel === 'char' ? 'bg-[#2a2a2d] text-white shadow' : 'text-[#8a8a8e]'}`}
                                              >
                                                Char
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Color Row (Solid Mode Only) */}
                                      {mode === 'Solid' && (
                                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 relative">
                                          <span className="text-xs text-[#8a8a8e]">Color</span>
                                          <div className="flex items-stretch gap-2">
                                            <div ref={colorPickerRefVal} className="relative flex-1">
                                              <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 flex items-center gap-2 min-w-[120px]">
                                                <button
                                                  onClick={() => setOpenStopPickerIdVal(openStopPickerIdVal === -100 ? null : -100)}
                                                  className="w-6 h-6 rounded border border-[#2a2a2d] bg-transparent overflow-hidden p-0 relative focus:outline-none shrink-0"
                                                >
                                                  <div className="w-full h-full rounded" style={{ backgroundColor: colorVal }} />
                                                </button>
                                                <input
                                                  type="text"
                                                  value={colorVal}
                                                  onChange={(e) => setColorVal(e.target.value)}
                                                  className="bg-transparent text-xs font-mono text-white uppercase outline-none w-full border-none p-0 select-text"
                                                />
                                              </div>

                                              {openStopPickerIdVal === -100 && (
                                                <div className="absolute right-0 bottom-full mb-2 z-50">
                                                  <CustomColorPicker color={colorVal} onChange={setColorVal} />
                                                </div>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => setColorVal(isEmp ? '#5E1616' : '#FFFFFF')}
                                              className="w-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white self-stretch"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Size Slider */}
                                      <div className="flex items-center justify-between gap-3 pt-2">
                                        <span className="text-xs text-[#8a8a8e] w-24">Size</span>
                                        <div className="flex-1 flex items-center gap-3">
                                          <input
                                            type="range"
                                            min="0.5"
                                            max="2.5"
                                            step="0.1"
                                            value={sizeVal}
                                            onChange={(e) => setSizeVal(Number(e.target.value))}
                                            className="flex-1 accent-[#52c595] h-1 bg-[#2a2a2d] rounded-lg appearance-none cursor-pointer"
                                          />
                                          <div className="w-12 h-7 bg-[#1a1a1c] border border-[#2a2a2d] rounded-md flex items-center justify-center text-xs text-white">
                                            {sizeVal.toFixed(1)}
                                          </div>
                                          <button
                                            onClick={() => setSizeVal(isEmp ? 1.0 : 1.3)}
                                            className="w-8 h-7 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Glow Row */}
                                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 relative">
                                        <span className="text-xs text-[#8a8a8e]">Glow</span>
                                        <div className="flex items-stretch gap-2">
                                          <div className="relative flex-1">
                                            <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded-md px-2 py-1.5 flex items-center gap-2 min-w-[120px]">
                                              <button
                                                onClick={() => setOpenStopPickerIdVal(openStopPickerIdVal === -200 ? null : -200)}
                                                className="w-6 h-6 rounded border border-[#2a2a2d] bg-transparent overflow-hidden p-0 relative focus:outline-none shrink-0"
                                              >
                                                <div className="w-full h-full rounded" style={{ backgroundColor: glowVal }} />
                                              </button>
                                              <input
                                                type="text"
                                                value={glowVal}
                                                onChange={(e) => setGlowVal(e.target.value)}
                                                className="bg-transparent text-xs font-mono text-white uppercase outline-none w-full border-none p-0 select-text"
                                              />
                                            </div>

                                            {openStopPickerIdVal === -200 && (
                                              <div className="absolute right-0 bottom-full mb-2 z-50">
                                                <CustomColorPicker color={glowVal} onChange={setGlowVal} />
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => setGlowVal(isEmp ? '#5E1616' : '#FFFFFF')}
                                            className="w-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white self-stretch"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Font Row */}
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-[70px]">Font</span>
                                        <div className="flex-1 flex gap-2">
                                          <CustomSelect
                                            value={fontVal}
                                            options={['Inter', 'Roboto', 'Montserrat', 'Poppins']}
                                            onChange={setFontVal}
                                            onHoverChange={setHoveredFontVal}
                                          />
                                          <button
                                            onClick={() => setFontVal('Inter')}
                                            className="w-8 h-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Font Face Row */}
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-[70px]">Font Face</span>
                                        <div className="flex-1 flex gap-2">
                                          <CustomSelect
                                            value={fontFaceVal}
                                            options={[
                                              'Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black',
                                              'Thin Italic', 'Extra Light Italic', 'Light Italic', 'Regular Italic', 'Medium Italic', 'Semi Bold Italic', 'Bold Italic', 'Extra Bold Italic', 'Black Italic'
                                            ]}
                                            onChange={setFontFaceVal}
                                            onHoverChange={setHoveredFontFaceVal}
                                          />
                                          <button
                                            onClick={() => setFontFaceVal('Regular Italic')}
                                            className="w-8 h-8 shrink-0 rounded-md bg-[#1a1a1c] border border-[#2a2a2d] flex items-center justify-center text-[#8a8a8e] hover:text-white"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Styles Row */}
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-[#8a8a8e] w-24">Styles</span>
                                        <div className="flex bg-[#1a1a1c] rounded-md border border-[#2a2a2d] p-0.5 gap-0.5">
                                          <button
                                            onClick={() => setStyleFlagsVal(prev => ({ ...prev, uppercase: !prev.uppercase }))}
                                            className={`w-8 h-7 text-xs font-semibold rounded-md transition-colors ${styleFlagsVal.uppercase ? 'bg-[#2a2a2d] text-white font-bold' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                          >
                                            Tt
                                          </button>
                                          <button
                                            onClick={() => setStyleFlagsVal(prev => ({ ...prev, bold: !prev.bold }))}
                                            className={`w-8 h-7 text-xs font-semibold rounded-md transition-colors ${styleFlagsVal.bold ? 'bg-[#2a2a2d] text-white font-bold' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                          >
                                            T
                                          </button>
                                          <button
                                            onClick={() => setStyleFlagsVal(prev => ({ ...prev, italic: !prev.italic }))}
                                            className={`w-8 h-7 text-xs font-semibold rounded-md transition-colors ${styleFlagsVal.italic ? 'bg-[#2a2a2d] text-white italic' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                          >
                                            t
                                          </button>
                                          <button
                                            onClick={() => setStyleFlagsVal(prev => ({ ...prev, underline: !prev.underline }))}
                                            className={`w-8 h-7 text-xs font-semibold rounded-md transition-colors ${styleFlagsVal.underline ? 'bg-[#2a2a2d] text-white underline' : 'text-[#8a8a8e] hover:text-[#e0e0e0]'}`}
                                          >
                                            U
                                          </button>
                                        </div>
                                      </div>

                                    </div>
                                  );
                                })()}
                              </div>
                            ) : key === 'spacing' ? (
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

              {activeTabRight === 'audio' && (
                <div className="p-5 flex flex-col gap-6 text-[#e0e0e0] select-none h-full">

                  {/* Header info */}
                  <div className="text-center space-y-2">
                    <h3 className="text-base font-bold text-white tracking-wide">Audio Enhancement</h3>
                    <p className="text-xs text-[#8a8a8e] leading-relaxed max-w-[280px] mx-auto">
                      Clean up your audio, Remove Background Noise & Enhance Overall Audio Quality.
                    </p>
                    <p className="text-[10px] text-[#52c595]/80 font-medium italic">
                      Audio Enhancement Removes Background Music as well!
                    </p>
                  </div>

                  {/* Toggle Card */}
                  <div className="bg-[#1a1a1c] border border-[#2a2a2d] rounded-xl p-4 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#52c595]/10 flex items-center justify-center text-[#52c595]">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-white">Audio Cleaning</span>
                        <span className="text-[10px] text-[#8a8a8e]">
                          {aiAudioClean ? "Audio enhancement is active" : "Toggle to clean audio"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAiAudioClean(!aiAudioClean)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${aiAudioClean ? 'bg-[#52c595]' : 'bg-[#2a2a2d]'}`}
                    >
                      <div className={`bg-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${aiAudioClean ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Audio Waveform visualization card */}
                  <div className="bg-[#1a1a1c]/40 border border-[#2a2a2d] rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${(aiAudioClean && isVideoPlaying) ? 'bg-[#52c595]' : 'bg-[#8a8a8e]'} transition-colors`} />
                        <span className="text-xs font-bold text-white">Enhanced Audio</span>
                      </div>
                      {/* Animated Volume level lines */}
                      <div className="flex items-end gap-0.5 h-3">
                        <div className={`w-[2px] bg-[#52c595] rounded-full transition-all duration-300 ${(aiAudioClean && isVideoPlaying) ? 'animate-[pulse_0.6s_infinite_alternate_0.1s]' : 'h-1 opacity-40'}`} style={{ height: (aiAudioClean && isVideoPlaying) ? '12px' : '4px' }} />
                        <div className={`w-[2px] bg-[#52c595] rounded-full transition-all duration-300 ${(aiAudioClean && isVideoPlaying) ? 'animate-[pulse_0.6s_infinite_alternate_0.3s]' : 'h-1.5 opacity-40'}`} style={{ height: (aiAudioClean && isVideoPlaying) ? '8px' : '6px' }} />
                        <div className={`w-[2px] bg-[#52c595] rounded-full transition-all duration-300 ${(aiAudioClean && isVideoPlaying) ? 'animate-[pulse_0.6s_infinite_alternate_0.5s]' : 'h-2 opacity-40'}`} style={{ height: (aiAudioClean && isVideoPlaying) ? '10px' : '8px' }} />
                      </div>
                    </div>

                    {/* Stylized custom animated waveform bars */}
                    <div className="h-16 flex items-center justify-between gap-[3px] px-2 select-none relative z-10 bg-[#111]/30 rounded-lg p-2 overflow-hidden">
                      {Array.from({ length: 28 }).map((_, idx) => {
                        const baseVal = Math.sin(idx * 0.28) * 15 + 24;
                        const finalHeight = (aiAudioClean && isVideoPlaying) ? Math.max(4, baseVal + Math.random() * 8) : Math.max(3, baseVal / 2);
                        return (
                          <div
                            key={idx}
                            className={`w-[3px] rounded-full transition-all duration-300 ${(aiAudioClean && isVideoPlaying) ? 'bg-[#52c595]' : 'bg-[#8a8a8e]/30'}`}
                            style={{ 
                              height: `${finalHeight}px`,
                              animation: (aiAudioClean && isVideoPlaying) ? `pulse ${0.4 + Math.random() * 0.4}s infinite alternate` : 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
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
