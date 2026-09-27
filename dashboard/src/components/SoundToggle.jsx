import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * SoundToggle Component
 * Plays official ambulance siren audio (from YouTube D7swe2nqZ9o)
 * whenever an emergency vehicle arrives or Emergency Mode is active.
 */
export const SoundToggle = () => {
  const { lang } = useLanguage();
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('stms-sound-muted') === 'true';
  });
  const [customOverride, setCustomOverride] = useState(false);
  const audioRef = useRef(null);

  const { state } = useSimulation();
  const isEmergencyActive = Boolean(
    state?.emergencyActive ||
    (state?.emergencyVehicle && state?.emergencyVehicle?.position < 100) ||
    customOverride
  );

  // Initialize audio element with downloaded siren audio
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0.55;

    // Detect browser codec preference
    const canPlayWebm = audio.canPlayType('audio/webm; codecs="opus"') !== '';
    audio.src = canPlayWebm ? '/sounds/ambulance_siren.webm' : '/sounds/ambulance_siren.m4a';

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  // Unlock browser audio context / element on any user gesture
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current && isEmergencyActive && !isMuted && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [isEmergencyActive, isMuted]);

  // Listen for custom emergency-override events
  useEffect(() => {
    const handleEmergencyEvent = (e) => {
      if (e.detail && typeof e.detail.active === 'boolean') {
        setCustomOverride(e.detail.active);
      }
    };
    window.addEventListener('emergency-override', handleEmergencyEvent);
    return () => {
      window.removeEventListener('emergency-override', handleEmergencyEvent);
    };
  }, []);

  // Play / Pause based on emergency active state and mute setting
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isEmergencyActive && !isMuted) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio playback waiting for user interaction:', err.message);
        });
      }
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isEmergencyActive, isMuted]);

  const handleToggleMute = (e) => {
    e.stopPropagation();
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem('stms-sound-muted', String(newState));

    if (audioRef.current) {
      if (!newState && isEmergencyActive) {
        audioRef.current.play().catch(() => {});
      } else if (newState) {
        audioRef.current.pause();
      }
    }
  };

  const isPlaying = !isMuted && isEmergencyActive;

  // Render ONLY when emergency mode is active; at all other times it should not be visible
  if (!isEmergencyActive) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none select-none">
      {/* Floating Sound Toggle Button - visible only during emergency mode */}
      <button
        onClick={handleToggleMute}
        className={`relative pointer-events-auto w-11 h-11 flex items-center justify-center rounded-xl bg-white border-2 border-[#0A1F44] shadow-md transition-all duration-200 cursor-pointer hover:bg-slate-50 hover:scale-105 ${
          isPlaying ? 'ring-4 ring-red-400/50 shadow-lg' : ''
        }`}
        title={
          isMuted
            ? (lang === 'HI' ? 'आपातकालीन सायरन म्यूट है (अनम्यूट करने के लिए क्लिक करें)' : 'Emergency Siren is Muted (Click to Unmute)')
            : isPlaying
            ? (lang === 'HI' ? 'सायरन बज रहा है (म्यूट करने के लिए क्लिक करें)' : 'Siren is Playing (Click to Mute)')
            : (lang === 'HI' ? 'आपातकालीन सायरन तैयार है (म्यूट करने के लिए क्लिक करें)' : 'Emergency Siren is Armed (Click to Mute)')
        }
        aria-label={
          isMuted
            ? (lang === 'HI' ? 'आपातकालीन सायरन अनम्यूट करें' : 'Unmute Emergency Siren')
            : (lang === 'HI' ? 'आपातकालीन सायरन म्यूट करें' : 'Mute Emergency Siren')
        }
      >
        {isMuted ? (
          <VolumeX size={20} className="text-slate-400" />
        ) : (
          <Volume2 size={20} className="text-[#0A1F44]" />
        )}
        {isPlaying && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
        )}
      </button>
    </div>
  );
};

export default SoundToggle;
