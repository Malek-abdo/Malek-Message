import React, { useEffect } from 'react';
import { MessageSquare, X, ArrowLeft, Volume2 } from 'lucide-react';
import { Conversation, UserProfile } from '../types';
import { getInitials, getRandomTone } from '../lib/firestoreService';

export interface IncomingMessageNotification {
  conversationId: string;
  senderName: string;
  senderUsername?: string;
  senderPhoto?: string;
  senderUid: string;
  messageText: string;
  timeStr: string;
  hasAttachment?: boolean;
}

interface MessageNotificationToastProps {
  notification: IncomingMessageNotification | null;
  onOpenConversation: (conversationId: string) => void;
  onDismiss: () => void;
}

export const MessageNotificationToast: React.FC<MessageNotificationToastProps> = ({
  notification,
  onOpenConversation,
  onDismiss,
}) => {
  useEffect(() => {
    if (!notification) return;

    // Auto dismiss after 6 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top-4 fade-in duration-250 cursor-pointer"
      onClick={() => {
        onOpenConversation(notification.conversationId);
        onDismiss();
      }}
      dir="rtl"
    >
      <div className="bg-[#111827] text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border border-neutral-700/80 flex items-start gap-3 hover:bg-[#1f2937] transition-all group">
        {/* Sender Avatar */}
        <div className="relative shrink-0">
          {notification.senderPhoto ? (
            <img
              src={notification.senderPhoto}
              alt={notification.senderName}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-2xl object-cover border border-white/10"
            />
          ) : (
            <div
              className={`w-11 h-11 rounded-2xl ${getRandomTone(
                notification.senderUid
              )} flex items-center justify-center font-bold text-sm shadow-xs`}
            >
              {getInitials(notification.senderName)}
            </div>
          )}
          <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#111827] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </div>
        </div>

        {/* Message Content Preview */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {notification.senderName}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono shrink-0">
              {notification.timeStr || 'الآن'}
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-neutral-300 truncate leading-relaxed">
            {notification.messageText || (notification.hasAttachment ? '📎 أرسل مرفقاً جديداً' : 'رسالة جديدة')}
          </p>

          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-emerald-400 group-hover:text-emerald-300">
            <span>انقر لفتح المحادثة والرد</span>
            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {/* Dismiss Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white flex items-center justify-center transition shrink-0 cursor-pointer -mt-1 -mr-1"
          title="إغلاق الإشعار"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
