import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  Send,
  Paperclip,
  Image as ImageIcon,
  Phone,
  Video,
  X,
  FileText,
  Download,
  Loader2,
  ExternalLink,
  CheckCheck,
  Smile,
  UploadCloud,
  Film,
  Music,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile, Conversation, ChatMessage, MessageAttachment } from '../types';
import { sendMessage, deleteMessage, clearConversationMessages, getInitials, getRandomTone } from '../lib/firestoreService';
import { uploadToImageKit, UploadResult, formatFileSize } from '../lib/imagekit';
import { LinkifiedText } from './LinkifiedText';
import { downloadRemoteFile } from '../lib/downloader';

interface ChatViewProps {
  conversation: Conversation;
  currentUser: UserProfile;
  messages: ChatMessage[];
  onBack: () => void;
  onStartCall: (targetName: string, callType?: 'video' | 'audio') => void;
  showToast: (msg: string) => void;
  onOpenImage: (url: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
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

  // Message Actions States
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  // Identify the other participant
  const otherUid = conversation.participants.find((id) => id !== currentUser.uid) || currentUser.uid;
  const otherData = conversation.participantData?.[otherUid] || {
    displayName: 'مستخدم',
    username: otherUid.slice(0, 8),
    letters: 'م',
    tone: 'bg-[#e9e5ff] text-[#4338ca]',
  };

  // Guarantee strict chronological ascending sorting of messages (Oldest at top -> Newest at bottom)
  // This matches standard WhatsApp logic: all previous messages retain their exact position.
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [messages]);

  // Scroll to bottom on new messages or attachment change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages, pendingAttachments.length, uploading]);

  // Core file upload handler with progress and toast feedback
  const processUpload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setUploadProgress(5);
        showToast(`جارٍ رفع ${file.name} عبر ImageKit...`);

        const result = await uploadToImageKit(file, (progress) => {
          setUploadProgress(progress);
        });

