import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { VideoStage } from './components/VideoStage';
import { ControlBar } from './components/ControlBar';
import { TopBar } from './components/TopBar'; 
import { ProfileSetup } from './components/ProfileSetup';
import { Dashboard } from './components/Dashboard';
import { CallHistory } from './components/CallHistory';
import { ParticipantsSidebar } from './components/ParticipantsSidebar';
import { GoogleIntegrations } from './components/GoogleIntegrations';
import { SettingsModal } from './components/SettingsModal';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useIdle } from './hooks/useIdle'; 
import { Language, ChatMessage, User, Group, MessageStatus } from './types';
import { getSpeechRecognitionLanguage } from './utils/languageUtils';
import { translateAndSpeak, translateText } from './services/geminiService';
import { decodeBase64, decodeAudioData } from './services/audioUtils';
import { audioQueue } from './services/audioQueue';
import { saveTrainingData } from './services/trainingService';
import { Check, X, User as UserIcon } from 'lucide-react';
import { supabase } from './lib/supabase';

// Mock Contacts for Demo
const MOCK_CONTACTS: User[] = [
  { id: 'u2', name: 'Alice', avatar: '👩‍🎨', language: Language.SPANISH, voice: 'Kore' },
  { id: 'u3', name: 'Bob', avatar: '👨‍🚀', language: Language.FRENCH, voice: 'Charon' },
];

export interface LiveCaption {
  userId: string;
  originalText: string;
  translatedText?: string;
  timestamp: number;
}

