import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  X,
  FileText,
  Download,
  Loader2,
  ExternalLink,
  Users,
  Smile,
  UploadCloud,
  Film,
  Music,
  Copy,
  Check,
  Trash2,
  Info,
  UserPlus,
  LogOut,
  Sparkles,
  Search,
} from 'lucide-react';
import { UserProfile, Community, ChatMessage, MessageAttachment } from '../types';
import {
  sendCommunityMessage,
  deleteCommunityMessage,
  clearCommunityMessages,
  toggleCommunityMembership,
  getInitials,
  getRandomTone,
} from '../lib/firestoreService';
import { uploadToImageKit, UploadResult, formatFileSize } from '../lib/imagekit';
import { LinkifiedText } from './LinkifiedText';
import { downloadRemoteFile } from '../lib/downloader';

interface CommunityChatViewProps {
  community: Community;
  currentUser: UserProfile;
  messages: ChatMessage[];
  onBack: () => void;
  onStartCall: (title: string, callType?: 'video' | 'audio' | 'group') => void;
  showToast: (msg: string) => void;
  onOpenImage: (url: string) => void;
}

export const CommunityChatView: React.FC<CommunityChatViewProps> = ({
  community,
  currentUser,
  messages,
  onBack,
  onStartCall,
  showToast,
  onOpenImage,
}) => {
  const [draft, setDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Community Info Modal state
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Message actions states
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [emojiBarOpen, setEmojiBarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  const isMember = community.members && community.members.includes(currentUser.uid);
  const isCreator = community.createdBy === currentUser.uid;

  // Sorting messages chronologically (oldest at top -> newest at bottom)
  const sortedMessages = useMemo(() => {
    const list = [...messages].sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        (m.senderUsername && m.senderUsername.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  // Scroll to bottom on new messages or attachment change
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sortedMessages, pendingAttachments.length, uploading, searchQuery]);

  // Upload handler via ImageKit
  const processUpload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setUploadProgress(5);
        showToast(`جارٍ رفع ${file.name} عبر ImageKit...`);

        const result = await uploadToImageKit(file, (progress) => {
          setUploadProgress(progress);
        });

        setPendingAttachments((prev) => [...prev, result]);
        showToast('تم الرفع بنجاح! يمكنك كتابة رسالتك والضغط على إرسال.');
      } catch (err: any) {
        console.error('ImageKit upload error:', err);
        showToast(err.message || 'فشل رفع الملف، يرجى المحاولة مرة أخرى.');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [showToast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((f) => processUpload(f));
    }
  };

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((f) => processUpload(f));
    }
  };

  const removePendingAttachment = (indexToRemove: number) => {
    setPendingAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isMember) {
      showToast('يجب الانضمام إلى المجتمع لتتمكن من إرسال الرسائل.');
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    const attachmentsToSend: MessageAttachment[] = pendingAttachments.map((att) => ({
      fileUrl: att.url,
      fileName: att.name,
      fileType: att.fileType,
      fileSize: att.size,
    }));

    setDraft('');
    setPendingAttachments([]);
    setEmojiBarOpen(false);

    try {
      await sendCommunityMessage(community.id, currentUser, trimmed, attachmentsToSend);
    } catch (err) {
      console.error('Failed to send community message:', err);
      showToast('فشل إرسال الرسالة في المجتمع.');
    }
  };

  const handleCopyText = (msg: ChatMessage) => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopiedMessageId(msg.id);
      showToast('تم نسخ نص الرسالة');
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      setDeletingMessageId(msgId);
      await deleteCommunityMessage(community.id, msgId);
      showToast('تم حذف الرسالة بنجاح.');
    } catch (err) {
      console.error('Delete message error:', err);
      showToast('تعذر حذف الرسالة.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleClearChat = async () => {
    try {
      setClearing(true);
      await clearCommunityMessages(community.id);
      setConfirmClearOpen(false);
      showToast('تم مسح محادثات المجتمع بنجاح.');
    } catch (err) {
      console.error('Clear chat error:', err);
      showToast('فشل مسح المحادثات.');
    } finally {
      setClearing(false);
    }
  };

  const handleToggleMembership = async () => {
    try {
      await toggleCommunityMembership(community.id, currentUser.uid, !isMember);
      showToast(isMember ? `غادرت مجتمع ${community.title}` : `انضممت إلى مجتمع ${community.title}!`);
    } catch (err) {
      console.error('Toggle membership error:', err);
      showToast('حدث خطأ أثناء تحديث العضوية.');
    }
  };

  const addEmoji = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  const QUICK_EMOJIS = ['❤️', '👍', '🔥', '✨', '👋', '🎉', '😊', '💡', '👏', '🚀'];

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#f8f7f3] relative select-none"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#111827]/80 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none p-6 text-center animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mb-4 border border-white/20 animate-pulse">
            <UploadCloud className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-lg font-black tracking-tight">أفلت الملف هنا للمشاركة في المجتمع</h3>
          <p className="text-xs text-neutral-300 mt-1">سيتم رفعه عبر ImageKit وإضافته إلى الرسالة</p>
        </div>
      )}

      {/* 1. Header */}
      <div className="h-16 px-4 md:px-6 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition cursor-pointer shrink-0"
            title="العودة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div
            onClick={() => setInfoOpen(true)}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div
              className={`w-10 h-10 rounded-2xl ${
                community.tone || getRandomTone(community.id)
              } flex items-center justify-center font-black text-xs shrink-0 shadow-2xs group-hover:scale-105 transition`}
            >
              {community.letters || getInitials(community.title)}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-black text-[#18181b] truncate group-hover:text-[#6d5dfc] transition">
                {community.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Users className="w-3 h-3" />
                  {community.membersCount || (community.members?.length ?? 1)} عضو
                </span>
                <span>•</span>
                <span className="truncate">بواسطة {community.creatorName || 'عضو'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
              searchOpen ? 'bg-[#6d5dfc] text-white' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
            title="بحث في المحادثة"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Group Video / Audio Meeting Call */}
          <button
            onClick={() => onStartCall(`مجتمع: ${community.title}`, 'group')}
            className="h-9 md:h-10 px-3 md:px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            title="بدء مكالمة جماعية لأعضاء المجتمع"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">مكالمة جماعية</span>
          </button>

          {/* Info Button */}
          <button
            onClick={() => setInfoOpen(true)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-2xl hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition cursor-pointer"
            title="تفاصيل المجتمع"
          >
            <Info className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar (if open) */}
      {searchOpen && (
        <div className="px-4 py-2 bg-white border-b border-neutral-200 flex items-center gap-2 animate-in slide-in-from-top duration-150">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في رسائل هذا المجتمع..."
            className="w-full h-9 bg-neutral-100 rounded-xl px-3 text-xs outline-none text-right"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-2"
            >
              مسح
            </button>
          )}
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Non-member Banner */}
      {!isMember && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">
              أنت تشاهد محادثات المجتمع كزائر. انضم الآن لتتمكن من إرسال الرسائل والمشاركة!
            </span>
          </div>
          <button
            onClick={handleToggleMembership}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>انضمام للمجتمع</span>
          </button>
        </div>
      )}

      {/* 3. Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Welcome Card inside chat */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 max-w-lg mx-auto text-center shadow-xs space-y-2 mb-4">
          <div
            className={`w-14 h-14 rounded-2xl ${
              community.tone || getRandomTone(community.id)
            } flex items-center justify-center font-black text-base mx-auto shadow-xs`}
          >
            {community.letters || getInitials(community.title)}
          </div>
          <h3 className="text-base font-black text-neutral-800">{community.title}</h3>
          <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
            {community.description || 'مرحباً بكم في هذا المجتمع! شاركوا الأفكار والرسائل والملفات بكل سهولة.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
            <span>أنشئ بواسطة {community.creatorName || 'عضو'}</span>
            <span>•</span>
            <span>{community.membersCount || 1} عضو</span>
          </div>
        </div>

        {/* Empty messages note */}
        {sortedMessages.length === 0 && (
          <div className="text-center py-10 text-neutral-400 text-xs">
            {searchQuery ? 'لا توجد نتائج بحث مطابقة.' : 'لا توجد رسائل بعد. كن أول من يرسل رسالة في هذا المجتمع!'}
          </div>
        )}

        {/* Render each message */}
        {sortedMessages.map((msg) => {
          const isMe = msg.senderId === currentUser.uid;
          const canDelete = isMe || isCreator;
          const attachmentsList = msg.attachments && msg.attachments.length > 0
            ? msg.attachments
            : msg.fileUrl
            ? [{
                fileUrl: msg.fileUrl,
                fileName: msg.fileName,
                fileType: msg.fileType,
                fileSize: msg.fileSize,
              }]
            : [];

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 group ${isMe ? 'justify-start' : 'justify-end'}`}
            >
              {/* Avatar for other users on the left in RTL */}
              {!isMe && (
                <div
                  className={`w-8 h-8 rounded-xl ${getRandomTone(
                    msg.senderId
                  )} flex items-center justify-center font-black text-[10px] shrink-0 shadow-2xs`}
                  title={msg.senderName}
                >
                  {getInitials(msg.senderName)}
                </div>
              )}

              {/* Message Bubble Container */}
              <div className="max-w-[85%] md:max-w-[65%] space-y-1">
                {/* Sender Name for group chat */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold text-neutral-500">
                    <span>{msg.senderName}</span>
                    {msg.senderUsername && (
                      <span className="text-neutral-400 font-mono text-[9px]">
                        @{msg.senderUsername}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`relative rounded-2xl p-3 shadow-2xs text-xs leading-relaxed transition ${
                    isMe
                      ? 'bg-[#111827] text-white rounded-br-xs'
                      : 'bg-white text-neutral-800 border border-neutral-200/80 rounded-bl-xs'
                  }`}
                >
                  {/* Attachments rendering */}
                  {attachmentsList.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {attachmentsList.map((att, attIdx) => {
                        if (att.fileType === 'image') {
                          return (
                            <div
                              key={attIdx}
                              onClick={() => onOpenImage(att.fileUrl)}
                              className="rounded-xl overflow-hidden cursor-pointer relative group/img bg-neutral-900/10 max-h-72 flex items-center justify-center border border-black/5"
                            >
                              <img
                                src={att.fileUrl}
                                alt={att.fileName || 'صورة'}
                                referrerPolicy="no-referrer"
                                className="w-full h-auto object-cover rounded-xl group-hover/img:scale-[1.02] transition duration-200"
                              />
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          );
                        }

                        if (att.fileType === 'video') {
                          return (
                            <div key={attIdx} className="rounded-xl overflow-hidden bg-black/10 border border-black/10">
                              <video
                                src={att.fileUrl}
                                controls
                                className="w-full rounded-xl max-h-72 bg-black"
                              />
                            </div>
                          );
                        }

                        if (att.fileType === 'audio') {
                          return (
                            <div
                              key={attIdx}
                              className={`p-2.5 rounded-xl flex items-center gap-3 border ${
                                isMe
                                  ? 'bg-white/10 border-white/10'
                                  : 'bg-[#f8f7f3] border-neutral-200'
                              }`}
                            >
                              <Music className="w-5 h-5 text-emerald-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <audio src={att.fileUrl} controls className="w-full h-8" />
                              </div>
                            </div>
                          );
                        }

                        // Generic Document / File
                        return (
                          <div
                            key={attIdx}
                            className={`p-3 rounded-xl flex items-center justify-between gap-3 border ${
                              isMe
                                ? 'bg-white/10 border-white/10 text-white'
                                : 'bg-[#f8f7f3] border-neutral-200 text-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-5 h-5 text-[#6d5dfc] shrink-0" />
                              <div className="min-w-0 text-right">
                                <p className="font-bold text-xs truncate max-w-[180px] md:max-w-xs">
                                  {att.fileName || 'ملف مرفق'}
                                </p>
                                {att.fileSize && (
                                  <span className="text-[10px] opacity-70">
                                    {formatFileSize(att.fileSize)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => downloadRemoteFile(att.fileUrl, att.fileName || 'file')}
                              className={`p-2 rounded-lg transition cursor-pointer shrink-0 ${
                                isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white hover:bg-neutral-200 text-neutral-700 shadow-2xs'
                              }`}
                              title="تنزيل الملف"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.text && (
                    <div className="whitespace-pre-wrap break-words font-sans text-right">
                      <LinkifiedText text={msg.text} isMyMessage={isMe} />
                    </div>
                  )}

                  {/* Footer Time & Read Status */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                      isMe ? 'text-white/60' : 'text-neutral-400'
                    }`}
                  >
                    <span>{msg.createdAt}</span>
                  </div>
                </div>

                {/* Quick Message Actions (Copy / Delete) */}
                <div
                  className={`opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-neutral-400 text-[10px] ${
                    isMe ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {msg.text && (
                    <button
                      onClick={() => handleCopyText(msg)}
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-500 transition cursor-pointer"
                      title="نسخ النص"
                    >
                      {copiedMessageId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMessageId === msg.id}
                      className="p-1 rounded hover:bg-rose-100 text-rose-500 transition cursor-pointer"
                      title="حذف الرسالة"
                    >
                      {deletingMessageId === msg.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar for me */}
              {isMe && (
                <div
                  className={`w-8 h-8 rounded-xl ${getRandomTone(
                    currentUser.uid
                  )} flex items-center justify-center font-black text-[10px] shrink-0 shadow-2xs`}
                  title={currentUser.displayName}
                >
                  {getInitials(currentUser.displayName)}
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Pending Attachments Preview Strip */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2.5 bg-white border-t border-neutral-200/80 flex items-center gap-3 overflow-x-auto shrink-0 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-500 shrink-0">المرفقات الجاهزة:</span>
          {pendingAttachments.map((att, idx) => (
            <div
              key={idx}
              className="relative rounded-xl bg-neutral-100 border border-neutral-200 p-1.5 flex items-center gap-2 shrink-0 group/att"
            >
              {att.fileType === 'image' ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-10 h-10 object-cover rounded-lg"
                />
              ) : att.fileType === 'video' ? (
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-white">
                  <Film className="w-5 h-5" />
                </div>
              ) : att.fileType === 'audio' ? (
                <div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center text-white">
                  <Music className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white">
                  <FileText className="w-5 h-5" />
                </div>
              )}

              <div className="text-right max-w-[120px]">
                <p className="text-[11px] font-bold text-neutral-800 truncate">{att.name}</p>
                <span className="text-[9px] text-neutral-400">{formatFileSize(att.size)}</span>
              </div>

              <button
                onClick={() => removePendingAttachment(idx)}
                className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center absolute -top-1.5 -right-1.5 shadow-xs hover:bg-rose-600 transition cursor-pointer"
                title="إزالة المرفق"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading Progress Indicator */}
      {uploading && (
        <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center gap-3 text-xs text-emerald-800 shrink-0">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>جارٍ رفع الملف عبر ImageKit ({uploadProgress}%)...</span>
        </div>
      )}

      {/* 5. Quick Emoji Bar */}
      {emojiBarOpen && isMember && (
        <div className="px-4 py-2 bg-white border-t border-neutral-200/80 flex items-center gap-2 overflow-x-auto shrink-0 animate-in slide-in-from-bottom duration-150">
          <span className="text-[11px] text-neutral-400 font-bold shrink-0">رموز سريعة:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-lg hover:scale-125 transition transform cursor-pointer p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 6. Input Form */}
      {isMember ? (
        <div className="p-3 md:p-4 bg-white border-t border-neutral-200/80 shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {/* Hidden inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
              multiple
            />

            {/* Media Attachment Buttons */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="w-10 h-10 rounded-2xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-[#6d5dfc] transition cursor-pointer shrink-0 disabled:opacity-50"
              title="إرفاق صورة أو فيديو عبر ImageKit"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-10 h-10 rounded-2xl hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-[#6d5dfc] transition cursor-pointer shrink-0 disabled:opacity-50"
              title="إرفاق مستند أو ملف"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setEmojiBarOpen(!emojiBarOpen)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 ${
                emojiBarOpen ? 'bg-amber-100 text-amber-800' : 'hover:bg-neutral-100 text-neutral-500'
              }`}
              title="رموز تعبيرية"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="اكتب رسالة في المجتمع..."
                className="w-full h-11 rounded-2xl bg-[#f8f7f3] pr-4 pl-4 text-xs outline-none border border-transparent focus:border-[#6d5dfc]/40 text-right shadow-2xs font-sans"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={uploading || (!draft.trim() && pendingAttachments.length === 0)}
              className="w-11 h-11 rounded-2xl bg-[#111827] hover:bg-[#302c52] text-white flex items-center justify-center transition cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="إرسال الرسالة"
            >
              <Send className="w-4 h-4 text-emerald-400 rotate-180" />
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-white border-t border-neutral-200/80 text-center">
          <button
            onClick={handleToggleMembership}
            className="w-full py-3 rounded-2xl bg-[#111827] hover:bg-[#302c52] text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>انضم إلى مجتمع {community.title} للمشاركة وإرسال الرسائل</span>
          </button>
        </div>
      )}

      {/* 7. Community Details Modal / Drawer */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200/80 text-right space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-black text-neutral-800">تفاصيل المجتمع</h3>
              <button
                onClick={() => setInfoOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl ${
                  community.tone || getRandomTone(community.id)
                } flex items-center justify-center font-black text-base shrink-0 shadow-xs`}
              >
                {community.letters || getInitials(community.title)}
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-black text-[#18181b] truncate">{community.title}</h4>
                <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                  {community.membersCount || 1} عضو
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f8f7f3] border border-neutral-200/60 text-xs text-neutral-700 leading-relaxed">
              <span className="font-bold block text-neutral-900 mb-1">عن المجتمع:</span>
              {community.description || 'مجتمع للمناقشات وتبادل الأفكار.'}
            </div>

            <div className="space-y-1.5 text-xs text-neutral-500">
              <p>
                <span className="font-bold text-neutral-700">أنشئ بواسطة:</span>{' '}
                {community.creatorName || 'عضو'}
              </p>
              <p>
                <span className="font-bold text-neutral-700">تاريخ الإنشاء:</span>{' '}
                {new Date(community.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Actions in info modal */}
            <div className="pt-2 border-t border-neutral-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setInfoOpen(false);
                  onStartCall(`مجتمع: ${community.title}`, 'group');
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
              >
                <Video className="w-4 h-4" />
                <span>بدء مكالمة جماعية للمجتمع</span>
              </button>

              <button
                onClick={() => {
                  handleToggleMembership();
                  setInfoOpen(false);
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                  isMember
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                    : 'bg-[#111827] text-white hover:bg-[#302c52]'
                }`}
              >
                {isMember ? (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>مغادرة هذا المجتمع</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>الانضمام إلى المجتمع</span>
                  </>
                )}
              </button>

              {isCreator && (
                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>مسح جميع رسائل المجتمع</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Clear Chat Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200/80 text-center space-y-3 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-neutral-800">مسح محادثات المجتمع؟</h4>
            <p className="text-xs text-neutral-500">
              سيتم حذف جميع الرسائل داخل هذا المجتمع نهائياً لجميع الأعضاء.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleClearChat}
                disabled={clearing}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {clearing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، مسح الكل</span>
              </button>
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
