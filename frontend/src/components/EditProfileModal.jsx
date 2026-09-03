import React, { useState } from 'react';
import { X, Camera, Lock, User, Mail, Phone, MapPin, Check, KeyRound, Shield, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

// Pre-curated high quality diverse profile avatars
const PRESET_AVATARS = [
  { id: 1, label: 'Male Exec', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 2, label: 'Male Tech', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 3, label: 'Male Lead', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 4, label: 'Female Exec', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { id: 5, label: 'Male Artist', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 6, label: 'Female Lead', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' }
];

export default function EditProfileModal({ isOpen, onClose, currentUser, onSave }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'avatar' | 'security'
  
  // Profile fields
  const [name, setName] = useState(currentUser?.name || currentUser?.email?.split('@')[0] || 'Mary W. Jackson');
  const [email, setEmail] = useState(currentUser?.email || 'mary@bizhaven.com');
  const [phone, setPhone] = useState(currentUser?.phone || '+92 (300) 555-0192');
  const [location, setLocation] = useState(currentUser?.location || 'Lahore HQ Studio');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result);
        toast.success('Custom avatar loaded!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (activeTab === 'security') {
      if (newPassword && newPassword !== confirmPassword) {
        toast.error('New passwords do not match!');
        return;
      }
      if (newPassword && newPassword.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    const updatedUser = {
      ...currentUser,
      name,
      email,
      phone,
      location,
      avatarUrl
    };

    // Persist to local storage
    localStorage.setItem('user', JSON.stringify(updatedUser));

    if (onSave) onSave(updatedUser);

    toast.success('Profile updated successfully!', {
      icon: '👤',
      style: { background: '#111', color: '#D7F000', border: '1px solid #D7F000', borderRadius: '14px' }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm text-left">
      <div className="relative w-full max-w-xl bg-brand-bg-elevated border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-enter">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border bg-brand-bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D7F000]/15 border border-[#D7F000]/30 flex items-center justify-center text-[#D7F000]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-brand-text font-display uppercase tracking-tight">
                Edit User Profile & Settings
              </h3>
              <p className="text-xs text-brand-text-mute">Update display name, avatar picture, and password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-brand-border text-brand-text-mute hover:text-brand-text hover:border-brand-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-brand-border bg-brand-bg-surface/50 px-5 pt-3 gap-2">
          {[
            { id: 'profile', label: 'Profile Info', icon: User },
            { id: 'avatar', label: 'Profile Picture', icon: Camera },
            { id: 'security', label: 'Security & Password', icon: KeyRound }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-extrabold transition-all border-t border-x ${
                  active
                    ? 'bg-brand-bg-elevated border-brand-border text-[#D7F000]'
                    : 'border-transparent text-brand-text-soft hover:text-brand-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                  Office Location / Studio
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE PICTURE */}
          {activeTab === 'avatar' && (
            <div className="space-y-5">
              {/* Current Preview */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-bg-surface border border-brand-border">
                <img
                  src={avatarUrl}
                  alt="Avatar Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#D7F000]"
                />
                <div>
                  <h4 className="text-xs font-extrabold text-brand-text">Current Profile Picture</h4>
                  <p className="text-[10px] text-brand-text-mute mt-0.5">Select a preset avatar below or upload your picture.</p>
                </div>
              </div>

              {/* Preset Gallery */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-2">
                  Choose Preset Avatar
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={`p-1.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        avatarUrl === preset.url
                          ? 'border-[#D7F000] bg-[#D7F000]/10'
                          : 'border-brand-border bg-brand-bg-surface hover:border-brand-text'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-10 h-10 rounded-full object-cover" />
                      <span className="text-[8px] font-mono font-bold text-brand-text-soft truncate max-w-full">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Custom File or Input URL */}
              <div className="space-y-3 pt-2 border-t border-brand-border">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                    Upload Custom Image
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-brand-border hover:border-[#D7F000] bg-brand-bg-surface cursor-pointer text-xs font-extrabold text-brand-text hover:text-[#D7F000] transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Choose Photo File (PNG, JPG)</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                    Or Image URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-brand-text-mute font-mono block mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Check className="w-4 h-4 text-brand-text-mute absolute left-3 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-bg-surface border border-brand-border text-xs text-brand-text focus:border-[#D7F000]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-brand-border text-xs font-extrabold uppercase text-brand-text-soft hover:text-brand-text transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-[#D7F000] text-black text-xs font-extrabold uppercase tracking-wider font-display hover:bg-[#E8F52A] transition-colors cursor-pointer tactile-btn shadow-lg shadow-[#D7F000]/20"
            >
              Save Profile Changes
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
