import React from 'react';
import {
  Sparkles,
  Plus,
  MessageSquare,
  Video,
  Phone,
  Compass,
  FileText,
  UserCheck,
  CheckCheck,
} from 'lucide-react';
import { UserProfile, Conversation, Community, CallRecord, QuickNote } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';
import { LinkifiedText } from './LinkifiedText';

interface HomeFeedProps {
  currentUser: UserProfile;
  conversations: Conversation[];
  communities: Community[];
  calls: CallRecord[];
  notes: QuickNote[];
  onSelectConversation: (convId: string) => void;
  onSelectCommunity?: (communityId: string) => void;
  onOpenNewChat: () => void;
  onOpenNewCommunity: () => void;
  onOpenNewNote: () => void;
  onStartCall: (title?: string) => void;
  onTabChange: (tab: 'home' | 'inbox' | 'discover' | 'calls' | 'profile') => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  currentUser,
  conversations,
  communities,
  calls,
  notes,
  onSelectConversation,
  onSelectCommunity,
  onOpenNewChat,
  onOpenNewCommunity,
  onOpenNewNote,
  onStartCall,
  onTabChange,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* 1. Welcome Card */}
      <div className="bg-gradient-to-l from-[#111827] to-[#1f293d] rounded-[32px] md:rounded-[36px] p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-neutral-300 font-bold uppercase tracking-wider">
              متصل الآن في Malek Message
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
            مرحباً، {currentUser.displayName}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300 mb-6">
            <span className="text-[#b8f3df] font-mono font-bold">@{currentUser.username}</span>
            {currentUser.phoneNumber && (
              <>
                <span>•</span>
                <span className="font-mono dir-ltr">{currentUser.countryCode} {currentUser.phoneNumber}</span>
              </>
            )}
            {currentUser.countryName && (
              <>
                <span>•</span>
                <span>{currentUser.countryName}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenNewChat}
              className="h-11 px-5 rounded-2xl bg-white text-[#111827] hover:bg-neutral-100 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#6d5dfc]" />
              <span>محادثة جديدة</span>
            </button>

            <button
              onClick={() => onStartCall()}
              className="h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer backdrop-blur-sm"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              <span>بدء اجتماع فيديو</span>
            </button>

            <button
              onClick={onOpenNewNote}
              className="h-11 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer backdrop-blur-sm"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>نشر حالة / ملاحظة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Notes Feed (Live from Firebase) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6d5dfc]" />
            <h2 className="text-base md:text-lg font-black text-[#18181b]">ملاحظات وحالات الأصدقاء</h2>
          </div>
          <button
            onClick={onOpenNewNote}
            className="text-xs font-bold text-[#6d5dfc] hover:underline cursor-pointer"
          >
            + إضافة ملاحظة
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="p-5 rounded-3xl bg-white border border-neutral-200/80 text-center text-xs text-neutral-400">
            لا توجد ملاحظات منشورة حتى الآن. كن أول من ينشر حالة سريعة!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.slice(0, 6).map((note) => (
              <div
                key={note.id}
                className="bg-white p-4 rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col justify-between"
              >
                <div className="text-xs text-neutral-800 font-sans leading-relaxed mb-3 whitespace-pre-wrap">
                  <LinkifiedText text={note.content} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-400">
                  <span className="font-bold text-[#18181b]">{note.authorName}</span>
                  <span className="font-mono text-[10px]">@{note.authorUsername}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Recent Chats & Communities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chats */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#6d5dfc]" />
              <h2 className="text-base font-black text-[#18181b]">آخر المحادثات</h2>
            </div>
            <button
              onClick={() => onTabChange('inbox')}
              className="text-xs font-bold text-[#6d5dfc] hover:underline cursor-pointer"
            >
              عرض الكل ({conversations.length})
            </button>
          </div>

          {conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              لا توجد رسائل سابقة. ابدأ مراسلة أصدقائك الآن.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 4).map((conv) => {
                const otherUid = conv.participants.find((id) => id !== currentUser.uid) || currentUser.uid;
                const other = conv.participantData?.[otherUid] || {
                  displayName: 'مستخدم',
                  username: otherUid.slice(0, 6),
                  letters: 'م',
                  tone: 'bg-[#e9e5ff] text-[#4338ca]',
                };

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation(conv.id);
                      onTabChange('inbox');
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f7f3] transition cursor-pointer border border-neutral-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl ${
                          other.tone || getRandomTone(otherUid)
                        } flex items-center justify-center font-black text-xs shrink-0`}
                      >
                        {other.letters || getInitials(other.displayName)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#18181b] block truncate">
                          {other.displayName}
                        </span>
                        <span className="text-[11px] text-neutral-400 truncate block">
                          {conv.lastMessage || 'محادثة جديدة'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-neutral-400 font-mono shrink-0 mr-2">
                      {conv.lastMessageTime || ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Communities */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#6d5dfc]" />
              <h2 className="text-base font-black text-[#18181b]">المجتمعات النشطة</h2>
            </div>
            <button
              onClick={() => onTabChange('discover')}
              className="text-xs font-bold text-[#6d5dfc] hover:underline cursor-pointer"
            >
              استكشاف ({communities.length})
            </button>
          </div>

          {communities.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              لا توجد مجتمعات منشأة بعد. قم بإنشاء أول مجتمع لك!
            </div>
          ) : (
            <div className="space-y-2">
              {communities.slice(0, 4).map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => {
                    if (onSelectCommunity) {
                      onSelectCommunity(comm.id);
                    } else {
                      onTabChange('discover');
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f7f3] transition cursor-pointer border border-neutral-100 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl ${
                        comm.tone || getRandomTone(comm.id)
                      } flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition`}
                    >
                      {comm.letters || getInitials(comm.title)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#18181b] block truncate group-hover:text-[#6d5dfc] transition">
                        {comm.title}
                      </span>
                      <span className="text-[11px] text-neutral-400 truncate block">
                        {comm.lastMessage ? `💬 ${comm.lastMessage}` : (comm.description || 'مجتمع تواصل مفتوح')}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] bg-[#f8f7f3] text-neutral-600 px-2.5 py-1 rounded-xl font-bold shrink-0 mr-2">
                    {comm.membersCount || 1} عضو
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
