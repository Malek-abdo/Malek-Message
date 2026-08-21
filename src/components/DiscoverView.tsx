import React, { useState } from 'react';
import { Compass, Plus, Users, Search, Check, MessageSquare, ArrowLeft } from 'lucide-react';
import { Community, UserProfile } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';

interface DiscoverViewProps {
  communities: Community[];
  currentUser: UserProfile;
  onOpenNewCommunity: () => void;
  onToggleJoin: (communityId: string) => void;
  onSelectCommunity: (communityId: string) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  communities,
  currentUser,
  onOpenNewCommunity,
  onToggleJoin,
  onSelectCommunity,
}) => {
  const [search, setSearch] = useState('');

  const filtered = communities.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#18181b]">المجتمعات والقنوات</h2>
          <p className="text-xs text-neutral-400">انضم إلى مجتمعات تناسب اهتماماتك أو أنشئ مجتمعك الخاص وتحدث مع الأعضاء</p>
        </div>

        <button
          onClick={onOpenNewCommunity}
          className="h-11 px-5 rounded-2xl bg-[#111827] text-white hover:bg-[#302c52] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>إنشاء مجتمع جديد</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مجتمع أو موضوع..."
          className="w-full h-12 rounded-2xl bg-white border border-neutral-200/80 pr-11 pl-4 text-xs outline-none focus:border-[#6d5dfc]/40 text-right shadow-xs"
        />
        <Search className="w-4 h-4 absolute right-4 top-4 text-neutral-400" />
      </div>

      {/* Communities Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200/80 p-6">
          <div className="w-16 h-16 rounded-3xl bg-[#f8f7f3] text-[#6d5dfc] flex items-center justify-center mx-auto mb-3">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-neutral-800 mb-1">لا توجد مجتمعات مطابقة</h3>
          <p className="text-xs text-neutral-400 mb-4">كن أول من ينشئ مجتمعاً جديداً في هذا الموضوع!</p>
          <button
            onClick={onOpenNewCommunity}
            className="px-5 py-2.5 rounded-2xl bg-[#111827] text-white font-bold text-xs hover:bg-[#302c52] transition cursor-pointer"
          >
            إنشاء مجتمع الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((comm) => {
            const isMember = comm.members && comm.members.includes(currentUser.uid);
            return (
              <div
                key={comm.id}
                className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition group"
              >
                <div>
                  <div
                    onClick={() => onSelectCommunity(comm.id)}
                    className="flex items-center gap-3 mb-3 cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl ${
                        comm.tone || getRandomTone(comm.id)
                      } flex items-center justify-center font-black text-sm shrink-0 shadow-xs group-hover:scale-105 transition`}
                    >
                      {comm.letters || getInitials(comm.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-[#18181b] truncate group-hover:text-[#6d5dfc] transition">
                        {comm.title}
                      </h3>
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-600" />
                        {comm.membersCount || (comm.members?.length ?? 1)} عضو
                      </span>
                    </div>
                  </div>

                  <p
                    onClick={() => onSelectCommunity(comm.id)}
                    className="text-xs text-neutral-600 line-clamp-3 mb-4 leading-relaxed cursor-pointer"
                  >
                    {comm.description || 'مجتمع للتواصل ومشاركة الأفكار والملفات.'}
                  </p>

                  {/* Last Message Preview if exists */}
                  {comm.lastMessage && (
                    <div
                      onClick={() => onSelectCommunity(comm.id)}
                      className="p-2.5 rounded-xl bg-[#f8f7f3] text-[11px] text-neutral-600 mb-3 flex items-center gap-2 cursor-pointer border border-neutral-200/50"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#6d5dfc] shrink-0" />
                      <span className="truncate flex-1">
                        {comm.lastSenderName ? `${comm.lastSenderName}: ` : ''}
                        {comm.lastMessage}
                      </span>
                      {comm.lastMessageTime && (
                        <span className="text-[10px] text-neutral-400 shrink-0">
                          {comm.lastMessageTime}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectCommunity(comm.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-[#302c52] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>المحادثة</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onToggleJoin(comm.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isMember
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {isMember ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>منضم</span>
                      </>
                    ) : (
                      <span>انضمام</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
