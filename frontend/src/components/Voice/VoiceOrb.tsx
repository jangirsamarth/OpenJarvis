import React from 'react';

interface VoiceOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function VoiceOrb({ state }: VoiceOrbProps) {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      {/* Dynamic Background Glow */}
      <div 
        className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-1000 ${
          state === 'listening' ? 'bg-blue-500' : 
          state === 'speaking' ? 'bg-indigo-500' :
          state === 'thinking' ? 'bg-purple-500' : 'bg-gray-500'
        }`}
      />

      {/* Main Animated Orb Container */}
      <div className="relative w-full h-full animate-pulse-slow">
        <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-2xl">
          <defs>
            <linearGradient id="orbGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <linearGradient id="orbGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <filter id="orbBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            </filter>
          </defs>

          {/* Background Layer 1 */}
          <circle 
            cx="100" cy="100" r="80" 
            fill="url(#orbGradient1)" 
            className={`transition-all duration-1000 origin-center ${
              state === 'speaking' ? 'animate-orb-expand' : 'animate-orb-float'
            }`}
            style={{ opacity: 0.6 }}
          />

          {/* Background Layer 2 */}
          <circle 
            cx="100" cy="100" r="75" 
            fill="url(#orbGradient2)" 
            className={`transition-all duration-1000 origin-center ${
              state === 'listening' ? 'animate-orb-pulse' : 'animate-orb-float-delayed'
            }`}
            style={{ mixBlendMode: 'overlay', opacity: 0.8 }}
          />

          {/* Core Layer */}
          <circle 
            cx="100" cy="100" r="60" 
            fill="rgba(255, 255, 255, 0.15)" 
            className="animate-spin-slow origin-center"
            style={{ backdropFilter: 'blur(20px)', stroke: 'rgba(255,255,255,0.2)', strokeWidth: '0.5' }}
          />

          {/* Highlight Flare */}
          <circle 
            cx="70" cy="70" r="15" 
            fill="white" 
            className="opacity-20 blur-md animate-pulse"
          />
        </svg>

        {/* CSS for custom animations (would normally be in index.css, adding here as style tag for simplicity in this component or adding to global css later) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes orb-float {
            0%, 100% { transform: translateY(0) scale(1.0); }
            50% { transform: translateY(-10px) scale(1.05); }
          }
          @keyframes orb-float-delayed {
            0%, 100% { transform: translateY(5px) scale(1.02); }
            50% { transform: translateY(-5px) scale(0.98); }
          }
          @keyframes orb-pulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
          }
          @keyframes orb-expand {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          .animate-orb-float { animation: orb-float 8s ease-in-out infinite; }
          .animate-orb-float-delayed { animation: orb-float-delayed 10s ease-in-out infinite; }
          .animate-orb-pulse { animation: orb-pulse 2s ease-in-out infinite; }
          .animate-orb-expand { animation: orb-expand 3s ease-in-out infinite; }
          .animate-spin-slow { animation: spin 20s linear infinite; }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    </div>
  );
}
