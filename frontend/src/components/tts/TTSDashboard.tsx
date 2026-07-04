import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

// Interfaces
interface Voice {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
}

const getRegionName = (locale: string) => {
  const parts = locale.split('-');
  if (parts.length < 2) return locale;
  const regionCode = parts[1];
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(regionCode) || regionCode;
  } catch (e) {
    return regionCode;
  }
};

const getLanguageName = (locale: string) => {
  const parts = locale.split('-');
  const langCode = parts[0];
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayNames.of(langCode) || langCode;
  } catch (e) {
    return langCode;
  }
};

export function TTSDashboard() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedLocale, setSelectedLocale] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useAiEmotion, setUseAiEmotion] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [pitch, setPitch] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);

  useEffect(() => {
    // Fetch available voices on component mount
    const fetchVoices = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:5000/api/tts/voices', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }
        const data = await response.json();
        const sortedVoices = data.voices.sort((a: Voice, b: Voice) => a.Locale.localeCompare(b.Locale));
        setVoices(sortedVoices);
        
        // Extract unique countries
        const uniqueCountries = Array.from(new Set(sortedVoices.map((v: Voice) => getRegionName(v.Locale)))).sort() as string[];
        setCountries(uniqueCountries);

        if (uniqueCountries.length > 0) {
          const initialCountry = uniqueCountries.includes('United States') ? 'United States' : uniqueCountries[0];
          setSelectedCountry(initialCountry);
          
          const countryLocales = Array.from(new Set(sortedVoices.filter((v: Voice) => getRegionName(v.Locale) === initialCountry).map((v: Voice) => v.Locale))) as string[];
          if (countryLocales.length > 0) {
            const initialLocale = countryLocales[0];
            setSelectedLocale(initialLocale);
            
            const localeVoices = sortedVoices.filter((v: Voice) => v.Locale === initialLocale);
            if (localeVoices.length > 0) {
              setSelectedVoice(localeVoices[0].ShortName);
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchVoices();
  }, []);

  const handleGenerate = async () => {
    if (!text || !selectedVoice) {
      setError('Please provide text and select a voice.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setAiAnalysis(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5000/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: text,
          voice: selectedVoice,
          use_ai_emotion: useAiEmotion,
          rate: speed >= 0 ? `+${speed}%` : `${speed}%`,
          pitch: pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      setAudioUrl(`http://localhost:5000${data.url}`);
      setAiAnalysis(data.ai_analysis || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatVoiceName = (v: Voice) => {
    const personName = v.ShortName.split('-').pop()?.replace('Neural', '') || v.ShortName;
    return `${personName} (${v.Gender})`;
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);
    
    const countryLocales = Array.from(new Set(voices.filter(v => getRegionName(v.Locale) === country).map(v => v.Locale)));
    if (countryLocales.length > 0) {
      setSelectedLocale(countryLocales[0]);
      
      const localeVoices = voices.filter(v => v.Locale === countryLocales[0]);
      if (localeVoices.length > 0) {
        setSelectedVoice(localeVoices[0].ShortName);
      }
    } else {
      setSelectedLocale('');
      setSelectedVoice('');
    }
  };

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = e.target.value;
    setSelectedLocale(locale);
    
    const localeVoices = voices.filter(v => v.Locale === locale);
    if (localeVoices.length > 0) {
      setSelectedVoice(localeVoices[0].ShortName);
    } else {
      setSelectedVoice('');
    }
  };

  return (
    <div className="flex-1 w-full bg-[#0a0a0a] min-h-screen text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Text-to-Speech</h1>
          <p className="text-white/60">
            Generate high-quality speech from text using Edge TTS.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid gap-6 bg-[#111111] border border-white/5 p-6 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/80">
                Country
              </label>
              <select
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                value={selectedCountry}
                onChange={handleCountryChange}
                disabled={countries.length === 0}
              >
                {countries.length === 0 ? (
                  <option>Loading...</option>
                ) : (
                  countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/80">
                Language
              </label>
              <select
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                value={selectedLocale}
                onChange={handleLocaleChange}
                disabled={!selectedCountry}
              >
                {!selectedCountry ? (
                  <option>Select Country First</option>
                ) : (
                  Array.from(new Set(voices.filter(v => getRegionName(v.Locale) === selectedCountry).map(v => v.Locale))).map((locale) => (
                    <option key={locale} value={locale}>
                      {getLanguageName(locale)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/80">
                Select Voice
              </label>
              <select
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={!selectedLocale}
              >
                {!selectedLocale ? (
                  <option>Select Language First</option>
                ) : (
                  voices
                    .filter(v => v.Locale === selectedLocale)
                    .map((v) => (
                      <option key={v.ShortName} value={v.ShortName}>
                        {formatVoiceName(v)}
                      </option>
                    ))
                )}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-white/80">
              Text to Dub
            </label>
            <textarea
              className="w-full h-40 bg-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-y"
              placeholder="Enter your text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-white/5 pt-4">
            <div>
              <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Use AI Emotion Engine
              </h3>
              <p className="text-xs text-white/50 mt-1">
                Automatically analyze script and adjust pitch/speed for better emotion.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={useAiEmotion}
                onChange={(e) => setUseAiEmotion(e.target.checked)}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 transition-opacity duration-300 ${useAiEmotion ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/80">
                  Voice Speed (Rate)
                </label>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/70">
                  {speed >= 0 ? `+${speed}%` : `${speed}%`}
                </span>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>Slow (-50%)</span>
                <span>Normal (0%)</span>
                <span>Fast (+50%)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/80">
                  Voice Pitch
                </label>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/70">
                  {pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`}
                </span>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={pitch}
                onChange={(e) => setPitch(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>Deep (-50Hz)</span>
                <span>Default (0Hz)</span>
                <span>High (+50Hz)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !text || !selectedVoice}
            className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-lg px-8 py-3 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              'Generate Audio'
            )}
          </button>
        </div>

        {audioUrl && (
          <div className="bg-[#111111] border border-white/5 p-6 rounded-xl space-y-4">
            <h3 className="text-lg font-medium">Result</h3>
            
            {aiAnalysis && aiAnalysis.used && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  AI Analysis Details
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-white/50 block text-xs mb-1">Detected Emotion</span>
                    <span className="text-white font-medium">{aiAnalysis.emotion}</span>
                  </div>
                  <div>
                    <span className="text-white/50 block text-xs mb-1">Pitch Modifier</span>
                    <span className="text-white font-medium">{aiAnalysis.pitch}</span>
                  </div>
                  <div>
                    <span className="text-white/50 block text-xs mb-1">Speed Modifier</span>
                    <span className="text-white font-medium">{aiAnalysis.rate}</span>
                  </div>
                </div>
              </div>
            )}

            <audio controls className="w-full" src={audioUrl}>
              Your browser does not support the audio element.
            </audio>
            <a 
              href={audioUrl} 
              download 
              className="inline-block text-sm text-white/60 hover:text-white transition-colors"
            >
              Download Audio File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
