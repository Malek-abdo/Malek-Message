import React, { useState } from 'react';
import { Search, UserPlus, X, MessageSquare, Phone } from 'lucide-react';
import { UserProfile } from '../types';
import { searchUsers, getOrCreateConversation, getInitials, getRandomTone } from '../lib/firestoreService';

interface NewChatModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (convId: string) => void;
  showToast: (msg: string) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSelectConversation,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    const results = await searchUsers(searchTerm, currentUser.uid);
    setSearchResults(results);
    setSearching(false);
  };

  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    try {
      setLoading(true);
      const convId = await getOrCreateConversation(currentUser, targetUser);
      onSelectConversation(convId);
      onClose();
      showToast(`بدأت محادثة مع ${targetUser.displayName}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      showToast('تعذر إنشاء المحادثة، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWithDirectUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = customUsername.trim().replace(/^@/, '').toLowerCase();
    if (!handle) return;

    try {
      setLoading(true);
      // Check if user already exists in Firestore
      const foundUsers = await searchUsers(handle, currentUser.uid);
      const exactUser = foundUsers.find(
        (u) => u.username.toLowerCase() === handle || u.displayName.toLowerCase() === handle
      );

      const targetUser: UserProfile = exactUser || {
        uid: `user_${handle}`,
        displayName: handle,
        username: handle,
        photoURL: '',
        phoneNumber: '',
        countryCode: '+20',
        countryName: '',
        bio: 'مستخدم في Malek Message',
        createdAt: new Date().toISOString(),
      };

      const convId = await getOrCreateConversation(currentUser, targetUser);
      onSelectConversation(convId);
      onClose();
      showToast(`بدأت محادثة مع @${targetUser.username || handle}`);
    } catch (err) {
      console.error('Error starting chat by username:', err);
      showToast('حدث خطأ أثناء بدء المحادثة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-white/80 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#18181b]">محادثة جديدة</h3>
              <p className="text-xs text-neutral-400">ابحث عن أصدقاء حقيقيين بالاسم، المعرف، أو الهاتف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#f8f7f3] flex items-center justify-center text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search registered users */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، @المعرف، أو رقم الهاتف..."
            className="w-full h-12 rounded-2xl bg-[#f8f7f3] pr-11 pl-16 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right"
          />
          <Search className="w-4 h-4 absolute right-4 top-4 text-neutral-400" />
          <button
            type="submit"
            className="absolute left-2 top-2 h-8 px-3 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-[#302c52] transition"
          >
            بحث
          </button>
        </form>

        {/* Search Results */}
        {searching ? (
          <div className="py-6 text-center text-xs text-neutral-400">جارٍ البحث في قاعدة بيانات Firebase...</div>
        ) : searchResults.length > 0 ? (
          <div className="max-h-52 overflow-y-auto space-y-2 mb-4">
            {searchResults.map((u) => (
              <div
                key={u.uid}
                onClick={() => handleStartChatWithUser(u)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#f0efff] cursor-pointer transition border border-neutral-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[14px] ${getRandomTone(u.uid)} flex items-center justify-center font-black text-xs`}>
                    {getInitials(u.displayName)}
                  </div>
                  <div>
                    <strong className="text-sm block text-[#18181b]">{u.displayName}</strong>
                    <div className="flex items-center gap-2 text-[11px] text-[#6d5dfc]">
                      <span>@{u.username}</span>
                      {u.phoneNumber && (
                        <span className="text-neutral-400 font-mono flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {u.countryCode} {u.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="text-xs bg-[#111827] text-white px-3 py-1.5 rounded-xl font-bold">
                  محادثة
                </button>
              </div>
            ))}
          </div>
        ) : searchTerm.trim() ? (
          <p className="text-xs text-neutral-400 text-center py-2 mb-3">لم يتم العثور على مستخدمين مسجلين بهذا البحث.</p>
        ) : null}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 text-xs text-neutral-300">
          <span className="h-px bg-neutral-200 flex-1" />
          <span>أو مراسلة فورية بمعرف الحساب</span>
          <span className="h-px bg-neutral-200 flex-1" />
        </div>

        {/* Direct handle input */}
        <form onSubmit={handleStartWithDirectUsername} className="space-y-4">
          <div className="relative">
            <span className="absolute right-4 top-3.5 text-neutral-400 text-sm font-bold">@</span>
            <input
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="اكتب اسم المستخدم (مثال: ahmed_dev)"
              className="w-full h-12 rounded-2xl bg-[#f8f7f3] pr-9 pl-4 outline-none text-sm border border-transparent focus:border-[#6d5dfc]/30 text-right font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!customUsername.trim() || loading}
            className="w-full h-12 rounded-2xl bg-[#111827] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#302c52] transition disabled:opacity-50 cursor-pointer shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? 'جارٍ البدء...' : 'بدء المحادثة الآن'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
