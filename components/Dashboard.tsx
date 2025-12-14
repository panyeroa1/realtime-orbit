import React, { useState } from 'react';
import { User, Group } from '../types';
import { Video, PlusSquare, Settings, ArrowRight, UserPlus, Disc } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface DashboardProps {
  currentUser: User;
  contacts: User[];
  groups: Group[];
  onJoinGroup: (group: Group) => void;
  onCreateGroup: (name: string, members: User[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onDirectCall: (contact: User) => void;
  onEditProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  contacts,
  groups,
  onJoinGroup,
  onCreateGroup,
  onDeleteGroup,
  onDirectCall,
  onEditProfile
}) => {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinId, setJoinId] = useState('');

  const handleNewMeeting = () => {
    const newSessionId = uuidv4().slice(0, 8); 
    onCreateGroup(`Session ${newSessionId}`, [currentUser]);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    const existing = groups.find(g => g.name.includes(joinId) || g.id === joinId);
    if (existing) {
        onJoinGroup(existing);
    } else {
        const mockGroup: Group = {
            id: joinId,
            name: `Session ${joinId}`,
            members: [currentUser],
            messages: [],
            lastActive: Date.now()
        };
        onJoinGroup(mockGroup);
    }
  };

  const renderAvatar = (avatarStr: string) => {
    const isImage = avatarStr.startsWith('http') || avatarStr.startsWith('data:');
    if (isImage) {
        return <img src={avatarStr} alt="Avatar" className="w-full h-full object-cover" />;
    }
    return <span className="text-xl md:text-2xl">{avatarStr}</span>;
  };

  return (
    <div className="h-screen flex flex-col items-center relative overflow-hidden font-sans text-white">
      
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center p-8 z-20">
          <div 
            className="flex items-center gap-4 bg-zinc-950/60 p-2 pr-6 rounded-full border border-white/10 backdrop-blur-xl cursor-pointer hover:bg-white/5 transition-all group" 
            onClick={onEditProfile}
          >
             <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/5 group-hover:border-indigo-500/50 transition-colors">
                {renderAvatar(currentUser.avatar)}
             </div>
             <span className="text-sm font-medium text-zinc-200 tracking-wide">{currentUser.name}</span>
          </div>
          
          <button onClick={onEditProfile} className="p-3 bg-zinc-950/60 rounded-full border border-white/10 text-zinc-400 hover:text-white transition-colors hover:bg-white/5 backdrop-blur-xl shadow-lg">
              <Settings size={22} />
          </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-6 z-10 -mt-20">
          
          {/* Time/Date Aesthetic */}
          <div className="text-center mb-20">
              <h1 className="text-8xl md:text-9xl font-light tracking-tighter text-white text-glow mb-4">
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </h1>
              <p className="text-indigo-400 uppercase tracking-[0.3em] text-xs font-bold">
                  {new Date().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}
              </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-8 w-full">
              
              {/* New Meeting */}
              <button 
                onClick={handleNewMeeting}
                className="flex flex-col items-center justify-center gap-6 bg-zinc-900/40 hover:bg-zinc-800/60 p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 group hover:border-orange-500/30 hover:shadow-[0_0_40px_rgba(234,88,12,0.1)]"
              >
                  <div className="w-20 h-20 bg-orange-500/10 rounded-3xl flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
                      <Video size={36} className="text-orange-500" />
                  </div>
                  <div className="text-center">
                    <span className="font-medium text-xl block mb-1">New Orbit</span>
                    <span className="text-xs text-zinc-500 font-light">Start instant session</span>
                  </div>
              </button>

              {/* Join */}
              <button 
                onClick={() => setShowJoinModal(true)}
                className="flex flex-col items-center justify-center gap-6 bg-zinc-900/40 hover:bg-zinc-800/60 p-10 rounded-[2.5rem] border border-white/10 backdrop-blur-xl transition-all hover:scale-[1.02] active:scale-95 group hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]"
              >
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                      <PlusSquare size={36} className="text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <span className="font-medium text-xl block mb-1">Join Orbit</span>
                    <span className="text-xs text-zinc-500 font-light">Enter session ID</span>
                  </div>
              </button>
          </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="w-full max-w-md bg-zinc-950/80 border border-white/10 rounded-[2.5rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative backdrop-blur-2xl">
                  <h2 className="text-3xl font-light text-white mb-2 text-center tracking-tight">Join Session</h2>
                  <p className="text-zinc-500 text-center mb-8 text-sm">Enter the unique identifier for the orbit.</p>
                  
                  <form onSubmit={handleJoin} className="space-y-6">
                      <input 
                        type="text" 
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        placeholder="Orbit ID"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-center text-xl outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700 text-white font-light tracking-wide"
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-4">
                          <button type="button" onClick={() => setShowJoinModal(false)} className="py-4 rounded-2xl bg-white/5 text-zinc-400 hover:bg-white/10 font-medium transition-colors border border-white/5">Cancel</button>
                          <button type="submit" className="py-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-colors">Connect</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};