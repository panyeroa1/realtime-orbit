import React, { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Globe, 
  Sparkles, Volume2, VolumeX, Monitor, MonitorOff, 
  Users, Captions, CaptionsOff, Zap, ZapOff,
  Calendar, Mail, HardDrive, MessageSquare, Disc, Settings
} from 'lucide-react';
import { Language } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface ControlBarProps {
  isVisible: boolean;
  isMicOn: boolean;
  isVideoOn: boolean;
  isTranslating: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  myLanguage: Language;
  onMyLanguageChange: (lang: Language) => void;
  localStream: MediaStream | null;
  isMyTranslatorMuted: boolean;
  onToggleMyTranslatorMute: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  showParticipants: boolean;
  onToggleParticipants: () => void;
  showCaptions: boolean;
  onToggleCaptions: () => void;
  isDirectVoice: boolean;
  onToggleDirectVoice: () => void;
  onGoogleAction: (action: 'calendar' | 'gmail' | 'drive') => void;
  onToggleHistory: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onOpenSettings: () => void;
}

const DockButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  primary?: boolean;
  className?: string;
}> = ({ onClick, active = false, icon, label, danger, primary, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Glass Button Styles
  let bgClass = "bg-white/5 text-zinc-400 border-transparent hover:bg-white/10 hover:text-white";
  if (active) bgClass = primary ? "bg-indigo-600/80 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border-indigo-500/30" : "bg-white/20 text-white border-white/20";
  if (danger) bgClass = "bg-red-500/80 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/30 hover:bg-red-500";
  if (active && danger) bgClass = "bg-red-600 text-white";

  return (
    <div className="relative flex flex-col items-center group">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out transform ${isHovered ? 'scale-110 -translate-y-2 mx-1 z-10' : 'scale-100 mx-0'} ${bgClass} ${className} border backdrop-blur-sm`}
        aria-label={label}
      >
        {icon}
      </button>
      {/* Tooltip */}
      <div className={`absolute -top-12 px-3 py-1.5 bg-zinc-900/90 backdrop-blur border border-white/10 rounded-lg text-[10px] text-zinc-200 font-medium whitespace-nowrap opacity-0 transition-opacity duration-200 pointer-events-none shadow-xl ${isHovered ? 'opacity-100' : ''}`}>
        {label}
      </div>
    </div>
  );
};

export const ControlBar: React.FC<ControlBarProps> = ({
  isVisible,
  isMicOn,
  isVideoOn,
  isTranslating,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  myLanguage,
  onMyLanguageChange,
  localStream,
  isMyTranslatorMuted,
  onToggleMyTranslatorMute,
  isScreenSharing,
  onToggleScreenShare,
  showParticipants,
  onToggleParticipants,
  showCaptions,
  onToggleCaptions,
  isDirectVoice,
  onToggleDirectVoice,
  onGoogleAction,
  onToggleHistory,
  isRecording,
  onToggleRecording,
  onOpenSettings
}) => {
  return (
    <div className={`absolute bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-700 ease-in-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
        {/* Main Floating Dock - Glass Card */}
        <div className="bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-6 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] pointer-events-auto flex items-end gap-3 max-w-[95vw] overflow-visible">
          
          {/* Group 1: Output Controls */}
          <div className="flex items-center gap-1.5">
             <DockButton 
                onClick={onToggleDirectVoice}
                active={isDirectVoice}
                icon={isDirectVoice ? <Zap size={20} /> : <ZapOff size={20} />}
                label={isDirectVoice ? "Direct Voice Mode" : "AI Translation Mode"}
                primary={isDirectVoice}
             />
             <DockButton 
                onClick={onToggleMyTranslatorMute}
                active={!isMyTranslatorMuted}
                icon={isMyTranslatorMuted ? <VolumeX size={20} /> : <Sparkles size={20} />}
                label={isMyTranslatorMuted ? "Unmute My Translation" : "Mute My Translation"}
                primary={!isMyTranslatorMuted}
             />
          </div>

          <div className="w-px h-8 bg-white/10 mx-2 self-center" />

          {/* Group 2: Features */}
           <div className="flex items-center gap-1.5">
              <DockButton 
                  onClick={onToggleScreenShare}
                  active={isScreenSharing}
                  icon={isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                  label="Screen Share"
                  primary={isScreenSharing}
              />
              <DockButton 
                  onClick={onToggleRecording}
                  active={isRecording}
                  icon={<Disc size={20} className={isRecording ? 'animate-pulse text-red-200' : ''} />}
                  label="Record Session"
                  danger={isRecording}
              />
              <DockButton 
                  onClick={onToggleHistory}
                  icon={<MessageSquare size={20} />}
                  label="Chat History"
              />
              <DockButton 
                  onClick={onToggleCaptions}
                  active={showCaptions}
                  icon={showCaptions ? <Captions size={20} /> : <CaptionsOff size={20} />}
                  label="Captions"
              />
              <DockButton 
                  onClick={onToggleParticipants}
                  active={showParticipants}
                  icon={<Users size={20} />}
                  label="Participants"
              />
           </div>

           <div className="w-px h-8 bg-white/10 mx-2 self-center" />

           {/* Integrations Mini Group */}
           <div className="flex items-center gap-1.5">
               <DockButton onClick={() => onGoogleAction('calendar')} icon={<Calendar size={18} />} label="Calendar" />
               <DockButton onClick={() => onOpenSettings()} icon={<Settings size={18} />} label="Settings" />
           </div>

          {/* Visualizer */}
          <div className="hidden lg:flex w-32 h-12 bg-black/40 rounded-2xl items-center justify-center border border-white/5 overflow-hidden px-2 relative mx-3 self-center shadow-inner">
              <div className={`absolute inset-0 opacity-20 transition-opacity duration-500 ${isMicOn ? 'bg-indigo-500 blur-xl' : ''}`}></div>
              {localStream && isMicOn ? (
                  <div className="relative z-10 opacity-80">
                    <AudioVisualizer stream={localStream} isActive={isMicOn} color={isTranslating ? '#818cf8' : '#6366f1'} />
                  </div>
              ) : (
                  <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest relative z-10">Muted</div>
              )}
          </div>

          {/* Group 3: Core Media */}
          <div className="flex items-center gap-3 pl-1">
            <DockButton 
                onClick={onToggleMic}
                active={isMicOn}
                icon={isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                label={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                className={!isMicOn ? "bg-red-500/10 text-red-400 border-red-500/20" : ""}
            />
            <DockButton 
                onClick={onToggleVideo}
                active={isVideoOn}
                icon={isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
                label={isVideoOn ? "Stop Video" : "Start Video"}
                className={!isVideoOn ? "bg-red-500/10 text-red-400 border-red-500/20" : ""}
            />
            
            <div className="ml-2">
                <DockButton 
                    onClick={onEndCall}
                    icon={<PhoneOff size={24} />}
                    label="Leave Call"
                    danger
                    className="w-14 h-14 rounded-[1.2rem]"
                />
            </div>
          </div>

        </div>
    </div>
  );
};