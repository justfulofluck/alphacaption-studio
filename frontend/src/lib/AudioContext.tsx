import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AudioContextType {
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  audioUrl: string | null;
  setAudioUrl: (url: string | null) => void;
  projectId: number | null;
  setProjectId: (id: number | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  return (
    <AudioContext.Provider value={{ audioFile, setAudioFile, audioUrl, setAudioUrl, projectId, setProjectId }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
