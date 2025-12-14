import React, { useState } from 'react';
import { User, Language } from '../types';
import { supabase } from '../lib/supabase';
import { X, User as UserIcon, Lock, Monitor, Smartphone, Camera, Mic, Volume2, Save, Check, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
  preferences: {
    darkMode: boolean;
    autoHideControls: boolean;
    defaultMicOn: boolean;
    defaultVideoOn: boolean;
  };
  onUpdatePreferences: (key: string, value: any) => void;
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'account', label: 'Account', icon: Lock },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'devices', label: 'Audio & Video', icon: Volume2 },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUpdateUser,
  preferences,
  onUpdatePreferences
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile State
  const [name, setName] = useState(currentUser.name);
  const [language, setLanguage] = useState<Language>(currentUser.language);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Account State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [passwordMessage, setPasswordMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    
    // Optimistic Update: Update UI immediately
    const updatedUser = { ...currentUser, name, language, avatar };
    onUpdateUser(updatedUser);

    try {
        const { error } = await supabase.from('profiles').update({ name, language, avatar }).eq('id', currentUser.id);
        if (error) {
             console.warn("Backend profile sync failed (harmless if using local mode)", error);
        }
    } catch (e) {
        console.warn("Backend connection error during profile save", e);
    } finally {
        setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setPasswordStatus('error');
          setPasswordMessage("Passwords do not match");
          return;
      }
      if (newPassword.length < 6) {
          setPasswordStatus('error');
          setPasswordMessage("Password must be at least 6 characters");
          return;
      }

      setPasswordStatus('saving');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
          setPasswordStatus('error');
          setPasswordMessage(error.message);
      } else {
          setPasswordStatus('success');
          setPasswordMessage("Password updated successfully");
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_SIZE = 300; 

              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else {
                  if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                  setAvatar(dataUrl);
              }
          };
          if (event.target?.result) {
              img.src = event.target.result as string;
          }
      };
      reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-4xl h-[80vh] bg-zinc-950/80 border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex overflow-hidden backdrop-blur-2xl">
        
        {/* Sidebar */}
        <div className="w-72 bg-black/20 border-r border-white/5 p-8 flex flex-col">
            <h2 className="text-2xl font-light text-white mb-10 pl-2 tracking-tight">Settings</h2>
            <nav className="space-y-3 flex-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-600/20 text-white border border-indigo-500/30' : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                        <tab.icon size={20} className={activeTab === tab.id ? 'text-indigo-400' : ''} />
                        <span className="font-medium text-sm tracking-wide">{tab.label}</span>
                    </button>
                ))}
            </nav>
            <div className="mt-auto text-[10px] text-zinc-700 font-mono px-2">
                Eburon AI • v1.0.2
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative">
            <button onClick={onClose} className="absolute top-8 right-8 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors z-10">
                <X size={24} />
            </button>

            <div className="flex-1 overflow-y-auto p-12">
                
                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-indigo-500/50 transition-colors shadow-2xl">
                                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-bold uppercase tracking-widest text-white">
                                    Change
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                </label>
                            </div>
                            <div>
                                <h3 className="text-3xl font-light text-white mb-1">{name}</h3>
                                <p className="text-sm text-zinc-500">Update your public identity.</p>
                            </div>
                        </div>

                        <div className="space-y-6 max-w-lg">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 pl-1">Display Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all font-light"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 pl-1">Native Language</label>
                                <select 
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as Language)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    {Object.values(Language).map(l => (
                                        <option key={l} value={l} className="bg-zinc-950">{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-indigo-500/20"
                            >
                                {isSavingProfile ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* ACCOUNT TAB */}
                {activeTab === 'account' && (
                    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                        <div>
                            <h3 className="text-2xl font-light text-white mb-2">Security</h3>
                            <p className="text-sm text-zinc-500">Manage credentials and access.</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg bg-white/5 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                            <h4 className="font-medium text-white mb-4">Change Password</h4>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 pl-1">New Password</label>
                                <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all font-light"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 pl-1">Confirm Password</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-indigo-500/50 outline-none transition-all font-light"
                                    placeholder="••••••••"
                                />
                            </div>
                            
                            {passwordStatus === 'error' && <p className="text-red-400 text-sm">{passwordMessage}</p>}
                            {passwordStatus === 'success' && <p className="text-green-400 text-sm flex items-center gap-2"><Check size={14}/> {passwordMessage}</p>}

                            <button 
                                type="submit"
                                disabled={passwordStatus === 'saving'}
                                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-medium transition-colors mt-2"
                            >
                                {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                )}

                {/* APPEARANCE TAB */}
                {activeTab === 'appearance' && (
                    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                         <div>
                            <h3 className="text-2xl font-light text-white mb-2">Interface</h3>
                            <p className="text-sm text-zinc-500">Customize the visual environment.</p>
                        </div>

                        <div className="space-y-4 max-w-xl">
                            {/* Dark Mode Toggle */}
                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-zinc-900 rounded-2xl text-indigo-400"><Monitor size={24}/></div>
                                    <div>
                                        <div className="font-medium text-white mb-1">Dark Mode</div>
                                        <div className="text-xs text-zinc-500">Deep Space aesthetic (Default).</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onUpdatePreferences('darkMode', !preferences.darkMode)}
                                    className={`w-14 h-8 rounded-full transition-colors relative ${preferences.darkMode ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${preferences.darkMode ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Auto-Hide Toggle */}
                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-zinc-900 rounded-2xl text-indigo-400"><Smartphone size={24}/></div>
                                    <div>
                                        <div className="font-medium text-white mb-1">Auto-Hide Controls</div>
                                        <div className="text-xs text-zinc-500">Fade dock when idle for immersion.</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onUpdatePreferences('autoHideControls', !preferences.autoHideControls)}
                                    className={`w-14 h-8 rounded-full transition-colors relative ${preferences.autoHideControls ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${preferences.autoHideControls ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DEVICES TAB */}
                {activeTab === 'devices' && (
                    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                        <div>
                            <h3 className="text-2xl font-light text-white mb-2">Input Devices</h3>
                            <p className="text-sm text-zinc-500">Configure default hardware behaviors.</p>
                        </div>

                        <div className="space-y-4 max-w-xl">
                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-zinc-900 rounded-2xl text-indigo-400"><Mic size={24}/></div>
                                    <div>
                                        <div className="font-medium text-white mb-1">Microphone Active</div>
                                        <div className="text-xs text-zinc-500">Join sessions unmuted.</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onUpdatePreferences('defaultMicOn', !preferences.defaultMicOn)}
                                    className={`w-14 h-8 rounded-full transition-colors relative ${preferences.defaultMicOn ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${preferences.defaultMicOn ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-zinc-900 rounded-2xl text-indigo-400"><Camera size={24}/></div>
                                    <div>
                                        <div className="font-medium text-white mb-1">Camera Active</div>
                                        <div className="text-xs text-zinc-500">Join sessions with video.</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onUpdatePreferences('defaultVideoOn', !preferences.defaultVideoOn)}
                                    className={`w-14 h-8 rounded-full transition-colors relative ${preferences.defaultVideoOn ? 'bg-indigo-600' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${preferences.defaultVideoOn ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};