        // Add to pending attachments queue so user can send text + attachments in 1 single message
        setPendingAttachments((prev) => [...prev, result]);
        showToast('تم الرفع بنجاح! يمكنك كتابة رسالتك والضغط على إرسال.');
      } catch (err: any) {
        console.error('ImageKit upload error:', err);
        showToast(err.message || 'فشل رفع الملف إلى ImageKit، يرجى المحاولة مرة أخرى.');
      } finally {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [showToast]
  );

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        processUpload(files[i]);
      }
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
      for (let i = 0; i < files.length; i++) {
        processUpload(files[i]);
      }
    }
  };

  // Clipboard Paste handler (for screenshot paste Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processUpload(file);
          break;
        }
      }
    }
  };

  // Handle Copy Message
  const handleCopyMessage = async (msg: ChatMessage) => {
    const parts: string[] = [];
    if (msg.text) parts.push(msg.text);
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((a) => parts.push(a.fileUrl));
    } else if (msg.fileUrl) {
      parts.push(msg.fileUrl);
    }

    const textToCopy = parts.join('\n');
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      showToast('تم نسخ محتوى الرسالة بنجاح!');
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('تعذر نسخ الرسالة إلى الحافظة.');
    }
  };

  // Handle Delete Single Message
  const handleDeleteSingleMessage = async (messageId: string) => {
    try {
      setDeletingMessageId(messageId);
      await deleteMessage(conversation.id, messageId);
      showToast('تم مسح الرسالة بنجاح.');
    } catch (err) {
      console.error('Delete message error:', err);
      showToast('تعذر مسح الرسالة، يرجى المحاولة لاحقاً.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Handle Clear All Messages in Conversation
  const handleClearConversation = async () => {
    try {
      setClearing(true);
      await clearConversationMessages(conversation.id);
      setConfirmClearOpen(false);
      showToast('تم مسح جميع محتويات ورسائل المحادثة بنجاح!');
    } catch (err) {
      console.error('Clear conversation error:', err);
      showToast('تعذر مسح محتويات المحادثة.');
    } finally {
      setClearing(false);
    }
  };

  // Remove individual pending attachment
  const removePendingAttachment = (indexToRemove: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Handle Send Message (Atomic send of Text + Attachments as 1 Message)
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!draft.trim() && pendingAttachments.length === 0) || uploading) return;

    const textToSend = draft.trim();
    const attachmentsToSend: MessageAttachment[] = pendingAttachments.map((att) => ({
      fileUrl: att.url,
      fileName: att.name,
      fileType: att.fileType,
      fileSize: att.size,
    }));

    setDraft('');
    setPendingAttachments([]);

    try {
      await sendMessage(
        conversation.id,
        currentUser,
        textToSend,
        attachmentsToSend.length > 0 ? attachmentsToSend : undefined
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('تعذر إرسال الرسالة، يرجى التحقق من اتصالك.');
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-[#f8f7f3] relative overflow-hidden select-none"
      id="chat-container"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#111827]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-white border-4 border-dashed border-emerald-400 m-3 rounded-3xl animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 animate-bounce">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black mb-1">أفلت الملف هنا للرفع المباشر</h3>
          <p className="text-xs text-neutral-300">يتم رفع الصور والملفات وتخزينها بأمان عبر ImageKit</p>
        </div>
      )}

      {/* 1. Header (Mobile & Desktop Responsive) */}
      <div className="h-15 sm:h-16 md:h-18 px-2.5 sm:px-3 md:px-5 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 flex items-center justify-between z-20 shrink-0 shadow-xs w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 min-w-0 flex-1 overflow-hidden">
          <button
            onClick={onBack}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#f4f3ef] hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition cursor-pointer shrink-0"
            title="رجوع"
          >
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="relative shrink-0">
            {otherData.photoURL ? (
              <img
                src={otherData.photoURL}
                alt={otherData.displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl object-cover"
              />
            ) : (
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl ${
                  otherData.tone || getRandomTone(otherUid)
                } flex items-center justify-center font-black text-xs md:text-sm shadow-xs`}
              >
                {otherData.letters || getInitials(otherData.displayName)}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="text-xs sm:text-sm md:text-base font-black text-[#18181b] truncate leading-tight">
              {otherData.displayName}
            </h2>
            <div className="flex items-center gap-1 text-[10px] md:text-[11px] text-neutral-400 truncate font-sans">
              <span className="text-[#6d5dfc] font-medium truncate font-mono">@{otherData.username}</span>
              {otherData.phoneNumber && (
                <span className="text-neutral-500 font-mono dir-ltr truncate hidden sm:inline">• {otherData.phoneNumber}</span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 mr-1">
          <button
            onClick={() => onStartCall(otherData.displayName, 'audio')}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#f4f3ef] hover:bg-[#e9e5ff] text-neutral-700 hover:text-[#6d5dfc] flex items-center justify-center transition cursor-pointer shrink-0"
            title="مكالمة صوتية مباشرة داخل التطبيق"
          >
            <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            onClick={() => onStartCall(otherData.displayName, 'video')}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#111827] text-white hover:bg-[#302c52] flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
            title="مكالمة فيديو مباشرة داخل التطبيق"
          >
            <Video className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => setConfirmClearOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-[#f4f3ef] hover:bg-rose-50 text-neutral-600 hover:text-rose-600 flex items-center justify-center transition cursor-pointer shrink-0"
            title="مسح محتويات المحادثة بالكامل"
          >
            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {/* 2. Messages List (Chronological Ascending: Text Top, Attachments Below in Single Unified Bubble) */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 md:p-6 space-y-2.5 sm:space-y-3 md:space-y-4 w-full min-w-0">
        {sortedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-[#6d5dfc] mb-3">
              <Smile className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-800 mb-1">ابدأ المحادثة الآن</h3>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
              أرسل رسالة نصية أو أرفق الصور والمستندات عبر ImageKit بكل سهولة.
            </p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            
            // Build unified attachment list for this message
            const messageAttachments: MessageAttachment[] =
              msg.attachments && msg.attachments.length > 0
                ? msg.attachments
                : msg.fileUrl
                ? [
                    {
                      fileUrl: msg.fileUrl,
                      fileName: msg.fileName,
                      fileType: msg.fileType || 'file',
                      fileSize: msg.fileSize,
                    },
                  ]
                : [];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group w-full`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[80%] md:max-w-[65%] rounded-[18px] sm:rounded-[22px] md:rounded-[26px] p-2.5 sm:p-3.5 md:p-4.5 shadow-xs transition-all relative overflow-hidden ${
                    isMe
                      ? 'bg-[#111827] text-white rounded-br-xs'
                      : 'bg-white text-[#18181b] border border-neutral-200/70 rounded-bl-xs'
                  }`}
                >
                  {/* Sender Name if received */}
                  {!isMe && (
                    <span className="block text-[11px] font-bold text-[#6d5dfc] mb-1.5">
                      {msg.senderName}
                    </span>
                  )}

                  {/* 1. MESSAGE TEXT IS ALWAYS FIRST (Directly above attachments) */}
                  {msg.text && (
                    <p
                      className={`text-[13px] sm:text-[13.5px] md:text-[14.5px] leading-relaxed whitespace-pre-wrap break-words font-sans text-right select-text ${
                        messageAttachments.length > 0 ? 'mb-2.5' : ''
                      }`}
                    >
                      <LinkifiedText text={msg.text} isMe={isMe} />
                    </p>
                  )}

                  {/* 2. ATTACHMENTS ARE DISPLAYED DIRECTLY UNDER THE TEXT IN THE SAME MESSAGE */}
                  {messageAttachments.length > 0 && (
                    <div className="space-y-2 mb-1.5">
                      {messageAttachments.map((att, idx) => {
                        const isImg = att.fileType === 'image' || (!att.fileType && att.fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i));
                        const isVid = att.fileType === 'video';
                        const isAud = att.fileType === 'audio';

                        return (
                          <div key={idx} className="rounded-xl sm:rounded-2xl overflow-hidden bg-black/5 relative group/att">
                            {isImg ? (
                              <div className="relative group/img cursor-pointer" onClick={() => onOpenImage(att.fileUrl)}>
                                <img
                                  src={att.fileUrl}
                                  alt={att.fileName || 'صورة مرفقة'}
                                  referrerPolicy="no-referrer"
                                  className="w-full max-h-72 sm:max-h-80 object-cover rounded-lg sm:rounded-xl hover:opacity-95 transition bg-neutral-100 block"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white gap-2 p-2">
                                  <span className="text-[11px] sm:text-xs font-bold bg-black/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5">
                                    <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>تكبير</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadRemoteFile(att.fileUrl, att.fileName || `image-${Date.now()}.jpg`);
                                      showToast('جاري بدء تحميل الصورة...');
                                    }}
                                    className="text-[11px] sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-md cursor-pointer transition"
                                    title="تحميل الصورة إلى جهازك"
                                  >
                                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>تحميل</span>
                                  </button>
                                </div>
                              </div>
                            ) : isVid ? (
                              <div className="relative space-y-1.5">
                                <video
                                  src={att.fileUrl}
                                  controls
                                  className="w-full max-h-72 rounded-lg sm:rounded-xl bg-black"
                                />
                                <div className="flex items-center justify-between px-2 pb-1.5">
                                  <span className="text-[10px] text-neutral-400 truncate max-w-[200px]">
                                    {att.fileName || 'فيديو مرفق'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      downloadRemoteFile(att.fileUrl, att.fileName || `video-${Date.now()}.mp4`);
                                      showToast('جاري بدء تحميل الفيديو...');
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                      isMe
                                        ? 'bg-white/20 hover:bg-white/30 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>تحميل الفيديو</span>
                                  </button>
                                </div>
                              </div>
                            ) : isAud ? (
                              <div className="p-2 space-y-1.5">
                                <audio src={att.fileUrl} controls className="w-full" />
                                <div className="flex items-center justify-between px-1">
                                  <span className="text-[10px] text-neutral-400 truncate max-w-[180px]">
                                    {att.fileName || 'ملف صوتي'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      downloadRemoteFile(att.fileUrl, att.fileName || `audio-${Date.now()}.mp3`);
                                      showToast('جاري بدء تحميل الملف الصوتي...');
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                      isMe
                                        ? 'bg-white/20 hover:bg-white/30 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>تحميل الصوت</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition ${
                                  isMe
                                    ? 'bg-white/10 text-white'
                                    : 'bg-neutral-100 text-neutral-800'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div className="min-w-0 flex-1 text-right">
                                    <span className="text-xs font-bold block truncate">{att.fileName || 'ملف مرفق'}</span>
                                    <span className="text-[10px] opacity-70 block">
                                      {att.fileSize ? formatFileSize(att.fileSize) : 'مرفق'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    downloadRemoteFile(att.fileUrl, att.fileName || 'document');
                                    showToast('جاري بدء تحميل الملف...');
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs ${
                                    isMe
                                      ? 'bg-white text-neutral-900 hover:bg-white/90'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                  title="تحميل الملف"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>تحميل</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. Action Buttons & Message Meta (Copy, Delete, Timestamp) */}
                  <div
                    className={`flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t ${
                      isMe ? 'border-white/10' : 'border-neutral-100'
                    }`}
                  >
                    {/* Message Actions: Copy & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopyMessage(msg)}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                          isMe
                            ? 'bg-white/10 hover:bg-white/20 text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                        title="نسخ نص أو روابط المرفقات"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">تم</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteSingleMessage(msg.id)}
                        disabled={deletingMessageId === msg.id}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                          isMe
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                        }`}
                        title="مسح هذه الرسالة"
                      >
                        {deletingMessageId === msg.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span>مسح</span>
                      </button>
                    </div>

                    {/* Time & Read Status */}
                    <div
                      className={`flex items-center gap-1 text-[10px] select-none shrink-0 ${
                        isMe ? 'text-white/60' : 'text-neutral-400'
                      }`}
                    >
                      <span>{msg.createdAt}</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-400 inline" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Pending Attachments Strip & Realtime Progress */}
      {(uploading || pendingAttachments.length > 0) && (
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-t border-neutral-200 shadow-md animate-in slide-in-from-bottom-2 duration-150">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Realtime Upload Progress Bar if active */}
            {uploading && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#6d5dfc] animate-spin shrink-0" />
                <span className="text-xs text-neutral-600 font-medium truncate">
                  جارٍ الرفع إلى ImageKit ({uploadProgress}%)...
                </span>
                <div className="flex-1 bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#6d5dfc] h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* List of Pending Attachments (Prepared to be sent with text in 1 Message) */}
            {pendingAttachments.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {pendingAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-1.5 pr-2 pl-1.5 rounded-xl bg-neutral-50 border border-neutral-200 shrink-0"
                  >
                    {att.fileType === 'image' ? (
                      <img
                        src={att.url}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-lg object-cover bg-neutral-200 shrink-0"
                      />
                    ) : att.fileType === 'video' ? (
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Film className="w-4 h-4" />
                      </div>
                    ) : att.fileType === 'audio' ? (
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}

                    <div className="max-w-[120px] sm:max-w-[160px]">
                      <span className="text-[11px] font-bold text-neutral-800 truncate block leading-tight">
                        {att.name}
                      </span>
                      {att.size && (
                        <span className="text-[9px] text-neutral-400 font-mono">
                          {formatFileSize(att.size)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removePendingAttachment(idx)}
                      className="w-5 h-5 rounded-md hover:bg-rose-100 text-neutral-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                      title="إزالة المرفق"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Chat Input Bar (WhatsApp Unified Input Bar) */}
      <div className="p-2 sm:p-2.5 md:p-4 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 z-20 shrink-0 shadow-lg w-full max-w-full">
        <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto w-full">
          {/* Hidden File Input for Documents */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="*/*"
            multiple
          />

          {/* Hidden File Input specifically for Images & Videos */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*"
            multiple
          />

          {/* 1. Photo/Video Picker Button */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#f4f3ef] hover:bg-[#e9e5ff] text-neutral-600 hover:text-[#6d5dfc] flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
            title="إرفاق صورة أو فيديو عبر ImageKit"
          >
            <ImageIcon className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </button>

          {/* 2. All Files / Docs Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#f4f3ef] hover:bg-[#e9e5ff] text-neutral-600 hover:text-[#6d5dfc] flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
            title="إرفاق مستند أو ملف"
          >
            <Paperclip className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </button>

          {/* Message Input (Flexible with min-w-0 to prevent overflowing on mobile) */}
          <div className="flex-1 min-w-0 relative">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={pendingAttachments.length > 0 ? 'أضف نصاً مع المرفقات...' : 'اكتب رسالتك هنا...'}
              className="w-full min-w-0 h-9 sm:h-11 md:h-12 rounded-xl md:rounded-2xl bg-[#f8f7f3] px-3 sm:px-4 text-xs sm:text-[13.5px] md:text-sm text-neutral-800 placeholder-neutral-400 outline-none border border-transparent focus:border-[#6d5dfc]/40 transition text-right font-sans"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!draft.trim() && pendingAttachments.length === 0) || uploading}
            className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#111827] hover:bg-[#302c52] text-white flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-40 shadow-md"
            title="إرسال"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 text-emerald-400" />
          </button>
        </form>
      </div>

      {/* Clear Conversation Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-100 text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-neutral-900 mb-1.5">مسح محتويات المحادثة</h3>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف جميع الرسائل في هذه المحادثة؟ سيتم إفراغ سجل المحادثة ولا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClearConversation}
                disabled={clearing}
                className="flex-1 h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جارٍ المسح...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، مسح الكل</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setConfirmClearOpen(false)}
                disabled={clearing}
                className="flex-1 h-11 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer"
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
