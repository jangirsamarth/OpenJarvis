import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { VoiceOrb } from '../components/Voice/VoiceOrb';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export function VoicePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastPong, setLastPong] = useState<string | null>(null);

  useEffect(() => {
    console.log("[DEBUG] VoicePage mounted, starting session...");
    
    // Start session
    invoke("start_voice_session").catch(err => {
      console.error("[DEBUG] Failed to start voice session:", err);
      toast.error("Failed to start voice session");
    });

    // Listen for updates
    const unlistenState = listen("voice-state-update", (event: any) => {
      const data = event.payload;
      console.log("[DEBUG] Received state update:", data);
      if (data.state) {
        setState(data.state as VoiceState);
      }
      if (data.text) {
        setTranscript(data.text);
      }
    });

    const unlistenRawLog = listen("voice-raw-log", (event: any) => {
      console.log("[Voice Backend Raw]", event.payload);
    });

    const unlistenPong = listen("bridge-pong", (event: any) => {
      console.log("[DEBUG] Bridge Pong!", event.payload);
      setLastPong(new Date().toLocaleTimeString());
      toast.success("Backend bridge connection verified!");
    });

    return () => {
      console.log("[DEBUG] VoicePage unmounting, stopping session...");
      invoke("stop_voice_session").catch(console.error);
      unlistenState.then(fn => fn());
      unlistenRawLog.then(fn => fn());
      unlistenPong.then(fn => fn());
    };
  }, []);

  const handlePing = () => {
    console.log("[DEBUG] Pinging bridge...");
    invoke("ping_bridge").catch(err => {
      console.error("[DEBUG] Ping failed:", err);
      toast.error("Ping failed: Bridge potentially blocked");
    });
  };

  const handleEndCall = () => {
    invoke("stop_voice_session").catch(console.error);
    setTranscript("");
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
      <div className="relative z-10 flex flex-col items-center gap-2 w-full">
        <div className="flex justify-between items-center w-full max-w-4xl px-4">
          <div className="w-10 h-10" /> {/* Spacer */}
          <div className="flex flex-col items-center gap-1">
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
          
          {/* Debug Ping Button */}
          <button 
            onClick={handlePing}
            title="Test Backend Connection"
            className={cn(
              "p-2 rounded-xl transition-all duration-300 bg-white/5 border border-white/10 hover:bg-white/10",
              lastPong ? "text-green-400 border-green-500/30" : "text-white/40"
            )}
          >
            <Radio size={20} className={cn(lastPong && "animate-pulse")} />
          </button>
        </div>
        {lastPong && (
          <span className="text-[10px] text-green-500/60 font-mono mt-1">
            Bridge Active: {lastPong}
          </span>
        )}
      </div>

      {/* Central Visualizer */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
        <VoiceOrb state={state} />
        
        {/* Subtle status text below orb */}
        <div className="absolute bottom-1/4 translate-y-20 flex flex-col items-center gap-2 max-w-lg text-center">
           <p className="text-white/40 text-sm font-light italic transition-opacity duration-500">
             {state === 'listening' && "I'm listening..."}
             {state === 'transcribing' && "Transcribing..."}
             {state === 'thinking' && "Thinking..."}
             {state === 'speaking' && "Jarvis is speaking"}
             {state === 'idle' && "Go ahead, say something"}
           </p>
           {transcript && (
             <p className="text-white/80 text-lg font-medium max-w-xs md:max-w-md line-clamp-3 bg-white/5 px-4 py-2 rounded-2xl backdrop-blur-sm border border-white/5 mt-4">
               "{transcript}"
             </p>
           )}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-4 rounded-2xl transition-all duration-300 hover:scale-110",
            isMuted ? "bg-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={cn(
            "p-4 rounded-2xl transition-all duration-300 hover:scale-110",
            isVideoOn ? "bg-indigo-500/20 text-indigo-500" : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        <button 
          onClick={handleEndCall}
          className="p-5 rounded-3xl bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] transition-all duration-300 hover:scale-110 hover:bg-red-500 active:scale-95"
        >
          <PhoneOff size={28} strokeWidth={2.5} />
        </button>

        <button 
          onClick={toggleFullscreen}
          className="p-4 rounded-2xl bg-white/5 text-white/70 transition-all duration-300 hover:scale-110 hover:bg-white/10"
        >
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>
      </div>
    </div>
  );
}
