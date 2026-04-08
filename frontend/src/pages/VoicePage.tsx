import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { VoiceOrb } from '../components/Voice/VoiceOrb';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../lib/utils';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function VoicePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('listening');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Simulated cycle for demonstration
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        if (prev === 'listening') return 'thinking';
        if (prev === 'thinking') return 'speaking';
        if (prev === 'speaking') return 'idle';
        return 'listening';
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleEndCall = () => {
    navigate('/');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between py-12 px-6 bg-[#050505] text-white transition-all duration-700 select-none">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[120px] rounded-full" />
      </div>

      {/* Header Info */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <h1 className="text-xl font-medium tracking-wide text-white/90">Jarvis</h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <div className={cn(
            "w-2 h-2 rounded-full",
            state === 'listening' ? "bg-red-500 animate-pulse" : 
            state === 'speaking' ? "bg-green-500 animate-pulse" : "bg-white/40"
          )} />
          <span className="text-xs font-mono text-white/60 capitalize">{state}</span>
        </div>
      </div>

      {/* Central Visualizer */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
        <VoiceOrb state={state} />
        
        {/* Subtle status text below orb */}
        <div className="absolute bottom-1/4 translate-y-20 flex flex-col items-center gap-2">
           <p className="text-white/40 text-sm font-light italic transition-opacity duration-500">
             {state === 'listening' && "I'm listening..."}
             {state === 'thinking' && "Thinking..."}
             {state === 'speaking' && "Jarvis is speaking"}
             {state === 'idle' && "Go ahead, say something"}
           </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 w-full max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[40px] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300",
              isMuted ? "bg-white/10 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button 
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={cn(
              "w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300",
              isVideoOn ? "bg-white/10 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <button 
            onClick={handleEndCall}
            className="w-20 h-14 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-300 shadow-lg shadow-red-500/20"
          >
            <PhoneOff size={24} />
          </button>

          <button 
            onClick={toggleFullscreen}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 transition-all duration-300"
          >
            {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
          </button>
        </div>
      </div>

      {/* Hint for return */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 p-2 rounded-full hover:bg-white/5 transition-colors text-white/30 hover:text-white/60"
        title="Back to text mode"
      >
        <Minimize2 size={20} />
      </button>
    </div>
  );
}
