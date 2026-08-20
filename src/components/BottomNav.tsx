import React from 'react';
import { LayoutGrid, MessageSquare, Compass, PhoneCall, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'home' | 'inbox' | 'discover' | 'calls' | 'profile';
  onTabChange: (tab: 'home' | 'inbox' | 'discover' | 'calls' | 'profile') => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, unreadCount = 0 }) => {
  const navItems: Array<{
    id: 'home' | 'inbox' | 'discover' | 'calls' | 'profile';
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'home', label: 'الرئيسية', icon: LayoutGrid },
    { id: 'inbox', label: 'الرسائل', icon: MessageSquare, badge: unreadCount },
    { id: 'discover', label: 'المجتمعات', icon: Compass },
    { id: 'calls', label: 'المكالمات', icon: PhoneCall },
    { id: 'profile', label: 'حسابي', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-neutral-200/90 px-3 py-1.5 shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer relative min-h-[50px] min-w-[58px] ${
                isActive ? 'text-[#111827]' : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              <div className="relative">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-[#111827] text-white shadow-sm' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#b8f3df]' : ''}`} />
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[10px] mt-0.5 whitespace-nowrap font-medium ${
                  isActive ? 'font-black text-[#111827]' : ''
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
