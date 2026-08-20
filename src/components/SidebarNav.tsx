import React from 'react';
import {
  LayoutGrid,
  MessageSquare,
  Compass,
  PhoneCall,
  User,
  Plus,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { UserProfile, APP_LOGO_URL } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';

interface SidebarNavProps {
  activeTab: 'home' | 'inbox' | 'discover' | 'calls' | 'profile';
  onTabChange: (tab: 'home' | 'inbox' | 'discover' | 'calls' | 'profile') => void;
  currentUser: UserProfile;
  onOpenNewChat: () => void;
  onLogout: () => void;
  unreadCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onOpenNewChat,
  onLogout,
  unreadCount = 0,
}) => {
  const navItems: Array<{
    id: 'home' | 'inbox' | 'discover' | 'calls' | 'profile';
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'home', label: 'الرئيسية', icon: LayoutGrid },
    { id: 'inbox', label: 'الرسائل والمحادثات', icon: MessageSquare, badge: unreadCount },
    { id: 'discover', label: 'المجتمعات', icon: Compass },
    { id: 'calls', label: 'المكالمات والاجتماعات', icon: PhoneCall },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
  ];

  return (
    <aside className="hidden md:flex flex-col w-68 bg-white border-l border-neutral-200/80 p-5 shrink-0 select-none justify-between h-full shadow-xs">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-1 mb-6">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md shrink-0 border border-neutral-200/80 bg-neutral-900 flex items-center justify-center">
            <img
              src={APP_LOGO_URL}
              alt="Malek Message Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-base font-black text-[#18181b] tracking-tight">Malek Message</h1>
            <span className="text-[11px] text-neutral-400 font-sans block">تواصل حقيقي وآمن</span>
          </div>
        </div>

        {/* New Chat Primary Action Button */}
        <button
          onClick={onOpenNewChat}
          className="w-full h-12 rounded-2xl bg-[#111827] text-white hover:bg-[#302c52] transition flex items-center justify-center gap-2 text-xs font-bold shadow-md cursor-pointer mb-6"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>محادثة جديدة</span>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'text-neutral-600 hover:bg-[#f8f7f3] hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#b8f3df]' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Bottom Bar */}
      <div className="pt-4 border-t border-neutral-100 space-y-3">
        <button
          onClick={() => onTabChange('profile')}
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#f8f7f3] transition cursor-pointer text-right"
        >
          <div className="relative shrink-0">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-10 h-10 rounded-2xl object-cover"
              />
            ) : (
              <div
                className={`w-10 h-10 rounded-2xl ${getRandomTone(
                  currentUser.uid
                )} flex items-center justify-center font-black text-xs`}
              >
                {getInitials(currentUser.displayName)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[#18181b] block truncate">
              {currentUser.displayName}
            </span>
            <span className="text-[11px] text-[#6d5dfc] font-mono block truncate">
              @{currentUser.username}
            </span>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full h-10 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};
