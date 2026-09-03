import React, { useState } from 'react';
import { User, Mail, MapPin, Calendar, Edit3 } from 'lucide-react';
import EditProfileModal from './EditProfileModal';

export default function ProfileStrip({ currentUser, liveStats = {}, onActionClick, onUserUpdate }) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const roleTitle = currentUser?.role || 'Sales Executive';
  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Xenith Employee';
  const userEmail = currentUser?.email || 'user@artxenith.com';
  const userLocation = currentUser?.location || 'Lahore HQ Studio';

  const avatarUrl = currentUser?.avatarUrl;

  const handleOpenEdit = () => {
    setIsEditOpen(true);
    if (onActionClick) onActionClick();
  };

  return (
    <>
      <div className="p-6 rounded-2xl glass-panel border border-brand-border relative overflow-hidden text-left shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Left Column: Avatar + Name + Role */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0 group cursor-pointer" onClick={handleOpenEdit}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#D7F000] shadow-md group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#D7F000]/20 border-2 border-[#D7F000] flex items-center justify-center text-[#D7F000] font-extrabold text-xl font-display shadow-md">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full border border-[#D7F000]/40 bg-[#D7F000]/15 text-[#D7F000] text-[9px] font-extrabold uppercase font-mono tracking-wider">
                {roleTitle}
              </span>
              <h2 className="text-2xl font-extrabold text-brand-text font-display tracking-tight">
                {userName}
              </h2>
              <p className="text-xs text-brand-text-mute font-mono flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-text-mute" />
                {userEmail}
              </p>
            </div>
          </div>

          {/* Center Column: Key Metrics & Info */}
          <div className="hidden sm:flex items-center gap-8 px-6 border-y sm:border-y-0 sm:border-x border-brand-border py-4 sm:py-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Studio Location</span>
              <p className="text-xs font-extrabold text-brand-text flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#D7F000]" />
                {userLocation}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Workforce Size</span>
              <p className="text-xs font-extrabold text-brand-text flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#D7F000]" />
                {liveStats.totalEmployees || 0} Staff
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-text-mute uppercase tracking-widest font-mono">Present Today</span>
              <p className="text-sm font-extrabold text-[#D7F000] font-mono">
                {liveStats.presentToday || 0} Staff
              </p>
            </div>
          </div>

          {/* Right Column: Edit Profile Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenEdit}
              className="px-4 py-2 rounded-xl bg-[#D7F000] text-black text-xs font-extrabold uppercase tracking-wider font-display hover:bg-[#E8F52A] transition-all cursor-pointer flex items-center gap-1.5 tactile-btn shadow-md"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

        </div>

        {/* Decorative Brand Accent Streak */}
        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-[#D7F000]/10 to-transparent pointer-events-none" />
      </div>

      {/* Edit Profile Dialog Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentUser={currentUser}
        onSave={(updated) => {
          if (onUserUpdate) onUserUpdate(updated);
        }}
      />
    </>
  );
}

