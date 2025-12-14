import React, { useEffect, useRef } from 'react';
import { MicOff, Monitor, Sparkles, Pin } from 'lucide-react';
import { User } from '../types';
import { LiveCaption } from '../App';
import { DraggableVideo } from './DraggableVideo';

interface VideoStageProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  currentUser: User;
  participants: User[]; // Remote participants
  speakingUserId?: string | null;
  liveCaption: LiveCaption | null;
  isDirectCall?: boolean;
  showCaptions: boolean;
  pinnedUserId: string | null;
}

export const VideoStage: React.FC<VideoStageProps> = ({ 
  localStream, 
  screenStream,
  isVideoEnabled, 
  isAudioEnabled, 
  currentUser,
  participants,
  speakingUserId,
  liveCaption,
  isDirectCall = false,
  showCaptions,
  pinnedUserId
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
        screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const renderAvatar = (avatarStr: string, sizeClass: string = "text-6xl") => {
    const isImage = avatarStr.startsWith('http') || avatarStr.startsWith('data:');
    if (isImage) {
        return <img src={avatarStr} alt="Avatar" className="w-full h-full object-cover" />;
    }
    return <span className={sizeClass}>{avatarStr}</span>;
  };

  let mainUser = participants[0]; 
  if (pinnedUserId) {
      const pinned = participants.find(p => p.id === pinnedUserId);
      if (pinned) mainUser = pinned;
  }

  const isPresenting = !!screenStream;

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
      
      {/* --- LAYER 1: MAIN STAGE --- */}
      {isPresenting ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center animate-in fade-in zoom-in-95 duration-700">
              <video 
                 ref={screenVideoRef}
                 autoPlay
                 playsInline
                 muted
                 className="w-full h-full object-contain"
              />
              <div className="absolute top-32 left-8 bg-black/60 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
                  <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                    <Monitor size={18} className="text-green-400" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Live Presentation</span>
                     <span className="text-[10px] text-zinc-400 font-light">Screen sharing active</span>
                  </div>
              </div>
          </div>
      ) : (
          mainUser ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative z-10 flex flex-col items-center gap-10 w-full px-6 transition-all duration-1000">
                    
                    {/* Avatar Circle with Glow */}
                    <div className={`relative w-48 h-48 sm:w-64 sm:h-64 rounded-full flex items-center justify-center bg-zinc-950 border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-700 ${speakingUserId === mainUser.id ? 'scale-110 shadow-[0_0_150px_rgba(99,102,241,0.25)] border-indigo-500/30' : ''}`}>
                        {speakingUserId === mainUser.id && (
                            <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
                        )}
                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                            {renderAvatar(mainUser.avatar, "text-8xl")}
                        </div>
                    </div>

                    <div className="text-center relative">
                        {pinnedUserId === mainUser.id && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-indigo-400 animate-in fade-in slide-in-from-bottom-2 bg-indigo-500/10 p-1.5 rounded-full">
                                <Pin size={14} fill="currentColor" />
                            </div>
                        )}
                        <h2 className="text-5xl md:text-7xl font-thin text-white tracking-tighter drop-shadow-2xl mb-5 text-glow">{mainUser.name}</h2>
                        
                        <div className="inline-flex items-center gap-4 px-6 py-2.5 bg-black/40 rounded-full backdrop-blur-xl border border-white/5 shadow-2xl">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{mainUser.language}</span>
                            {mainUser.voice && <span className="w-1 h-1 bg-zinc-700 rounded-full" />}
                            {mainUser.voice && <span className="text-[10px] text-zinc-500 font-light tracking-wide">{mainUser.voice}</span>}
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            <div className="text-zinc-600 flex flex-col items-center z-10">
               <div className="animate-pulse font-bold tracking-[0.3em] uppercase text-[10px]">Waiting for signal...</div>
            </div>
          )
      )}

      {/* --- LAYER 2: CAPTIONS (YouTube Style) --- */}
      {showCaptions && liveCaption && (
          <div className="absolute bottom-36 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
             <div className="bg-zinc-950/85 backdrop-blur-sm border border-white/5 rounded-xl px-6 py-3 max-w-3xl text-center shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200">
                <p className="text-xl md:text-2xl text-white font-medium leading-relaxed drop-shadow-sm antialiased">
                   {liveCaption.translatedText || liveCaption.originalText}
                </p>
                {liveCaption.translatedText && (
                    <p className="text-sm text-zinc-400 mt-1 font-normal opacity-80">
                        {liveCaption.originalText}
                    </p>
                )}
             </div>
          </div>
      )}

      {/* --- LAYER 3: LOCAL USER (Draggable Glass Card) --- */}
      <DraggableVideo className="bottom-32 right-6 sm:bottom-36 sm:right-8 w-28 h-28 sm:w-44 sm:h-44 bg-zinc-950 rounded-[2rem] overflow-hidden border-2 border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-40 group cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors">
          <div className="w-full h-full relative bg-zinc-900">
              {localStream && isVideoEnabled ? (
                  <video
                  ref={localVideoRef}
                  autoPlay
                  muted={true}
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                  />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                      {renderAvatar(currentUser.avatar, "text-2xl")}
                  </div>
              )}
          </div>

          {!isAudioEnabled && (
              <div className="absolute top-3 right-3 bg-red-500/90 p-2 rounded-xl text-white shadow-lg z-20 backdrop-blur-sm">
                  <MicOff size={12} />
              </div>
          )}
      </DraggableVideo>
    </div>
  );
};