import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Rocket, Video, MousePointer2, Film, PenTool, Search, Youtube, Instagram, UserPlus } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/api/config';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (key: string, value: string) => {
    setAnswers({ ...answers, [key]: value });
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`${API_BASE_URL}/api/auth/complete-onboarding`, answers, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to complete onboarding', err);
    } finally {
      setIsSubmitting(false);
      onComplete();
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 2));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));

  const screens = [
    {
      title: "How big is your team?",
      subtitle: "Tell us about your team size.",
      key: "teamSize",
      options: [
        { label: "Just me", icon: <User className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "2-5 people", icon: <Users className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "6-20 people", icon: <Users className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "20+ people", icon: <Users className="w-6 h-6 mb-3 opacity-80" /> },
      ]
    },
    {
      title: "What's your role?",
      subtitle: "Tell us how you'll mainly use the platform.",
      key: "role",
      options: [
        { label: "Founder", icon: <Rocket className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Creator", icon: <Video className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Editor", icon: <MousePointer2 className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Filmmaker", icon: <Film className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Designer", icon: <PenTool className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Agency", icon: <Users className="w-6 h-6 mb-3 opacity-80" /> },
      ]
    },
    {
      title: "How did you discover us?",
      subtitle: "We'd love to know where you found us.",
      key: "discovery",
      options: [
        { label: "Google Search", icon: <Search className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "YouTube", icon: <Youtube className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Instagram", icon: <Instagram className="w-6 h-6 mb-3 opacity-80" /> },
        { label: "Friend", icon: <UserPlus className="w-6 h-6 mb-3 opacity-80" /> },
      ]
    }
  ];

  const currentScreen = screens[step];
  const hasSelection = !!answers[currentScreen.key];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505] text-white">
      <div className="w-full max-w-3xl px-6 relative flex flex-col min-h-[500px]">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            <div className="text-center mb-10 mt-8">
              <h1 className="text-4xl font-bold mb-3">{currentScreen.title}</h1>
              <p className="text-neutral-400 text-lg">{currentScreen.subtitle}</p>
            </div>

            <div className={`grid gap-4 mx-auto w-full ${currentScreen.options.length > 4 ? 'grid-cols-3' : 'grid-cols-2'} max-w-2xl`}>
              {currentScreen.options.map((opt) => {
                const isSelected = answers[currentScreen.key] === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelect(currentScreen.key, opt.label)}
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-200
                      ${isSelected 
                        ? 'bg-neutral-800/80 border-[#ff7800] text-white' 
                        : 'bg-neutral-900/40 border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/60'
                      }`}
                  >
                    {opt.icon}
                    <span className="font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Navigation */}
        <div className="mt-16 w-full max-w-2xl mx-auto flex items-center justify-between pb-8">
          {step === 0 ? (
            <button 
              onClick={handleComplete}
              disabled={isSubmitting}
              className="text-neutral-400 hover:text-white font-medium px-4 py-2 transition-colors"
            >
              Skip
            </button>
          ) : (
            <button 
              onClick={prevStep}
              className="text-neutral-400 hover:text-white font-medium px-4 py-2 transition-colors"
            >
              Back
            </button>
          )}

          <div className="flex gap-2 absolute left-1/2 -translate-x-1/2 mt-3">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#ff7800]' : 'w-2 bg-neutral-800'}`} 
              />
            ))}
          </div>

          <button
            onClick={step === 2 ? handleComplete : nextStep}
            disabled={!hasSelection || isSubmitting}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200
              ${hasSelection 
                ? 'bg-[#ff7800] hover:bg-[#e66c00] text-white shadow-lg shadow-[#ff7800]/20' 
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : step === 2 ? 'Get Started' : 'Continue'}
          </button>
        </div>

      </div>
    </div>
  );
}

// Simple internal Loader2 definition in case it's not imported above
function Loader2({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