export default function App() {
  // Navigation State
  const [view, setView] = useState<'profile' | 'dashboard' | 'call' | 'waiting_room'>('profile');
  
  // Side Panel State (Zoom-style)
  const [sideView, setSideView] = useState<'participants' | 'chat' | null>(null);

  const [googleAction, setGoogleAction] = useState<'calendar' | 'gmail' | 'drive' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Preferences State
  const [preferences, setPreferences] = useState({
      darkMode: true,
      autoHideControls: true,
      defaultMicOn: true,
      defaultVideoOn: true
  });

  // Data State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Call State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Remote Volume
  const [isMyTranslatorMuted, setIsMyTranslatorMuted] = useState(false); // Default UNMUTED
  const [isTranslating, setIsTranslating] = useState(false);
  const [speakingUserId, setSpeakingUserId] = useState<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isDirectVoice, setIsDirectVoice] = useState(false); 
  const [isRecording, setIsRecording] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set());
  const mutedUserIdsRef = useRef<Set<string>>(new Set());
  
  // UI Logic
  const isIdle = useIdle(12000); // 12 seconds
  const controlsVisible = !preferences.autoHideControls || !isIdle || sideView !== null || isSettingsOpen;

  // Waiting Room / Admittance State
  const [pendingGuests, setPendingGuests] = useState<User[]>([]);
  
  // Live Caption State
  const [liveCaption, setLiveCaption] = useState<LiveCaption | null>(null);
  const captionTimeoutRef = useRef<any>(null);

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const messagesSubscription = useRef<any>(null);

  // Helpers
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const participants = activeGroup ? activeGroup.members.filter(m => m.id !== currentUser?.id) : [];
  const isDirectCall = participants.length === 1;

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioQueue.setAudioContext(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === 'suspended' && isSpeakerOn) {
      audioCtxRef.current.resume();
    }
  };

  const showCaptionHandler = (userId: string, originalText: string, translatedText?: string) => {
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      setLiveCaption({ userId, originalText, translatedText, timestamp: Date.now() });
      captionTimeoutRef.current = setTimeout(() => setLiveCaption(null), 8000);
  };

  const handleToggleMuteParticipant = (userId: string) => {
    const newSet = new Set(mutedUserIdsRef.current);
    if (newSet.has(userId)) {
        newSet.delete(userId);
    } else {
        newSet.add(userId);
    }
    mutedUserIdsRef.current = newSet;
    setMutedUserIds(newSet);
  };

  // --- Storage Helper ---
  const saveUserToStorage = (user: User) => {
    try {
      localStorage.setItem('orbitz_user', JSON.stringify(user));
    } catch (e) {
      console.warn("LocalStorage Quota Exceeded. Attempting to save without avatar...");
      try {
        const slimUser = { ...user, avatar: '' }; 
        localStorage.removeItem('orbitz_user');
        localStorage.setItem('orbitz_user', JSON.stringify(slimUser));
      } catch (e2) {
        console.error("Critical: Storage completely full. Cannot persist user data.", e2);
      }
    }
  };

  // --- Initial Load & Auth ---
  useEffect(() => {
    // Apply preferences
    if (preferences.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    const handleAuthUser = async (authUser: any) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (profile) {
            handleProfileComplete(profile);
        } else {
            const newProfile: User = {
                id: authUser.id,
                name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
                avatar: authUser.user_metadata.avatar_url || authUser.user_metadata.picture || `https://ui-avatars.com/api/?name=${authUser.email}`,
                language: Language.ENGLISH, // Default
                voice: 'Fenrir' // Default
            };
            await supabase.from('profiles').upsert([newProfile]);
            handleProfileComplete(newProfile);
        }
    };

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
         await handleAuthUser(session.user);
      } else {
         const storedUser = localStorage.getItem('orbitz_user');
         if (storedUser) {
             try {
                const user: User = JSON.parse(storedUser);
                setCurrentUser(user);
                await loadUserData(user.id);
                setView('dashboard');
             } catch(e) { setView('profile'); }
         } else {
             setView('profile');
         }
         setLoadingInitial(false);
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
             setLoadingInitial(true);
             await handleAuthUser(session.user);
        }
        if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setView('profile');
        }
    });

    return () => subscription.unsubscribe();
  }, [preferences.darkMode]);

  const loadUserData = async (userId: string) => {
    try {
      const { data: allUsers } = await supabase.from('profiles').select('*').neq('id', userId);
      setContacts(allUsers || MOCK_CONTACTS);
      fetchGroups(userId);
    } catch (e) {
      setContacts(MOCK_CONTACTS);
    }
  };

  const fetchGroups = async (userId: string) => {
      // Basic fetch logic for existing groups
  };

  // --- Dashboard Logic ---

  const handleProfileComplete = (user: User) => {
    saveUserToStorage(user);
    setCurrentUser(user);
    loadUserData(user.id);
    setView('dashboard');
    setLoadingInitial(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
      setCurrentUser(updatedUser);
      saveUserToStorage(updatedUser);
      supabase.from('profiles').update({
          name: updatedUser.name,
          language: updatedUser.language,
          avatar: updatedUser.avatar
      }).eq('id', updatedUser.id)
      .then(({ error }) => {
          if (error) console.warn("Background profile sync failed (harmless if offline):", error.message);
      });
  };

  const handleUpdatePreferences = (key: string, value: any) => {
      setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateGroup = async (name: string, members: User[]) => {
    if (!currentUser) return;
    const newGroup: Group = {
        id: uuidv4().slice(0, 8), // Simple ID
        name,
        members,
        messages: [],
        lastActive: Date.now()
    };
    setGroups(prev => [newGroup, ...prev]);
    handleJoinGroup(newGroup, true); 
  };

  const handleJoinGroup = async (group: Group, isHost: boolean = false) => {
    setActiveGroupId(group.id);
    if (isHost || group.members.some(m => m.id === currentUser?.id)) {
        setView('call');
        // Use preferences for default state
        setIsMicOn(preferences.defaultMicOn);
        setIsVideoOn(preferences.defaultVideoOn);
        if (preferences.defaultVideoOn) startCamera(); // Start camera if enabled pref
    } else {
        setView('waiting_room');
        simulateGuestKnocking(group.id);
    }
  };

  // --- Admittance Logic ---
  const simulateGuestKnocking = async (groupId: string) => {
      if(!currentUser) return;
      try {
          await supabase.from('messages').insert([{
              group_id: groupId,
              sender_id: currentUser.id,
              text: `__SYSTEM_KNOCK__:${JSON.stringify(currentUser)}`,
              client_message_id: uuidv4(),
              original_language: currentUser.language
          }]);
      } catch(e) { console.warn("Failed to knock", e); }
  };

  const handleAdmitGuest = (guest: User) => {
      setGroups(prev => prev.map(g => {
          if (g.id !== activeGroupId) return g;
          return { ...g, members: [...g.members, guest] };
      }));
      setPendingGuests(prev => prev.filter(p => p.id !== guest.id));
      sendSystemMessage(activeGroupId!, `__SYSTEM_ADMIT__:${guest.id}`);
  };

  const handleDenyGuest = (guestId: string) => {
      setPendingGuests(prev => prev.filter(p => p.id !== guestId));
  };

  const sendSystemMessage = async (groupId: string, text: string) => {
     if (!currentUser) return;
     await supabase.from('messages').insert([{
        group_id: groupId,
        sender_id: currentUser.id,
        text: text,
        client_message_id: uuidv4(),
        original_language: currentUser.language
    }]);
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
    }
    audioQueue.clear();
    setView('dashboard');
    setActiveGroupId(null);
    setLiveCaption(null);
    setPendingGuests([]);
    setSideView(null);
    setIsRecording(false);
  };

  // --- Media Setup ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      setLocalStream(stream);
      // Enforce preferences initially
      stream.getAudioTracks().forEach(track => track.enabled = preferences.defaultMicOn);
      stream.getVideoTracks().forEach(track => track.enabled = preferences.defaultVideoOn);
    } catch (err) { console.error("Error accessing media", err); }
  };

  const handleToggleScreenShare = async () => {
      if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
      } else {
          try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
              setScreenStream(stream);
              stream.getVideoTracks()[0].onended = () => {
                  setScreenStream(null);
              };
          } catch (e) {
              console.warn("Screen share cancelled", e);
          }
      }
  };


  // --- Real-time Logic ---

  useEffect(() => {
    if (!activeGroupId || !currentUser) return;

    const channel = supabase
        .channel(`group-${activeGroupId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${activeGroupId}` },
            async (payload) => {
                const newMsg = payload.new;
                
                // System Messages
                if (newMsg.text.startsWith('__SYSTEM_KNOCK__')) {
                    if (view === 'call') {
                         const guestDataStr = newMsg.text.split('__SYSTEM_KNOCK__:')[1];
                         try {
                             const guest: User = JSON.parse(guestDataStr);
                             if (guest.id !== currentUser.id) {
                                 setPendingGuests(prev => prev.some(p => p.id === guest.id) ? prev : [...prev, guest]);
                             }
                         } catch(e){}
                    }
                    return;
                }
                if (newMsg.text.startsWith('__SYSTEM_ADMIT__')) {
                    const admittedId = newMsg.text.split('__SYSTEM_ADMIT__:')[1];
                    if (currentUser.id === admittedId && view === 'waiting_room') {
                        setView('call');
                        startCamera();
                    }
                    return;
                }

                // Normal Messages
                if (newMsg.sender_id === currentUser.id) {
                     showCaptionHandler(currentUser.id, newMsg.text); 
                     if (!isMyTranslatorMuted && !newMsg.is_direct) {
                         const result = await translateAndSpeak(newMsg.text, currentUser.language, true, currentUser.voice || 'Fenrir');
                         if (result && result.audioData) {
                             initAudio();
                             if (audioCtxRef.current) {
                                 const rawBytes = decodeBase64(result.audioData);
                                 const audioBuffer = await decodeAudioData(rawBytes, audioCtxRef.current);
                                 audioQueue.enqueue(audioBuffer);
                             }
                         }
                     }
                     return; 
                }

                // Remote Messages
                const isMuted = mutedUserIdsRef.current.has(newMsg.sender_id);
                const sender = activeGroup?.members.find(m => m.id === newMsg.sender_id) || groups.find(g => g.id === activeGroupId)?.members.find(m => m.id === newMsg.sender_id);
                const senderVoice = sender?.voice || 'Fenrir';
                
                setIsTranslating(true);
                setSpeakingUserId(newMsg.sender_id);

                try {
                    const result = await translateAndSpeak(newMsg.text, currentUser.language, true, senderVoice);
                    
                    if (result) {
                        showCaptionHandler(newMsg.sender_id, newMsg.text, result.translatedText);
                        // Check muted state before playing audio
                        if (result.audioData && isSpeakerOn && !isMuted) {
                            initAudio();
                            if (audioCtxRef.current) {
                                const rawBytes = decodeBase64(result.audioData);
                                const audioBuffer = await decodeAudioData(rawBytes, audioCtxRef.current);
                                audioQueue.enqueue(audioBuffer);
                            }
                        }
                    } else {
                         showCaptionHandler(newMsg.sender_id, newMsg.text);
                    }
                } catch(e) {
                    console.error("Translation error", e);
                } finally {
                    setIsTranslating(false);
                    setTimeout(() => setSpeakingUserId(null), 2000);
                }
            }
        )
        .subscribe();

    messagesSubscription.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [activeGroupId, currentUser, activeGroup, view, isMyTranslatorMuted, isSpeakerOn, groups]);


  // --- Send Logic ---

  const handleFinalTranscript = useCallback(async (text: string, audioBlob?: Blob) => {
    if (!text.trim() || !activeGroupId || !currentUser) return;
    
    setSpeakingUserId(currentUser.id);
    showCaptionHandler(currentUser.id, text);
    
    if (audioBlob) saveTrainingData(currentUser.id, text, audioBlob);
    
    if (!isMyTranslatorMuted && !isDirectVoice) {
         try {
             translateAndSpeak(text, currentUser.language, true, currentUser.voice || 'Fenrir').then(result => {
                 if (result?.audioData) {
                     initAudio();
                     if (audioCtxRef.current) {
                         const rawBytes = decodeBase64(result.audioData);
                         decodeAudioData(rawBytes, audioCtxRef.current).then(buffer => audioQueue.enqueue(buffer));
                     }
                 }
             });
         } catch(e) {}
    }

    try {
      await supabase.from('messages').insert([{
          group_id: activeGroupId,
          sender_id: currentUser.id,
          text: text,
          client_message_id: uuidv4(),
          original_language: currentUser.language
      }]);
    } catch (err) { console.error(err); }
    
    setTimeout(() => setSpeakingUserId(null), 1500);
    
  }, [activeGroupId, currentUser, isMyTranslatorMuted, groups, isDirectVoice]);


  const { startListening, stopListening, transcript } = useSpeechRecognition(
    currentUser ? getSpeechRecognitionLanguage(currentUser.language) : 'en-US', 
    localStream, 
    handleFinalTranscript
  );

  useEffect(() => {
    if (view === 'call' && isMicOn) startListening();
    else stopListening();
  }, [view, isMicOn, startListening, stopListening]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
      localStream.getAudioTracks().forEach(track => track.enabled = isMicOn);
    }
  }, [isVideoOn, isMicOn, localStream]);

  // Combine interim transcript with live caption for display
  const activeCaption = transcript 
      ? { userId: currentUser?.id || 'me', originalText: transcript, timestamp: Date.now() }
      : liveCaption;

  // --- Render ---

  if (loadingInitial) {
      return (
        <div className="h-screen w-full flex items-center justify-center ambient-wave text-indigo-500 flex-col gap-4">
            <img 
              src="https://orbitzzz.vercel.app/icons/logo.png" 
              alt="Orbitz" 
              className="w-20 h-20 animate-pulse drop-shadow-[0_0_25px_rgba(99,102,241,0.5)]" 
            />
        </div>
      );
  }

  if (view === 'profile') return <ProfileSetup onComplete={handleProfileComplete} />;
  
  if (view === 'waiting_room') {
      return (
          <div className="h-screen ambient-wave flex flex-col items-center justify-center p-6 text-center">
              <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center animate-pulse mb-6 border border-white/10">
                  <UserIcon size={40} className="text-zinc-500" />
              </div>
              <h2 className="text-2xl font-light text-white mb-2">Waiting for Host...</h2>
              <p className="text-zinc-500 max-w-xs">You have requested to join the session. Please wait for the host to admit you.</p>
              <button onClick={handleEndCall} className="mt-8 px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors">Cancel</button>
          </div>
      );
  }

  if (view === 'dashboard' && currentUser) {
    return (
        <>
            <Dashboard 
                currentUser={currentUser}
                contacts={contacts}
                groups={groups}
                onJoinGroup={handleJoinGroup}
                onCreateGroup={handleCreateGroup}
                onDeleteGroup={() => {}}
                onDirectCall={() => {}}
                onEditProfile={() => setIsSettingsOpen(true)} 
            />
            {isSettingsOpen && (
                <SettingsModal 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)}
                    currentUser={currentUser}
                    onUpdateUser={handleUpdateUser} 
                    preferences={preferences}
                    onUpdatePreferences={handleUpdatePreferences}
                />
            )}
        </>
    );
  }

  if (!currentUser || !activeGroup) return null;

  return (
    <div className={`flex h-screen w-full overflow-hidden ambient-wave text-white ${preferences.darkMode ? 'dark' : ''}`} onClick={initAudio}>
      
      {/* Main Content Area (Video + Controls) */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* Pending Guest Toasts */}
        {pendingGuests.length > 0 && (
            <div className="absolute top-24 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none">
                {pendingGuests.map(guest => (
                    <div key={guest.id} className="pointer-events-auto bg-zinc-800/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl flex items-center gap-4 animate-in slide-in-from-top-2">
                        <span className="text-sm font-medium">{guest.name} wants to join</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleAdmitGuest(guest)} className="p-2 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/30"><Check size={16} /></button>
                            <button onClick={() => handleDenyGuest(guest.id)} className="p-2 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30"><X size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Top Bar (Participants, Language, Rec Status) */}
        <TopBar 
            isVisible={true} // Top bar handles its own idle visual state internally or we can pass !isIdle
            currentUser={currentUser}
            participants={participants}
            onLanguageChange={(lang) => {
                const updated = { ...currentUser, language: lang };
                handleUpdateUser(updated); 
            }}
            isRecording={isRecording}
            onToggleRecording={() => setIsRecording(!isRecording)}
            pinnedUserId={pinnedUserId}
            onPinUser={(id) => setPinnedUserId(id === pinnedUserId ? null : id)}
            activeGroupId={activeGroupId}
        />

        {/* Stage */}
        <div className="flex-1 relative overflow-hidden">
          <VideoStage 
            localStream={localStream}
            screenStream={screenStream}
            isVideoEnabled={isVideoOn}
            isAudioEnabled={isMicOn}
            currentUser={currentUser}
            participants={participants}
            speakingUserId={speakingUserId}
            liveCaption={activeCaption} 
            isDirectCall={isDirectCall}
            showCaptions={showCaptions}
            pinnedUserId={pinnedUserId}
            mutedUserIds={mutedUserIds}
            onToggleMuteParticipant={handleToggleMuteParticipant}
          />
        </div>

        {/* Controls */}
        <ControlBar 
          isVisible={controlsVisible}
          isMicOn={isMicOn}
          isVideoOn={isVideoOn}
          isTranslating={isTranslating}
          onToggleMic={() => setIsMicOn(!isMicOn)}
          onToggleVideo={() => setIsVideoOn(!isVideoOn)}
          onEndCall={handleEndCall}
          myLanguage={currentUser.language}
          onMyLanguageChange={() => {}} 
          localStream={localStream}
          onToggleHistory={() => setSideView(v => v === 'chat' ? null : 'chat')}
          isMyTranslatorMuted={isMyTranslatorMuted}
          onToggleMyTranslatorMute={() => setIsMyTranslatorMuted(!isMyTranslatorMuted)}
          isScreenSharing={!!screenStream}
          onToggleScreenShare={handleToggleScreenShare}
          showParticipants={sideView === 'participants'}
          onToggleParticipants={() => setSideView(v => v === 'participants' ? null : 'participants')}
          showCaptions={showCaptions}
          onToggleCaptions={() => setShowCaptions(!showCaptions)}
          isDirectVoice={isDirectVoice}
          onToggleDirectVoice={() => setIsDirectVoice(!isDirectVoice)}
          onGoogleAction={(action) => setGoogleAction(action)}
          isRecording={isRecording}
          onToggleRecording={() => setIsRecording(!isRecording)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <GoogleIntegrations 
            isOpen={!!googleAction}
            onClose={() => setGoogleAction(null)}
            action={googleAction}
            activeGroup={activeGroup}
        />
        
        {isSettingsOpen && (
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                currentUser={currentUser}
                onUpdateUser={handleUpdateUser} 
                preferences={preferences}
                onUpdatePreferences={handleUpdatePreferences}
            />
        )}
      </div>

      {/* Right Sidebar Panel (Zoom Style) */}
      {sideView && (
          <div className="w-[360px] bg-zinc-950/95 backdrop-blur-xl border-l border-white/10 flex flex-col shrink-0 z-40 transition-all duration-300 animate-in slide-in-from-right">
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/5">
                  <h3 className="font-medium text-white tracking-wide">
                      {sideView === 'participants' ? `Participants (${participants.length + 1})` : 'Meeting Chat'}
                  </h3>
                  <button onClick={() => setSideView(null)} className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/10 rounded-full">
                      <X size={18} />
                  </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden relative flex flex-col">
                  {sideView === 'participants' && (
                      <ParticipantsSidebar 
                        isOpen={true} 
                        isEmbedded={true}
                        onClose={() => setSideView(null)}
                        participants={participants}
                        currentUser={currentUser}
                        activeGroup={activeGroup}
                        mutedUserIds={mutedUserIds}
                        onToggleMuteParticipant={handleToggleMuteParticipant}
                      />
                  )}
                  {sideView === 'chat' && (
                      <CallHistory 
                        group={activeGroup} 
                        currentUser={currentUser} 
                        onClose={() => setSideView(null)}
                        isEmbedded={true}
                      />
                  )}
              </div>
          </div>
      )}

    </div>
  );
}