import React, { useState } from 'react';
import { Search, Plus, MessageSquare, Phone } from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';

interface InboxListProps {
  conversations: Conversation[];
  selectedConvId: string | null;
  currentUser: UserProfile;
  onSelectConversation: (convId: string) => void;
  onOpenNewChat: () => void;
}

export const InboxList: React.FC<InboxListProps> = ({
  conversations,
  selectedConvId,
  currentUser,
  onSelectConversation,
  onOpenNewChat,
}) => {
  const [search, setSearch] = useState('');

  const filtered = conversations.filter((c) => {
    const otherUid = c.participants.find((id) => id !== currentUser.uid) || '';
    const other = c.participantData?.[otherUid];
    if (!other) return true;
    const s = search.toLowerCase();
    return (
      other.displayName.toLowerCase().includes(s) ||
      other.username.toLowerCase().includes(s) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(s))
    );
  });

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200/80">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-[#18181b]">المحادثات</h2>
          <p className="text-xs text-neutral-400">جميع رسائلك المباشرة في Firebase</p>
        </div>
        <button
          onClick={onOpenNewChat}
          className="w-10 h-10 rounded-2xl bg-[#111827] text-white hover:bg-[#302c52] flex items-center justify-center transition cursor-pointer shadow-md"
          title="محادثة جديدة"
        >
          <Plus className="w-5 h-5 text-emerald-400" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث في الرسائل..."
            className="w-full h-11 rounded-2xl bg-[#f8f7f3] pr-10 pl-4 text-xs outline-none border border-transparent focus:border-[#6d5dfc]/30 text-right"
          />
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-neutral-400" />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f8f7f3] text-neutral-400 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-700 mb-1">لا توجد محادثات حتى الآن</h3>
            <p className="text-xs text-neutral-400 mb-4">
              ابحث عن أصدقائك بالاسم أو المعرف لبدء أول محادثة!
            </p>
            <button
              onClick={onOpenNewChat}
              className="px-4 py-2.5 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#302c52] transition cursor-pointer"
            >
              بدء محادثة الآن
            </button>
          </div>
        ) : (
          filtered.map((conv) => {
            const otherUid = conv.participants.find((id) => id !== currentUser.uid) || currentUser.uid;
            const other = conv.participantData?.[otherUid] || {
              displayName: 'مستخدم',
              username: otherUid.slice(0, 6),
              letters: 'م',
              tone: 'bg-[#e9e5ff] text-[#4338ca]',
            };
            const isSelected = selectedConvId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#111827] text-white shadow-md'
                    : 'hover:bg-[#f8f7f3] text-[#18181b]'
                }`}
              >
                <div className="relative shrink-0">
                  {other.photoURL ? (
                    <img
                      src={other.photoURL}
                      alt={other.displayName}
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-2xl ${
                        other.tone || getRandomTone(otherUid)
                      } flex items-center justify-center font-black text-sm shadow-xs`}
                    >
                      {other.letters || getInitials(other.displayName)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-sm font-black truncate ${
                        isSelected ? 'text-white' : 'text-[#18181b]'
                      }`}
                    >
                      {other.displayName}
                    </span>
                    <span
                      className={`text-[10px] font-mono shrink-0 mr-1 ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-400'
                      }`}
                    >
                      {conv.lastMessageTime || ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate font-sans ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-500'
                      }`}
                    >
                      {conv.lastMessage || 'محادثة جديدة'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
